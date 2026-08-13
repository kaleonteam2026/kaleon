import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowRight,
  BookCheck,
  BookOpenCheck,
  CalendarRange,
  Plus,
} from "lucide-react";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { computeGpaSummary, type StoredCourse } from "@/lib/course-progress";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCoursesForProfile, getProfileForUser, insertCourses } from "@/lib/supabase-profiles";
import { getSelectedPathway, type Pathway } from "@/lib/supabase-pathways";
import { isAuthBypass } from "@/lib/dev-profile";
import type { StudentProfile } from "@/types/profile";

type RequirementState = "completed" | "in_progress" | "planned" | "missing";

type PlanSuggestion = {
  key: string;
  code?: string;
  name: string;
  term: string;
  reason: string;
  requirement: string;
  kind: "required" | "review";
};

type SemesterBucket = {
  id: string;
  label: string;
  state: "completed" | "in_progress" | "planned" | "suggested";
  courses: StoredCourse[];
  suggestions: PlanSuggestion[];
};

function termSortValue(term?: string): number {
  if (!term) return Number.MAX_SAFE_INTEGER;
  const match = term.match(/(Spring|Summer|Fall|Winter)\s+(\d{4})/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const seasonOrder: Record<string, number> = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 };
  return Number(match[2]) * 10 + (seasonOrder[match[1]] ?? 9);
}

function formatUnits(units: number): string {
  return `${units} unit${units === 1 ? "" : "s"}`;
}

function courseCodeKey(value?: string): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

function courseLabel(course: StoredCourse): string {
  return course.courseCode ? `${course.courseCode} · ${course.courseName}` : course.courseName;
}

function extractCourseCode(text: string): string | undefined {
  const match = text.match(/\b([A-Z]{2,6})\s*(\d{1,3}[A-Z]{0,2})\b/i);
  if (!match) return undefined;
  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
}

function extractCourseName(text: string, code?: string): string {
  if (!code) return text.trim();
  const stripped = text
    .replace(code, "")
    .replace(/^[\s:;,-]+/, "")
    .replace(/^[\s:;,-]+/, "")
    .trim();
  return stripped || code;
}

function remainingCourseGaps(gaps: string[], knownCodes: Set<string>): string[] {
  return gaps.filter((gap) => {
    const normalizedGap = courseCodeKey(gap);
    return ![...knownCodes].some((code) => normalizedGap.includes(code) || code.includes(normalizedGap));
  });
}

function upcomingTerms(count: number): string[] {
  const seasons = ["Spring", "Summer", "Fall"] as const;
  const now = new Date();
  const month = now.getMonth();
  let seasonIndex = month >= 7 ? 2 : month >= 4 ? 1 : 0;
  let year = now.getFullYear();
  const terms: string[] = [];

  while (terms.length < count) {
    terms.push(`${seasons[seasonIndex]} ${year}`);
    seasonIndex += 1;
    if (seasonIndex >= seasons.length) {
      seasonIndex = 0;
      year += 1;
    }
  }

  return terms;
}

function stateForRequirement(
  text: string,
  completedCodes: Set<string>,
  inProgressCodes: Set<string>,
  plannedCodes: Set<string>,
): RequirementState {
  const code = extractCourseCode(text);
  const normalized = courseCodeKey(code ?? text);
  if ([...completedCodes].some((value) => normalized.includes(value) || value.includes(normalized))) {
    return "completed";
  }
  if ([...inProgressCodes].some((value) => normalized.includes(value) || value.includes(normalized))) {
    return "in_progress";
  }
  if ([...plannedCodes].some((value) => normalized.includes(value) || value.includes(normalized))) {
    return "planned";
  }
  return "missing";
}

function requirementTone(state: RequirementState): string {
  if (state === "completed") return "bg-[rgba(111,209,158,0.15)] text-[var(--student-success)]";
  if (state === "in_progress") return "bg-[rgba(118,183,240,0.14)] text-[var(--student-info)]";
  if (state === "planned") return "bg-[rgba(148,163,184,0.18)] text-[var(--student-text-secondary)]";
  return "bg-[rgba(240,179,79,0.16)] text-[var(--student-warning)]";
}

export default function Plan() {
  const params = useParams<{ profileId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const parsedProfileId = params.profileId ? Number(params.profileId) : NaN;
  const profileId = Number.isFinite(parsedProfileId) ? parsedProfileId : undefined;
  const useSupabaseData = isSupabaseConfigured && !isAuthBypass();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [courses, setCourses] = useState<StoredCourse[]>([]);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const addToPlanLocksRef = useRef(new Set<string>());

  useEffect(() => {
    if (typeof profileId !== "number") return;

    let cancelled = false;

    async function load() {
      try {
        const [selectedPathway, profileCourses, savedProfile, gpaSummary] = useSupabaseData
          ? await Promise.all([
              getSelectedPathway(profileId),
              getCoursesForProfile(profileId),
              user?.id && user.id !== "dev" ? getProfileForUser(user.id) : Promise.resolve(null),
              Promise.resolve<{ estimatedGpa?: number } | null>(null),
            ])
          : await Promise.all([
              fetch(`/api/profiles/${profileId}/pathways`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : []))
                .then((rows: Pathway[]) => rows.find((row) => row.isSelected === "true") ?? rows[0] ?? null)
                .catch(() => null),
              fetch(`/api/profiles/${profileId}/courses`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : []))
                .catch(() => []),
              fetch(`/api/profiles/${profileId}`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
              fetch(`/api/profiles/${profileId}/gpa-summary`, { credentials: "include" })
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
            ]);

        if (cancelled) return;

        setPathway(selectedPathway);
        setCourses(profileCourses);
        setProfile(
          savedProfile ?? (gpaSummary?.estimatedGpa
            ? ({ currentGpa: gpaSummary.estimatedGpa } as StudentProfile)
            : null),
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
  }, [profileId, user?.id]);

  const summary = useMemo(
    () => computeGpaSummary(courses, profile?.currentGpa ?? null),
    [courses, profile?.currentGpa],
  );

  const completedCourses = useMemo(
    () => courses.filter((course) => course.status === "completed"),
    [courses],
  );
  const inProgressCourses = useMemo(
    () => courses.filter((course) => course.status === "in_progress"),
    [courses],
  );
  const plannedCourses = useMemo(
    () => courses.filter((course) => course.status === "planned"),
    [courses],
  );

  const completedCodes = useMemo(
    () => new Set(completedCourses.map((course) => courseCodeKey(course.courseCode ?? course.courseName)).filter(Boolean)),
    [completedCourses],
  );
  const inProgressCodes = useMemo(
    () => new Set(inProgressCourses.map((course) => courseCodeKey(course.courseCode ?? course.courseName)).filter(Boolean)),
    [inProgressCourses],
  );
  const plannedCodes = useMemo(
    () => new Set(plannedCourses.map((course) => courseCodeKey(course.courseCode ?? course.courseName)).filter(Boolean)),
    [plannedCourses],
  );
  const knownCodes = useMemo(
    () => new Set([...completedCodes, ...inProgressCodes, ...plannedCodes]),
    [completedCodes, inProgressCodes, plannedCodes],
  );

  const openGaps = useMemo(
    () => remainingCourseGaps(pathway?.reportJson?.courseGaps ?? [], knownCodes),
    [knownCodes, pathway?.reportJson?.courseGaps],
  );

  const planningTerms = useMemo(() => {
    const existingTerms = courses
      .map((course) => course.term)
      .filter((term): term is string => Boolean(term && term.trim().length > 0))
      .sort((a, b) => termSortValue(a) - termSortValue(b));
    const merged = [...existingTerms, ...upcomingTerms(4)];
    return [...new Set(merged)].slice(0, 6);
  }, [courses]);

  const suggestions = useMemo<PlanSuggestion[]>(() => {
    const termList = planningTerms.length > 0 ? planningTerms : upcomingTerms(4);
    const gapSuggestions = openGaps.map((gap, index) => {
      const code = extractCourseCode(gap);
      const name = extractCourseName(gap, code);
      const term = termList[Math.min(termList.length - 1, Math.floor(index / 2))];
      return {
        key: `gap-${gap}-${term}`,
        code,
        name,
        term,
        reason: "Still marked as missing in your saved pathway report.",
        requirement: "Pathway gap",
        kind: "required" as const,
      };
    });

    const reviewSuggestions = (pathway?.reportJson?.nextSteps ?? []).slice(0, 4).map((step, index) => ({
      key: `step-${index}-${step}`,
      code: undefined,
      name: step,
      term: termList[Math.min(termList.length - 1, Math.floor(index / 2))],
      reason: "Saved as a next step in your selected pathway.",
      requirement: "Counselor or planning review",
      kind: "review" as const,
    }));

    return [...gapSuggestions, ...reviewSuggestions];
  }, [openGaps, pathway?.reportJson?.nextSteps, planningTerms]);

  const semesters = useMemo<SemesterBucket[]>(() => {
    const grouped = new Map<string, SemesterBucket>();
    const ensureBucket = (label: string, state: SemesterBucket["state"]) => {
      const existing = grouped.get(label);
      if (existing) return existing;
      const bucket: SemesterBucket = {
        id: label.toLowerCase().replace(/\s+/g, "-"),
        label,
        state,
        courses: [],
        suggestions: [],
      };
      grouped.set(label, bucket);
      return bucket;
    };

    completedCourses.forEach((course) => {
      ensureBucket(course.term ?? "Completed coursework", "completed").courses.push(course);
    });
    inProgressCourses.forEach((course) => {
      ensureBucket(course.term ?? "Current coursework", "in_progress").courses.push(course);
    });
    plannedCourses.forEach((course) => {
      ensureBucket(course.term ?? planningTerms[0] ?? "Planned coursework", "planned").courses.push(course);
    });
    suggestions.forEach((suggestion) => {
      ensureBucket(suggestion.term, grouped.has(suggestion.term) ? grouped.get(suggestion.term)!.state : "suggested").suggestions.push(suggestion);
    });

    return [...grouped.values()].sort((a, b) => termSortValue(a.label) - termSortValue(b.label));
  }, [completedCourses, inProgressCourses, plannedCourses, planningTerms, suggestions]);

  const headlineSuggestion = suggestions.find((item) => item.kind === "required") ?? suggestions[0] ?? null;
  const missingRequirements = pathway?.reportJson?.courseGaps ?? [];
  const pathwayRisks = pathway?.reportJson?.risks ?? [];
  const canAddToPlan = Boolean(Number.isFinite(profileId) && (useSupabaseData ? user?.id && user.id !== "dev" : true));

  async function handleAddToPlan(suggestion: PlanSuggestion) {
    if (typeof profileId !== "number") {
      toast({ title: "This plan is missing a valid profile.", variant: "destructive" });
      return;
    }

    if (addToPlanLocksRef.current.has(suggestion.key)) {
      return;
    }

    if (suggestion.code && knownCodes.has(courseCodeKey(suggestion.code))) {
      return;
    }

    addToPlanLocksRef.current.add(suggestion.key);
    setAddingKey(suggestion.key);
    try {
      let created: StoredCourse[] = [];

      if (useSupabaseData) {
        if (!user?.id || user.id === "dev") {
          toast({ title: "Sign in with a saved account to add planned courses.", variant: "destructive" });
          return;
        }

        created = await insertCourses(profileId, user.id, [{
          courseCode: suggestion.code,
          courseName: suggestion.name,
          units: undefined,
          status: "planned",
          term: suggestion.term,
        }]);
      } else {
        const response = await fetch(`/api/profiles/${profileId}/courses`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseCode: suggestion.code,
            courseName: suggestion.name,
            units: undefined,
            status: "planned",
            term: suggestion.term,
          }),
        });

        if (response.status === 409) {
          created = [];
        } else if (!response.ok) {
          throw new Error("Failed to save planned course");
        } else {
          const row = await response.json() as StoredCourse;
          created = [row];
        }
      }

      if (created.length === 0) {
        toast({ title: suggestion.code ? `${suggestion.code} is already on this profile.` : "That course is already on this profile." });
        return;
      }

      setCourses((prev) => [...prev, created[0]]);
      toast({
        title: suggestion.code ? `${suggestion.code} added to ${suggestion.term}` : `Added to ${suggestion.term}`,
      });
    } catch {
      toast({ title: "Could not add that course to the plan.", variant: "destructive" });
    } finally {
      addToPlanLocksRef.current.delete(suggestion.key);
      setAddingKey(null);
    }
  }

    if (typeof profileId !== "number") {
    return (
      <AppPageLayout variant="dark" title="Plan">
        <div className="student-panel p-6 text-sm text-[var(--student-text-secondary)]">
          This plan view could not find a valid profile.
        </div>
      </AppPageLayout>
    );
  }

  if (loading) {
    return <PageLoadingState variant="dark" message="Loading plan…" />;
  }

  return (
    <AppPageLayout
      variant="dark"
      maxWidth="wide"
      profileId={profileId}
      title="Plan"
      subtitle="Place real courses by semester, track what is already planned, and close the remaining pathway gaps."
      action={
        <Link href={`/progress/${profileId}`} className="student-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium">
          Back to progress
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <div className="space-y-6 pb-8 text-[var(--student-text-primary)]">
        <section className="student-panel overflow-hidden">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div>
              <p className="student-section-kicker">Real transfer plan</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--student-text-primary)]">
                {profile?.intendedMajor ?? "Transfer pathway"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--student-text-secondary)]">
                {profile?.communityCollege ?? "Community college not saved"} to {pathway?.reportJson?.university ?? "selected destination not saved"}.
                {" "}
                Target timeline: {pathway?.reportJson?.transferTimeline ?? profile?.transferTimeline ?? "not saved yet"}.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <MiniStat icon={BookCheck} label="Completed" value={formatUnits(summary.completedUnits)} />
                <MiniStat icon={BookOpenCheck} label="In progress" value={formatUnits(summary.inProgressUnits)} />
                <MiniStat icon={CalendarRange} label="Planned" value={`${plannedCourses.length} course${plannedCourses.length === 1 ? "" : "s"}`} />
              </div>
            </div>

            <div className="student-panel-muted p-5 md:p-6">
              <p className="student-section-kicker">Suggested next move</p>

              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
                {headlineSuggestion
                  ? headlineSuggestion.code
                    ? `Add ${headlineSuggestion.code} to ${headlineSuggestion.term}.`
                    : headlineSuggestion.name
                  : "Your saved plan is caught up right now."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--student-text-secondary)]">
                {headlineSuggestion
                  ? headlineSuggestion.reason
                  : "There are no open pathway course gaps beyond the work you have already completed, started, or planned."}
              </p>

              <div className="mt-5 space-y-3 text-sm">
                <PlanFact label="Current GPA" value={profile?.currentGpa != null ? profile.currentGpa.toFixed(2) : "Not saved yet"} />
                <PlanFact label="Open course gaps" value={`${openGaps.length}`} />
                <PlanFact label="Flagged risks" value={`${pathwayRisks.length}`} />
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {semesters.length === 0 ? (
              <section className="student-panel p-6 text-sm leading-6 text-[var(--student-text-secondary)]">
                Semester suggestions will appear here once you have courses or a selected pathway.
              </section>
            ) : (
              semesters.map((semester) => (
                <article key={semester.id} className="student-panel overflow-hidden">
                  <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-start md:justify-between md:px-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">{semester.label}</h3>
                        <SemesterStateChip state={semester.state} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--student-text-secondary)]">
                        {semester.courses.length} saved course{semester.courses.length === 1 ? "" : "s"} and {semester.suggestions.length} suggestion{semester.suggestions.length === 1 ? "" : "s"} in this term.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <HeaderStat label="Courses" value={`${semester.courses.length}`} />
                      <HeaderStat label="Suggestions" value={`${semester.suggestions.length}`} />
                      <HeaderStat label="Units" value={`${semester.courses.reduce((sum, course) => sum + (course.units ?? 0), 0) || "—"}`} />
                    </div>
                  </div>

                  <div className="grid gap-5 border-t px-5 py-5 md:px-6 xl:grid-cols-[1fr_0.95fr]" style={{ borderTopColor: "var(--student-border)" }}>
                    <section className="student-panel-muted p-5">
                      <p className="student-section-kicker">Saved courses</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--student-text-primary)]">Recorded coursework</p>
                      <p className="mt-1 text-sm text-[var(--student-text-secondary)]">
                        Courses already saved to this profile for this term.
                      </p>

                      {semester.courses.length === 0 ? (
                        <p className="mt-4 text-sm leading-6 text-[var(--student-text-secondary)]">No courses are saved in this term yet.</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {semester.courses.map((course, index) => (
                            <div key={`${course.courseCode ?? course.courseName}-${index}`} className="rounded-2xl border border-[var(--student-border)] bg-black/10 px-4 py-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-[var(--student-text-primary)]">{courseLabel(course)}</p>
                                  <p className="mt-1 text-sm text-[var(--student-text-secondary)]">{course.grade ?? stateLabel(course.status)}</p>
                                </div>
                                <span className="text-sm text-[var(--student-text-secondary)]">
                                  {course.units ? formatUnits(course.units) : "Units not saved"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="student-panel-muted p-5">
                      <p className="student-section-kicker">Open gaps</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--student-text-primary)]">Semester suggestions</p>
                      <p className="mt-1 text-sm text-[var(--student-text-secondary)]">
                        Open pathway gaps and next steps assigned into actual upcoming terms.
                      </p>

                      {semester.suggestions.length === 0 ? (
                        <p className="mt-4 text-sm leading-6 text-[var(--student-text-secondary)]">No additional suggestions are waiting in this term.</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {semester.suggestions.map((suggestion) => {
                            const alreadyTracked = suggestion.code ? knownCodes.has(courseCodeKey(suggestion.code)) : false;
                            return (
                              <div key={suggestion.key} className="rounded-2xl border border-[var(--student-border)] bg-black/10 px-4 py-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-[var(--student-text-primary)]">
                                      {suggestion.code ? `${suggestion.code} · ${suggestion.name}` : suggestion.name}
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--student-text-secondary)]">
                                      {suggestion.requirement}
                                    </p>
                                  </div>
                                  <span className={`student-status-chip ${
                                    suggestion.kind === "review"
                                      ? "bg-[rgba(240,179,79,0.16)] text-[var(--student-warning)]"
                                      : "bg-[rgba(106,209,180,0.14)] text-[var(--student-primary)]"
                                  }`}>
                                    {suggestion.kind === "review" ? "Review" : "Suggested"}
                                  </span>
                                </div>

                                <p className="mt-3 text-sm leading-6 text-[var(--student-text-secondary)]">
                                  {suggestion.reason}
                                </p>

                                {suggestion.kind === "required" ? (
                                  <div className="mt-4">
                                    <button
                                      type="button"
                                      onClick={() => handleAddToPlan(suggestion)}
                                      disabled={!canAddToPlan || alreadyTracked || addingKey === suggestion.key}
                                      className="student-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <Plus className="h-4 w-4" />
                                      {alreadyTracked ? "Already added" : addingKey === suggestion.key ? "Adding…" : "Add to plan"}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="space-y-6">
            <section className="student-panel p-6">
              <p className="student-section-kicker">Requirement view</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
                Requirement status
              </h3>

              {missingRequirements.length === 0 ? (
                <div className="mt-5 student-panel-muted px-4 py-4 text-sm leading-6 text-[var(--student-text-secondary)]">
                  Choose a pathway to see remaining transfer-specific coursework here.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {missingRequirements.map((item) => {
                    const state = stateForRequirement(item, completedCodes, inProgressCodes, plannedCodes);
                    return (
                      <div key={item} className="student-panel-muted px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-medium text-[var(--student-text-primary)]">{item}</p>
                          <span className={`student-status-chip ${requirementTone(state)}`}>
                            {state === "completed"
                              ? "Completed"
                              : state === "in_progress"
                                ? "In progress"
                                : state === "planned"
                                  ? "Planned"
                                  : "Still needed"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="student-panel p-6">
              <p className="student-section-kicker">Watchouts</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
                Warnings and blockers
              </h3>

              {pathwayRisks.length === 0 ? (
                <div className="mt-5 student-panel-muted px-4 py-4 text-sm leading-6 text-[var(--student-text-secondary)]">
                  No pathway-specific blockers are saved right now.
                </div>
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
              <p className="student-section-kicker">Plan sources</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">
                How this plan stays current
              </h3>
              <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--student-text-secondary)]">
                <p>This page follows the real courses saved to your profile alongside the pathway you selected.</p>
                <p>When you add a suggested course here, it becomes part of the same student record shown in Progress.</p>
                <Link href={`/pathways/${profileId}`} className="student-button-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                  Review pathway details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="student-panel-muted p-4">
      <Icon className="h-5 w-5 text-[var(--student-primary)]" />
      <p className="mt-3 text-sm font-medium text-[var(--student-text-secondary)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--student-text-primary)]">{value}</p>
    </div>
  );
}

function PlanFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[var(--student-text-secondary)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--student-text-primary)]">{value}</dd>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="student-panel-muted min-w-[84px] p-3 text-right">
      <div className="text-xs font-medium tracking-wide text-[var(--student-text-secondary)]">{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight text-[var(--student-text-primary)]">{value}</div>
    </div>
  );
}

function SemesterStateChip({ state }: { state: SemesterBucket["state"] }) {
  const label =
    state === "completed"
      ? "Completed"
      : state === "in_progress"
        ? "In progress"
        : state === "planned"
          ? "Planned"
          : "Suggested";
  const tone =
    state === "completed"
      ? "bg-[rgba(111,209,158,0.15)] text-[var(--student-success)]"
      : state === "in_progress"
        ? "bg-[rgba(118,183,240,0.14)] text-[var(--student-info)]"
        : state === "planned"
          ? "bg-[rgba(148,163,184,0.18)] text-[var(--student-text-secondary)]"
          : "bg-[rgba(106,209,180,0.14)] text-[var(--student-primary)]";

  return <span className={`student-status-chip ${tone}`}>{label}</span>;
}

function stateLabel(status?: string): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  if (status === "planned") return "Planned";
  return "Saved";
}
