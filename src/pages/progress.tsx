import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  BookCheck,
  BookOpenCheck,
  CalendarRange,
  CircleAlert,
  Target,
} from "lucide-react";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { useAuth } from "@/contexts/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  computeGpaSummary,
  transferProgressPercent,
  transferUnitsRemaining,
  type StoredCourse,
} from "@/lib/course-progress";
import {
  deriveCalgetcAreaStates,
  deriveIgetcAreaStates,
} from "@/lib/ge-requirements";
import { getCoursesForProfile, getProfileForUser } from "@/lib/supabase-profiles";
import {
  getSelectedPathway,
  type Pathway,
} from "@/lib/supabase-pathways";
import { getSemesterSnapshots } from "@/lib/supabase-semesters";
import { isAuthBypass } from "@/lib/dev-profile";
import type { SemesterSnapshot } from "@/types/semester";

type GePattern = "igetc" | "calgetc";
type RequirementStatus = { label: string; done: boolean };

const IGETC_LABELS: Array<{ key: string; label: string }> = [
  { key: "area1AEnglish", label: "English composition" },
  { key: "area1BCriticalThinking", label: "Critical thinking" },
  { key: "area2Math", label: "Mathematical concepts" },
  { key: "area3Arts", label: "Arts and humanities" },
  { key: "area4Social", label: "Social and behavioral sciences" },
  { key: "area5Science", label: "Physical and biological sciences" },
  { key: "area6Language", label: "Language other than English" },
];

const CALGETC_LABELS: Array<{ key: string; label: string }> = [
  { key: "areaA1Oral", label: "Oral communication" },
  { key: "areaA2Written", label: "Written communication" },
  { key: "areaA3Critical", label: "Critical thinking" },
  { key: "areaB1Physical", label: "Physical science" },
  { key: "areaB2Life", label: "Life science" },
  { key: "areaB3Lab", label: "Science lab" },
  { key: "areaB4Math", label: "Mathematics" },
  { key: "areaC1Arts", label: "Arts" },
  { key: "areaC2Humanities", label: "Humanities" },
  { key: "areaDSocial", label: "Social sciences" },
  { key: "areaELifelong", label: "Lifelong learning" },
  { key: "areaFEthnic", label: "Ethnic studies" },
];

function toRequirementStatus(
  labels: Array<{ key: string; label: string }>,
  rawAreas: Record<string, boolean> | null,
): RequirementStatus[] {
  return labels.map((item) => ({
    label: item.label,
    done: Boolean(rawAreas?.[item.key]),
  }));
}

function hasTrackedAreas(rawAreas: Record<string, boolean> | null | undefined): rawAreas is Record<string, boolean> {
  return Boolean(rawAreas) && Object.values(rawAreas as Record<string, boolean>).some((value) => value === true);
}

function formatUnits(units: number): string {
  return `${units} unit${units === 1 ? "" : "s"}`;
}

function trackStatus(pathway: Pathway | null, remainingUnits: number, openGapCount: number) {
  if (!pathway) {
    return {
      label: "Pathway needed",
      tone: "info" as const,
      summary: "Choose a pathway to see transfer-specific requirement gaps and next steps.",
    };
  }

  const riskCount = pathway.reportJson?.risks?.length ?? 0;
  if (riskCount > 0) {
    return {
      label: "Needs attention",
      tone: "warning" as const,
      summary: "Your saved pathway still has blockers or counselor-review items to resolve.",
    };
  }

  if (openGapCount > 0) {
    return {
      label: "Making progress",
      tone: "info" as const,
      summary: `You still have ${openGapCount} pathway item${openGapCount === 1 ? "" : "s"} to plan for before transfer.`,
    };
  }

  return {
    label: "On track",
    tone: "success" as const,
    summary: remainingUnits > 0
      ? `You still need ${formatUnits(remainingUnits)}, but your saved pathway is not showing open course gaps right now.`
      : "Your current courses and saved pathway do not show any open transfer gaps right now.",
  };
}

function termSortValue(term?: string): number {
  if (!term) return Number.MAX_SAFE_INTEGER;
  const match = term.match(/(Spring|Summer|Fall|Winter)\s+(\d{4})/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const seasonOrder: Record<string, number> = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 };
  return Number(match[2]) * 10 + (seasonOrder[match[1]] ?? 9);
}

function courseCodeKey(value?: string): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

function remainingCourseGaps(gaps: string[], knownCodes: Set<string>): string[] {
  return gaps.filter((gap) => {
    const normalizedGap = courseCodeKey(gap);
    return ![...knownCodes].some((code) => normalizedGap.includes(code) || code.includes(normalizedGap));
  });
}

function courseLabel(course: StoredCourse): string {
  return course.courseCode ? `${course.courseCode} · ${course.courseName}` : course.courseName;
}

export default function ProgressPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { user } = useAuth();
  const pid = Number(profileId);
  const useSupabaseData = isSupabaseConfigured && !isAuthBypass();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<StoredCourse[]>([]);
  const [profileGpa, setProfileGpa] = useState<number | null>(null);
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [snapshots, setSnapshots] = useState<SemesterSnapshot[]>([]);
  const [igetcAreas, setIgetcAreas] = useState<RequirementStatus[]>([]);
  const [calgetcAreas, setCalgetcAreas] = useState<RequirementStatus[]>([]);

  useEffect(() => {
    if (!Number.isFinite(pid)) return;

    let cancelled = false;

    async function load() {
      try {
        const [selectedPathway, profileCourses, semesterSnapshots, gpaSummary] = useSupabaseData
          ? await Promise.all([
              getSelectedPathway(pid),
              getCoursesForProfile(pid),
              getSemesterSnapshots(pid),
              Promise.resolve<{ estimatedGpa?: number; totalUnits?: number } | null>(null),
            ])
          : await Promise.all([
              fetch(`/api/profiles/${pid}/pathways`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : []))
                .then((rows: Pathway[]) => rows.find((row) => row.isSelected === "true") ?? rows[0] ?? null)
                .catch(() => null),
              fetch(`/api/profiles/${pid}/courses`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : []))
                .catch(() => []),
              Promise.resolve([] as SemesterSnapshot[]),
              fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
            ]);

        const fallbackIgetcAreas = deriveIgetcAreaStates(profileCourses);
        const fallbackCalgetcAreas = deriveCalgetcAreaStates(profileCourses);

        if (cancelled) return;

        setPathway(selectedPathway);
        setCourses(profileCourses);
        setSnapshots(semesterSnapshots);

        if (useSupabaseData && user?.id && user.id !== "dev") {
          const profile = await getProfileForUser(user.id);
          if (!cancelled) {
            setProfileGpa(profile?.currentGpa ?? null);
          }
        } else {
          if (!cancelled) {
            setProfileGpa(gpaSummary?.estimatedGpa && gpaSummary.estimatedGpa > 0 ? gpaSummary.estimatedGpa : null);
          }
        }

        const [igetcResponse, calgetcResponse] = await Promise.all([
          fetch(`/api/profiles/${pid}/igetc`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`/api/profiles/${pid}/calgetc`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (cancelled) return;

        setIgetcAreas(
          toRequirementStatus(
            IGETC_LABELS,
            hasTrackedAreas(igetcResponse?.areas) ? igetcResponse.areas : fallbackIgetcAreas,
          ),
        );
        setCalgetcAreas(
          toRequirementStatus(
            CALGETC_LABELS,
            hasTrackedAreas(calgetcResponse?.areas) ? calgetcResponse.areas : fallbackCalgetcAreas,
          ),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [pid, user?.id]);

  const summary = useMemo(
    () => computeGpaSummary(courses, profileGpa),
    [courses, profileGpa],
  );
  const completedCourses = useMemo(
    () =>
      courses
        .filter((course) => course.status === "completed")
        .sort((a, b) => termSortValue(a.term) - termSortValue(b.term)),
    [courses],
  );
  const inProgressCourses = useMemo(
    () =>
      courses
        .filter((course) => course.status === "in_progress")
        .sort((a, b) => termSortValue(a.term) - termSortValue(b.term)),
    [courses],
  );
  const plannedCourses = useMemo(
    () =>
      courses
        .filter((course) => course.status === "planned")
        .sort((a, b) => termSortValue(a.term) - termSortValue(b.term)),
    [courses],
  );
  const plannedUnits = useMemo(
    () => plannedCourses.reduce((sum, course) => sum + (course.units ?? 0), 0),
    [plannedCourses],
  );

  const recommendedPattern: GePattern = useMemo(() => {
    const university = pathway?.reportJson?.university?.toLowerCase() ?? "";
    return university.includes("state") || university.includes("csu") ? "calgetc" : "igetc";
  }, [pathway?.reportJson?.university]);

  const requiredUnits = pathway?.reportJson?.requiredUnits ?? 60;
  const progressPercent = Math.round(transferProgressPercent(summary.totalUnits, requiredUnits));
  const remainingUnits = transferUnitsRemaining(summary.totalUnits, requiredUnits);
  const geAreas = recommendedPattern === "calgetc" ? calgetcAreas : igetcAreas;
  const completedAreas = geAreas.filter((item) => item.done);
  const remainingAreas = geAreas.filter((item) => !item.done);
  const pathwayGaps = pathway?.reportJson?.courseGaps ?? [];
  const pathwayRisks = pathway?.reportJson?.risks ?? [];
  const pathwaySteps = pathway?.reportJson?.nextSteps ?? [];
  const accountedCourseCodes = useMemo(
    () =>
      new Set(
        courses
          .map((course) => courseCodeKey(course.courseCode ?? course.courseName))
          .filter(Boolean),
      ),
    [courses],
  );
  const openPathwayGaps = useMemo(
    () => remainingCourseGaps(pathwayGaps, accountedCourseCodes),
    [accountedCourseCodes, pathwayGaps],
  );
  const status = trackStatus(pathway, remainingUnits, openPathwayGaps.length);
  const transcriptHealthMessage = useMemo(() => {
    if (profileGpa == null) return null;
    if (courses.length === 0) {
      return "Your profile has a GPA saved but no transcript courses yet. Re-upload the transcript or add courses so Kaleon can map real requirements.";
    }
    if (summary.totalUnits === 0 && completedCourses.length > 0) {
      return "Your transcript courses were saved, but earned units are still missing. Progress and Plan will use the real course list, while unit totals stay at 0 until those courses are reviewed.";
    }
    return null;
  }, [completedCourses.length, courses.length, profileGpa, summary.totalUnits]);

  const nextMoves = useMemo(() => {
    const items: Array<{ title: string; detail: string }> = [];

    openPathwayGaps.slice(0, 3).forEach((gap) => {
      items.push({
        title: gap,
        detail: "Flagged as still missing in your selected pathway.",
      });
    });

    pathwaySteps.slice(0, 3).forEach((step) => {
      items.push({
        title: step,
        detail: "Saved as a next step in your pathway report.",
      });
    });

    return items.slice(0, 4);
  }, [openPathwayGaps, pathwaySteps]);

  if (!Number.isFinite(pid)) {
    return (
      <AppPageLayout variant="dark" title="Progress">
        <div className="student-panel p-6 text-sm text-[var(--student-text-secondary)]">
          This progress view could not find a valid profile.
        </div>
      </AppPageLayout>
    );
  }

  if (loading) {
    return <PageLoadingState variant="dark" message="Loading progress…" />;
  }

  return (
    <AppPageLayout
      variant="dark"
      profileId={pid}
      maxWidth="wide"
      title="Progress"
      subtitle="See what you've finished, what is still left, and what to focus on next."
      action={
        <Link href={`/plan/${pid}`} className="student-button-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
          Open plan
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <div className="space-y-6">
        <section className="student-panel overflow-hidden">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div>
              <p className="student-section-kicker">Where you are now</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--student-text-primary)]">
                {progressPercent}% of your transfer unit target is already accounted for.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--student-text-secondary)]">
                This includes completed courses, classes in progress, and any pathway information Kaleon can safely match to your current record.
              </p>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full bg-[var(--student-primary)] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={BookCheck}
                  label="Completed"
                  value={formatUnits(summary.completedUnits)}
                  detail={`${completedCourses.length} completed course${completedCourses.length === 1 ? "" : "s"}`}
                />
                <MetricCard
                  icon={BookOpenCheck}
                  label="In progress"
                  value={formatUnits(summary.inProgressUnits)}
                  detail={`${inProgressCourses.length} current course${inProgressCourses.length === 1 ? "" : "s"}`}
                />
                <MetricCard
                  icon={CalendarRange}
                  label="Planned"
                  value={plannedUnits > 0 ? formatUnits(plannedUnits) : `${plannedCourses.length} course${plannedCourses.length === 1 ? "" : "s"}`}
                  detail={plannedCourses.length > 0 ? "Already placed into upcoming terms" : "Nothing is planned yet"}
                />
                <MetricCard
                  icon={Target}
                  label="Still left"
                  value={formatUnits(remainingUnits)}
                  detail={`Toward a ${requiredUnits}-unit transfer target`}
                />
              </div>
            </div>

            <div className="student-panel-muted p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="student-section-kicker">Am I still on track?</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
                    {status.label}
                  </h3>
                </div>
                <StatusBadge tone={status.tone} />
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--student-text-secondary)]">
                {status.summary}
              </p>

              <dl className="mt-6 space-y-3 text-sm">
                <StatusRow
                  label="Current GPA"
                  value={profileGpa != null ? profileGpa.toFixed(2) : "Not saved yet"}
                />
                <StatusRow
                  label="Selected pathway"
                  value={pathway?.reportJson?.university ?? "Choose a pathway"}
                />
                <StatusRow
                  label="General education"
                  value={
                    geAreas.length > 0
                      ? `${completedAreas.length} of ${geAreas.length} ${recommendedPattern.toUpperCase()} areas marked complete`
                      : "Not available for this profile yet"
                  }
                />
              </dl>
            </div>
          </div>

          {transcriptHealthMessage ? (
            <div className="border-t px-6 py-4 lg:px-8" style={{ borderTopColor: "var(--student-border)" }}>
              <div className="student-panel-muted flex items-start gap-3 px-4 py-4 text-sm leading-6 text-[var(--student-text-secondary)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--student-warning)]" />
                <span>{transcriptHealthMessage}</span>
              </div>
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="student-panel p-6">
            <p className="student-section-kicker">Completed work</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
              What you've finished
            </h3>
            {completedCourses.length === 0 ? (
              <EmptyPanel message="Completed coursework will appear here after courses are added to your profile." />
            ) : (
              <ul className="mt-5 space-y-3">
                {completedCourses.map((course) => (
                  <li key={`${course.courseCode ?? course.courseName}-${course.term ?? "completed"}`} className="student-panel-muted px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--student-text-primary)]">{courseLabel(course)}</p>
                        <p className="mt-1 text-sm text-[var(--student-text-secondary)]">
                          {course.term ?? "Completed term not saved"}
                        </p>
                      </div>
                      <div className="text-right text-sm text-[var(--student-text-secondary)]">
                        <div>{course.grade ?? "Completed"}</div>
                        <div>{course.units ? formatUnits(course.units) : "Units not saved"}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="student-panel p-6">
            <p className="student-section-kicker">Current term</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
              What's in progress
            </h3>
            {inProgressCourses.length === 0 ? (
              <EmptyPanel message="Current courses will show here once they are marked in progress." />
            ) : (
              <ul className="mt-5 space-y-3">
                {inProgressCourses.map((course) => (
                  <li key={`${course.courseCode ?? course.courseName}-${course.term ?? "current"}`} className="student-panel-muted px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--student-text-primary)]">{courseLabel(course)}</p>
                        <p className="mt-1 text-sm text-[var(--student-text-secondary)]">
                          {course.term ?? "Current term not saved"}
                        </p>
                      </div>
                      <div className="text-right text-sm text-[var(--student-text-secondary)]">
                        <div>In progress</div>
                        <div>{course.units ? formatUnits(course.units) : "Units not saved"}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="student-panel p-6">
          <p className="student-section-kicker">Upcoming semesters</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
            What is already planned
          </h3>
          {plannedCourses.length === 0 ? (
            <EmptyPanel message="Planned courses will appear here after you add suggestions to a semester in the Plan view." />
          ) : (
            <ul className="mt-5 space-y-3">
              {plannedCourses.map((course) => (
                <li key={`${course.courseCode ?? course.courseName}-${course.term ?? "planned"}`} className="student-panel-muted px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-[var(--student-text-primary)]">{courseLabel(course)}</p>
                      <p className="mt-1 text-sm text-[var(--student-text-secondary)]">
                        {course.term ?? "Upcoming term not saved"}
                      </p>
                    </div>
                    <div className="text-right text-sm text-[var(--student-text-secondary)]">
                      <div>Planned</div>
                      <div>{course.units ? formatUnits(course.units) : "Units not saved"}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="student-panel p-6">
            <p className="student-section-kicker">Remaining requirements</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
              What is still left
            </h3>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-semibold text-[var(--student-text-primary)]">Pathway requirements</p>
                {openPathwayGaps.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-[var(--student-text-secondary)]">
                    {openPathwayGaps.map((gap) => (
                      <li key={gap} className="student-panel-muted flex items-start gap-3 px-4 py-3">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--student-warning)]" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-[var(--student-text-secondary)]">
                    {pathway ? "No open pathway gaps are listed beyond the courses you have already completed, started, or planned." : "Choose a pathway to see remaining transfer-specific coursework."}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--student-text-primary)]">
                  {recommendedPattern === "calgetc" ? "Cal-GETC progress" : "IGETC progress"}
                </p>
                {geAreas.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {remainingAreas.length > 0 ? (
                      remainingAreas.map((item) => (
                        <div key={item.label} className="student-panel-muted flex items-center justify-between px-4 py-3 text-sm">
                          <span className="text-[var(--student-text-primary)]">{item.label}</span>
                          <span className="student-status-chip bg-[rgba(240,179,79,0.14)] text-[var(--student-warning)]">
                            Remaining
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="student-panel-muted px-4 py-3 text-sm text-[var(--student-text-secondary)]">
                        All tracked GE areas in this pattern are marked complete.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-[var(--student-text-secondary)]">
                    GE area tracking is not available for this profile yet.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="student-panel p-6">
            <p className="student-section-kicker">Next steps</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
              What you should do next
            </h3>

            {nextMoves.length === 0 ? (
              <EmptyPanel message="Choose a pathway or save next steps there to turn this into a more useful action list." />
            ) : (
              <div className="mt-5 space-y-3">
                {nextMoves.map((item) => (
                  <div key={`${item.title}-${item.detail}`} className="student-panel-muted px-4 py-4">
                    <p className="font-medium text-[var(--student-text-primary)]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--student-text-secondary)]">{item.detail}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/plan/${pid}`} className="student-button-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                See semester suggestions
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={`/pathways/${pid}`} className="student-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium">
                Review pathways
              </Link>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="student-panel p-6">
            <p className="student-section-kicker">Watchouts</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
              Warnings and blockers
            </h3>
            {pathwayRisks.length === 0 ? (
              <EmptyPanel message="No pathway-specific warnings are saved right now." />
            ) : (
              <div className="mt-5 space-y-3">
                {pathwayRisks.map((risk) => (
                  <div key={risk} className="student-panel-muted px-4 py-4">
                    <p className="text-sm leading-6 text-[var(--student-text-primary)]">{risk}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="student-panel p-6">
            <p className="student-section-kicker">Past terms</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
              Semester history
            </h3>
            {snapshots.length === 0 ? (
              <EmptyPanel message="Semester snapshots have not been saved for this profile yet." />
            ) : (
              <div className="mt-5 space-y-3">
                {snapshots.map((snapshot) => (
                  <div key={snapshot.id} className="student-panel-muted flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                    <div>
                      <p className="font-medium text-[var(--student-text-primary)]">{snapshot.term_label}</p>
                      <p className="mt-1 text-sm text-[var(--student-text-secondary)]">{snapshot.college}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-[var(--student-text-secondary)]">
                      <span>{snapshot.term_units != null ? formatUnits(snapshot.term_units) : "Units not saved"}</span>
                      <span>{snapshot.term_gpa != null ? `Term GPA ${snapshot.term_gpa.toFixed(2)}` : "GPA not saved"}</span>
                      <span>{snapshot.course_count} course{snapshot.course_count === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppPageLayout>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof BookCheck;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="student-panel-muted p-4">
      <Icon className="h-5 w-5 text-[var(--student-primary)]" />
      <p className="mt-3 text-sm font-medium text-[var(--student-text-secondary)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--student-text-secondary)]">{detail}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[var(--student-text-secondary)]">{label}</dt>
      <dd className="max-w-[14rem] text-right font-medium text-[var(--student-text-primary)]">{value}</dd>
    </div>
  );
}

function StatusBadge({ tone }: { tone: "success" | "warning" | "info" }) {
  const styles =
    tone === "success"
      ? "bg-[rgba(111,209,158,0.15)] text-[var(--student-success)]"
      : tone === "warning"
        ? "bg-[rgba(240,179,79,0.16)] text-[var(--student-warning)]"
        : "bg-[rgba(118,183,240,0.14)] text-[var(--student-info)]";

  return <span className={`student-status-chip ${styles}`}>{tone}</span>;
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="mt-5 student-panel-muted px-4 py-4 text-sm leading-6 text-[var(--student-text-secondary)]">
      {message}
    </div>
  );
}
