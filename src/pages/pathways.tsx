import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchWithTimeout, TimeoutError } from "@/lib/api/client";
import { useRequestCleanup } from "@/hooks/use-request-cleanup";
import {
  Target, AlertTriangle, CheckCircle, ArrowRight,
  ChevronDown, ChevronUp, Sparkles, BookOpen, Award, Users, Briefcase,
  Star, GraduationCap, Building2
} from "lucide-react";
import { KaleonLoader } from "@/components/ui/kaleon-loader";
import { cn } from "@/lib/utils";
import { PageMotion } from "@/components/page-motion";
import { motion } from "framer-motion";
import { fadeUp, useBrutalistMotion, DUR } from "@/lib/motion";
import { KALEON_LOGO_SRC } from "@/lib/brand";
import { CopyTrans } from "@/components/copy-trans";
import { t } from "@/lib/copy";
import { useAuth } from "@/contexts/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getProfileForUser,
  getCoursesForProfile,
} from "@/lib/supabase-profiles";
import { GRADUATION_UNITS, graduationProgressPercent, computeGpaSummary } from "@/lib/course-progress";
import type { StoredCourse } from "@/lib/course-progress";
import { isAuthBypass } from "@/lib/dev-profile";
import {
  savePathways,
  loadPathwaysFromDb,
  selectPathwayInDb,
  savePathwaySnapshot,
} from "@/lib/supabase-pathways";
import { saveRoadmap } from "@/lib/supabase-documents";

interface ProfileCourse {
  id: number;
  courseCode?: string;
  courseName: string;
  units?: number;
  term?: string;
  status?: string;
}

function courseCodeKey(code?: string): string {
  return (code ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

function remainingCourseGaps(gaps: string[] | undefined, completedCodes: Set<string>): string[] {
  if (!gaps) return [];
  return gaps.filter((gap) => {
    const normalizedGap = courseCodeKey(gap);
    return ![...completedCodes].some((code) => normalizedGap.includes(code) || code.includes(normalizedGap));
  });
}

interface CampusOpportunityItem {
  name: string;
  type: string;
  description: string;
  admitProfileNote: string;
}

interface PathwayReport {
  type?: string;
  university: string;
  compatibilityScore: number;
  whyItFits: string;
  concerns: string;
  riskAnalysis?: string;
  gpaTarget: number;
  requiredUnits?: number;
  courseGaps: string[];
  coursesAnalyzed?: string[];
  transferTimeline: string;
  scholarshipOptions: string[];
  internshipRecommendations: string[];
  extracurricularRecommendations: string[];
  campusOpportunities: CampusOpportunityItem[];
  risks: string[];
  nextSteps: string[];
}

interface PathwayGenerationResponse {
  pathways?: Pathway[];
  progressSummary?: {
    completedUnits?: number;
    courseAnalysis?: string;
  };
}

interface Pathway {
  id: number;
  profileId: number;
  universityId?: string;
  compatibilityScore?: number;
  pathwayType?: string;
  reportJson?: PathwayReport;
  isSelected?: string;
  generationLabel?: string;
}

const TYPE_LABELS: Record<string, { labelKey: string; color: string; bg: string }> = {
  least_compatible:      { labelKey: "pages.pathways.type_stretch", color: "text-slate-700", bg: "bg-slate-100 border-slate-200" },
  moderately_compatible: { labelKey: "pages.pathways.type_match",   color: "text-slate-700", bg: "bg-slate-100 border-slate-200" },
  most_compatible:       { labelKey: "pages.pathways.type_safety",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
};

const OPP_ICONS: Record<string, React.ElementType> = {
  club: GraduationCap,
  research: BookOpen,
  internship: Briefcase,
  honor_society: Award,
  program: Star,
  leadership: Star,
  community: Users,
  honors_program: Award,
  career_prep: Briefcase,
};

const OPP_COLORS: Record<string, string> = {
  club: "bg-slate-100 text-slate-700",
  research: "bg-slate-100 text-slate-700",
  internship: "bg-slate-100 text-slate-700",
  honor_society: "bg-slate-100 text-slate-700",
  program: "bg-slate-100 text-slate-700",
  leadership: "bg-slate-100 text-slate-700",
  community: "bg-slate-100 text-slate-700",
  honors_program: "bg-slate-100 text-slate-700",
  career_prep: "bg-slate-100 text-slate-700",
};

// ─── Collapsible section accordion ────────────────────────────────

function CollapsibleSection({
  label,
  icon,
  pathwayId,
  sectionKey,
  openSections,
  onToggle,
  children,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  pathwayId: number;
  sectionKey: string;
  openSections: Set<string>;
  onToggle: (key: string) => void;
  children: React.ReactNode;
  color?: string;
}) {
  const key = `${pathwayId}:${sectionKey}`;
  const isOpen = openSections.has(key);
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(key)}
        className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-slate-50"
        style={{ color: color ?? "#475569" }}
      >
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Pathways() {
  const { profileId } = useParams<{ profileId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [profileCourses, setProfileCourses] = useState<ProfileCourse[]>([]);
  const [profileGpa, setProfileGpa] = useState<number | null>(null);
  const [totalUnits, setTotalUnits] = useState(0);
  const [courseAnalysis, setCourseAnalysis] = useState<string | null>(null);
  const [activeGeneration, setActiveGeneration] = useState<string | null>(null);
  const [generations, setGenerations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const [selecting, setSelecting] = useState<number | null>(null);
  const [generatingRoadmap, setGeneratingRoadmap] = useState<number | null>(null);
  const generateLockRef = useRef(false);
  const pid = parseInt(profileId);
  const getSignal = useRequestCleanup();
  const { enabled: pwMotionOn, lift: pwLift, itemVariants, containerVariants } = useBrutalistMotion();
  const useSupabaseData = isSupabaseConfigured && !isAuthBypass();

  const loadPathways = () => {
    if (useSupabaseData && user?.id) {
      Promise.all([
        getProfileForUser(user.id),
        getCoursesForProfile(pid),
        loadPathwaysFromDb(pid),
      ]).then(([profile, storedCourses, savedPathways]) => {
        const gpaSummary = computeGpaSummary(
          storedCourses,
          profile?.currentGpa ?? undefined,
        );
        setProfileCourses(storedCourses as ProfileCourse[]);
        setProfileGpa(gpaSummary.estimatedGpa > 0 ? gpaSummary.estimatedGpa : null);
        setTotalUnits(gpaSummary.totalUnits ?? 0);
        setPathways(savedPathways as Pathway[]);
      }).catch(() => {
        setPathways([]);
        setProfileCourses([]);
        setProfileGpa(null);
        setTotalUnits(0);
      }).finally(() => setLoading(false));
      return;
    }

    Promise.all([
      fetch(`/api/profiles/${pid}/pathways`, { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : []) as Promise<Pathway[]>,
      ).catch(() => [] as Pathway[]),
      fetch(`/api/profiles/${pid}/courses`, { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : []) as Promise<ProfileCourse[]>,
      ).catch(() => [] as ProfileCourse[]),
      fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : {}) as Promise<{ estimatedGpa?: number; totalUnits?: number }>,
      ).catch(() => ({}) as { estimatedGpa?: number; totalUnits?: number }),
    ]).then(([pathwayData, courseData, gpaData]) => {
      setPathways(pathwayData);
      setProfileCourses(courseData);
      setProfileGpa(gpaData.estimatedGpa && gpaData.estimatedGpa > 0 ? gpaData.estimatedGpa : null);
      setTotalUnits(gpaData.totalUnits ?? 0);
    }).catch(() => {
      setPathways([]);
      setProfileCourses([]);
      setProfileGpa(null);
      setTotalUnits(0);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadPathways(); }, [pid, user?.id]);

  // Derive generations list from loaded pathways
  useEffect(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const p of pathways) {
      const lbl = p.generationLabel;
      if (lbl && !seen.has(lbl)) {
        seen.add(lbl);
        labels.push(lbl);
      }
    }
    // Sort oldest-first so tabs read "Pathway 1, Pathway 2, Pathway 3"
    labels.sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
      const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
      return na - nb;
    });
    setGenerations(labels);
    if (labels.length > 0 && (!activeGeneration || !labels.includes(activeGeneration))) {
      setActiveGeneration(labels[labels.length - 1]); // newest (last) by default
    }
  }, [pathways]);

  const visiblePathways = activeGeneration
    ? pathways.filter((p) => p.generationLabel === activeGeneration)
    : pathways;

  const completedCourseCodes = new Set(
    profileCourses
      .filter(c => c.status === "completed")
      .map(c => courseCodeKey(c.courseCode ?? c.courseName)),
  );

  const generatePathways = async () => {
    if (generateLockRef.current) {
      return;
    }
    generateLockRef.current = true;
    setGenerating(true);
    try {
      let profile: Record<string, unknown> = {};
      let courses: ProfileCourse[] = [];
      let totalUnits = 0;
      let requestGpa: number | undefined;
      if (useSupabaseData && user?.id) {
        const sp = user.id !== "dev" ? await getProfileForUser(user.id) : null;
        if (sp) {
          profile = {
            fullName: sp.fullName,
            communityCollege: sp.communityCollege,
            intendedMajor: sp.intendedMajor,
            careerGoal: sp.careerGoal,
            currentGpa: sp.currentGpa,
            transferTimeline: sp.transferTimeline,
            financialSituation: sp.financialSituation,
            isFirstGen: sp.isFirstGen,
          };
        }
        const storedCourses = await getCoursesForProfile(pid);
        if (storedCourses.length > 0) {
          courses = storedCourses as ProfileCourse[];
          const gpaSummary = computeGpaSummary(
            storedCourses,
            profile.currentGpa as number | undefined,
          );
          totalUnits = gpaSummary.totalUnits ?? 0;
          requestGpa = gpaSummary.estimatedGpa > 0
            ? gpaSummary.estimatedGpa
            : (profile.currentGpa as number | undefined);
          setProfileCourses(courses);
          setProfileGpa(gpaSummary.estimatedGpa > 0 ? gpaSummary.estimatedGpa : null);
          setTotalUnits(totalUnits);
        }
      } else {
        const [profileResponse, courseResponse, gpaResponse] = await Promise.all([
          fetch(`/api/profiles/${pid}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : {})),
          fetch(`/api/profiles/${pid}/courses`, { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
          fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" }).then((r) => (r.ok ? r.json() : {})),
        ]);
        profile = (profileResponse as Record<string, unknown>) ?? {};
        courses = (courseResponse as ProfileCourse[]) ?? [];
        totalUnits = Number((gpaResponse as { totalUnits?: number }).totalUnits ?? 0);
        const estimatedGpa = Number((gpaResponse as { estimatedGpa?: number }).estimatedGpa ?? 0);
        requestGpa = estimatedGpa > 0
          ? estimatedGpa
          : (typeof profile.currentGpa === "number" ? profile.currentGpa : undefined);
        setProfileCourses(courses);
        setProfileGpa(estimatedGpa > 0 ? estimatedGpa : null);
        setTotalUnits(totalUnits);
      }

      // Auto-retry once on network / timeout errors
      const attemptFetch = async (retries = 1): Promise<Response> => {
        for (let i = 0; i <= retries; i++) {
          try {
            return await fetchWithTimeout(`/api/profiles/${pid}/generate-pathways`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                profileId: pid,
                fullName: profile.fullName,
                communityCollege: profile.communityCollege,
                intendedMajor: profile.intendedMajor,
                careerGoal: profile.careerGoal,
                currentGpa: requestGpa,
                transferTimeline: profile.transferTimeline,
                financialSituation: profile.financialSituation,
                isFirstGen: profile.isFirstGen,
                courses,
                totalUnits,
              }),
              timeout: 180_000,
            }, getSignal());
          } catch (err) {
            if (i < retries && (err instanceof TypeError || err instanceof TimeoutError)) {
              // Network blip or timeout — try once more
              continue;
            }
            throw err;
          }
        }
        throw new Error("Fetch failed after retries");
      };

      const r = await attemptFetch();
      if (r.status === 429) {
        toast({ title: t("pages.pathways.toast_rateLimit"), description: t("pages.pathways.toast_rateLimitDesc"), variant: "destructive" });
        return;
      }
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Generation failed");
      }

      // Server may return either:
      //   a) 202 { jobId } — async job/polling pattern (Express production)
      //   b) 200 { pathways, progressSummary } — direct result (Vite dev plugin)
      const body = await r.json() as Record<string, unknown>;
      let data: Pathway[] | PathwayGenerationResponse;

      if ("jobId" in body && typeof body.jobId === "number") {
        // Async pattern — poll until complete
        const jobId = body.jobId as number;
        let result: unknown = null;
        for (let attempt = 0; attempt < 120; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const pollR = await fetchWithTimeout(`/api/pathways/jobs/${jobId}`, {
            credentials: "include",
            timeout: 10_000,
          }, getSignal());
          if (!pollR.ok) {
            const status = pollR.status;
            const errBody = await pollR.text().catch(() => "").then(t => { try { return JSON.parse(t) as { error?: string }; } catch { return null; } });
            if (status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
            if (status >= 500) throw new Error("Pathway generation encountered a server error. We're looking into it — please try again.");
            if (status === 404) throw new Error("Generation job not found. It may have expired. Please generate again.");
            throw new Error(errBody?.error ?? `Generation failed (${status}). Please try again.`);
          }
          const job = await pollR.json() as { status: string; result?: unknown; error?: string };
          if (job.status === "completed") { result = job.result; break; }
          if (job.status === "failed") throw new Error(job.error ?? "Generation failed");
          // else "pending" — keep polling
        }
        if (!result) throw new Error("Generation timed out after 6 minutes");
        data = result as Pathway[] | PathwayGenerationResponse;
      } else {
        // Direct response pattern (Vite dev plugin) — already complete
        data = body as unknown as PathwayGenerationResponse;
      }
      const p = Array.isArray(data) ? data : (data.pathways ?? []);
      if (!Array.isArray(data) && data.progressSummary?.completedUnits != null) {
        setTotalUnits(data.progressSummary.completedUnits);
      }
      if (!Array.isArray(data) && data.progressSummary?.courseAnalysis) {
        setCourseAnalysis(data.progressSummary.courseAnalysis);
      }
      // Persist to Supabase so pathways survive page reload
      if (useSupabaseData && user?.id) {
        try {
          await savePathways(pid, user.id, p);
          // Reload from DB to replace Date.now() IDs with real SERIAL IDs
          const reloaded = await loadPathwaysFromDb(pid);
          if (reloaded.length > 0) {
            setPathways(reloaded as Pathway[]);
            // Save a snapshot of current course state for this generation
            const genLabel = reloaded[0].generationLabel;
            if (genLabel && courses.length > 0) {
              await savePathwaySnapshot(pid, genLabel, courses as StoredCourse[]);
            }
          }
          toast({ title: t("pages.pathways.toast_generated"), description: t("pages.pathways.toast_generatedDesc") });
        }
        catch (e) {
          console.error("Failed to persist pathways:", e);
          toast({ title: t("pages.pathways.toast_genError"), description: "Failed to save — pathways won't persist after navigation", variant: "destructive" });
        }
      } else {
        // No DB to persist to — show API response directly
        setPathways(p);
        toast({ title: t("pages.pathways.toast_generated"), description: t("pages.pathways.toast_generatedDesc") });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("pages.pathways.toast_genErrorDesc");
      toast({ title: t("pages.pathways.toast_genError"), description: msg, variant: "destructive" });
    } finally {
      generateLockRef.current = false;
      setGenerating(false);
    }
  };

  const selectPathway = async (pathwayId: number) => {
    setSelecting(pathwayId);
    try {
      const ok = useSupabaseData
        ? await selectPathwayInDb(pid, pathwayId)
        : await fetch(`/api/profiles/${pid}/pathways/${pathwayId}/select`, {
            method: "POST",
            credentials: "include",
          })
            .then(async (response) => {
              if (!response.ok) return false;
              const body = await response.json().catch(() => ({ ok: response.ok })) as { ok?: boolean };
              return body.ok !== false;
            });
      if (!ok) throw new Error();
      setPathways(prev => prev.map(p => ({ ...p, isSelected: p.id === pathwayId ? "true" : "false" })));
      toast({ title: t("pages.pathways.toast_selected") });
    } catch {
      toast({ title: t("pages.pathways.toast_selectError"), variant: "destructive" });
    } finally {
      setSelecting(null);
    }
  };

  const generateRoadmap = async (pathwayId: number) => {
    setGeneratingRoadmap(pathwayId);
    try {
      const pathway = pathways.find((p) => p.id === pathwayId);
      if (!pathway?.reportJson) throw new Error("Pathway data not found");

      // Load profile data for the generation input
      let profileData: Record<string, unknown> = {};
      // Avoid passing the "dev" bypass user id to Supabase's UUID column
      if (user?.id && user.id !== "dev") {
        const sp = await getProfileForUser(user.id);
        if (sp) {
          profileData = {
            fullName: sp.fullName,
            communityCollege: sp.communityCollege,
            intendedMajor: sp.intendedMajor,
            careerGoal: sp.careerGoal,
            currentGpa: sp.currentGpa,
            transferTimeline: sp.transferTimeline,
            financialSituation: sp.financialSituation,
            isFirstGen: sp.isFirstGen,
          };
        }
      }

      const r = await fetchWithTimeout(`/api/pathways/${pathwayId}/generate-roadmap`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathway: {
            university: pathway.reportJson.university,
            pathwayType: pathway.pathwayType ?? "moderately_compatible",
            compatibilityScore: pathway.compatibilityScore ?? 70,
            gpaTarget: pathway.reportJson.gpaTarget ?? 3.0,
            requiredUnits: pathway.reportJson.requiredUnits ?? 60,
            whyItFits: pathway.reportJson.whyItFits ?? "",
            concerns: pathway.reportJson.concerns ?? "",
            transferTimeline: pathway.reportJson.transferTimeline ?? "",
            courseGaps: pathway.reportJson.courseGaps ?? [],
            risks: pathway.reportJson.risks ?? [],
            nextSteps: pathway.reportJson.nextSteps ?? [],
          },
          profile: profileData,
          courses: profileCourses,
        }),
        timeout: 180_000,
      }, getSignal());
      if (r.status === 429) {
        toast({ title: t("pages.pathways.toast_rateLimit"), description: t("pages.pathways.toast_roadmapRateDesc"), variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const result = await r.json() as { title: string; contentMarkdown: string };

      // Save to Supabase
      const saved = await saveRoadmap(pid, result.title, result.contentMarkdown, pathwayId);
      if (!saved) throw new Error("Failed to save roadmap");

      toast({ title: t("pages.pathways.toast_roadmapReady"), description: t("pages.pathways.toast_roadmapReadyDesc") });
      navigate(`/roadmap/${saved.id}`);
    } catch {
      toast({ title: t("pages.pathways.toast_roadmapError"), variant: "destructive" });
    } finally {
      setGeneratingRoadmap(null);
    }
  };

  if (loading) {
    return <PageLoadingState />;
  }

  return (
    <AppPageLayout profileId={pid} maxWidth="4xl">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b-2 border-slate-900 pb-4 mb-6 mt-4 md:mt-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">{t("pages.pathways.title")}</h1>
            <p className="text-slate-600 text-sm mt-1">
              <CopyTrans i18nKey="pages.pathways.intro" components={{ strong: <strong /> }} />
            </p>
          </div>
          <Button
            onClick={generatePathways}
            disabled={generating}
            className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 text-sm font-semibold rounded-lg"
          >
            {generating ? (
              <><KaleonLoader size={16} />{t("pages.pathways.generating")}</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />{generations.length > 0 ? "Compare new options" : t("pages.pathways.generatePathways")}</>
            )}
          </Button>
        </header>

        {profileCourses.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  {t("pages.pathways.completedCoursesTitle")}
                </h2>
                <p className="text-xs text-slate-600 mt-1">{t("pages.pathways.completedCoursesBody")}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {profileGpa != null && (
                  <div className="text-center">
                    <div className="font-bold text-emerald-600">{profileGpa.toFixed(2)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("pages.courses.estimatedGpa")}</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="font-bold text-emerald-600">{totalUnits} / {GRADUATION_UNITS}</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("pages.courses.totalUnits")}</div>
                </div>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${graduationProgressPercent(totalUnits)}%` }}
              />
            </div>
            {courseAnalysis && (
              <p className="text-sm text-slate-600 mb-4">{courseAnalysis}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {profileCourses.map(course => (
                <span
                  key={course.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  {course.courseCode ?? course.courseName}
                  {course.term && <span className="opacity-70">{course.term}</span>}
                  {course.units && <span className="opacity-70">{course.units}u</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        <PageMotion>
        {generating && (
          <div className="flex flex-col items-center py-12">
            <div className="flex items-center justify-center mb-4" style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(78,204,163,0.08)", border: "1px solid rgba(78,204,163,0.25)" }}>
              <img src={KALEON_LOGO_SRC} alt="Kaleon" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "contain" }} />
            </div>
            <div className="mb-5" style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(78,204,163,0.2)", borderTopColor: "#4ECCA3", animation: "spin 0.9s linear infinite" }} />
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
            <h2 className="text-lg font-semibold text-center" style={{ color: "#f1f5f9" }}>{t("pages.pathways.generatingTitle")}</h2>
            <p className="text-sm mt-1 text-center max-w-sm" style={{ color: "var(--app-text-muted)" }}>{t("pages.pathways.generatingBody")}</p>
          </div>
        )}

        {!generating && pathways.length === 0 && (
          <div className="text-center py-16">
            <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-800">{t("pages.pathways.noPathwaysTitle")}</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              {t("pages.pathways.noPathwaysBody")}
            </p>
            <Button
              onClick={generatePathways}
              disabled={generating}
              className="mt-6 bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("pages.pathways.generatePathways")}
            </Button>
          </div>
        )}

        {!generating && pathways.length > 0 && (
          <>
          {/* Generation selector tabs */}
          {generations.length > 1 && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200 overflow-x-auto">
              {generations.map((label) => (
                <button
                  key={label}
                  onClick={() => setActiveGeneration(label)}
                  className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeGeneration === label
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <motion.div
            key={activeGeneration ?? "all"}
            className="space-y-4 pb-12"
            initial={pwMotionOn ? "hidden" : false}
            whileInView={pwMotionOn ? "show" : undefined}
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
          >
            {["least_compatible", "moderately_compatible", "most_compatible"].map(type => {
              const pathway = visiblePathways.find(p => p.pathwayType === type);
              if (!pathway) return null;
              const report = pathway.reportJson;
              const meta = TYPE_LABELS[type] ?? { labelKey: type, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" };
              const isSelected = pathway.isSelected === "true";

              return (
                <motion.div
                  key={pathway.id}
                  variants={itemVariants ?? fadeUp(8, DUR.base)}
                  whileHover={pwMotionOn ? pwLift : undefined}
                >
                <Card className={cn(
                  "transition-all border-2 border-slate-900 rounded-none shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]",
                  isSelected && "ring-4 ring-slate-900 ring-offset-2"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold", meta.bg, meta.color)}>
                            {t(meta.labelKey)} {t("pages.pathways.schoolSuffix")}
                          </span>
                          {pathway.generationLabel && (
                            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 font-medium">
                              {pathway.generationLabel}
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full border border-slate-900 flex items-center gap-1 font-semibold">
                              <CheckCircle className="h-3 w-3" /> {t("pages.pathways.primaryBadge")}
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg">{report?.university ?? pathway.universityId}</CardTitle>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {t("pages.pathways.compatibility")} <strong>{report?.compatibilityScore ?? pathway.compatibilityScore}%</strong>
                          {report?.transferTimeline && <> · {t("pages.pathways.target")} <strong>{report.transferTimeline}</strong></>}
                          {report?.gpaTarget && <> · {t("pages.pathways.gpaTarget")} <strong>{report.gpaTarget}</strong></>}
                        </p>
                      </div>
                    </div>
                    {/* Compact preview excerpt */}
                    {report?.whyItFits && (
                      <p className="text-sm text-slate-500 mt-2 pt-2 border-t border-slate-100 line-clamp-2">
                        {report.whyItFits.length > 180
                          ? report.whyItFits.slice(0, 180) + "…"
                          : report.whyItFits}
                      </p>
                    )}
                  </CardHeader>

                  {report && (
                    <CardContent className="space-y-2 pt-0 border-t border-slate-100">

                      {/* Collapsible: Why It Fits (full) */}
                      {report.whyItFits && (
                        <CollapsibleSection
                          label={t("pages.pathways.whyItFits")}
                          icon={<CheckCircle className="h-3.5 w-3.5" />}
                          pathwayId={pathway.id}
                          sectionKey="whyItFits"
                          openSections={openSections}
                          onToggle={toggleSection}
                          color="#059669"
                        >
                          <p className="text-sm text-slate-600">{report.whyItFits}</p>
                        </CollapsibleSection>
                      )}

                      {/* Collapsible: Concerns */}
                      {report.concerns && (
                        <CollapsibleSection
                          label={t("pages.pathways.concerns")}
                          icon={<AlertTriangle className="h-3.5 w-3.5" />}
                          pathwayId={pathway.id}
                          sectionKey="concerns"
                          openSections={openSections}
                          onToggle={toggleSection}
                          color="#d97706"
                        >
                          <p className="text-sm text-slate-600">{report.concerns}</p>
                        </CollapsibleSection>
                      )}

                      {/* Collapsible: Risk Analysis */}
                      {report.riskAnalysis && (
                        <CollapsibleSection
                          label="Risk analysis"
                          icon={<AlertTriangle className="h-3.5 w-3.5" />}
                          pathwayId={pathway.id}
                          sectionKey="risks"
                          openSections={openSections}
                          onToggle={toggleSection}
                          color="#d97706"
                        >
                          <p className="text-sm text-slate-600">{report.riskAnalysis}</p>
                        </CollapsibleSection>
                      )}

                      {/* Collapsible: Course Gaps */}
                      {(() => {
                        const openGaps = remainingCourseGaps(report.courseGaps, completedCourseCodes);
                        if (openGaps.length === 0) return null;
                        return (
                          <CollapsibleSection
                            label={`${t("pages.pathways.courseGaps")} (${openGaps.length})`}
                            icon={<BookOpen className="h-3.5 w-3.5" />}
                            pathwayId={pathway.id}
                            sectionKey="courseGaps"
                            openSections={openSections}
                            onToggle={toggleSection}
                          >
                            <ul className="text-sm text-slate-600 space-y-0.5">
                              {openGaps.map((gap, i) => <li key={i}>• {gap}</li>)}
                            </ul>
                          </CollapsibleSection>
                        );
                      })()}

                      {/* Collapsible: Campus Opportunities */}
                      {report.campusOpportunities && report.campusOpportunities.length > 0 && (
                        <CollapsibleSection
                          label={t("pages.pathways.campusOpps")}
                          icon={<Building2 className="h-3.5 w-3.5" />}
                          pathwayId={pathway.id}
                          sectionKey="campusOpps"
                          openSections={openSections}
                          onToggle={toggleSection}
                        >
                          <div className="space-y-2">
                            {report.campusOpportunities.map((opp, i) => {
                              const Icon = OPP_ICONS[opp.type] ?? Star;
                              const colorClass = OPP_COLORS[opp.type] ?? "bg-slate-100 text-slate-600";
                              return (
                                <div key={i} className="border border-slate-200 rounded-lg p-3 bg-white">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-slate-800">{opp.name}</span>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-1", colorClass)}>
                                      <Icon className="h-3 w-3" />
                                      {opp.type.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mb-1.5">{opp.description}</p>
                                  {opp.admitProfileNote && (
                                    <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs text-amber-800">
                                      <strong>{t("pages.pathways.admitInsight")}</strong> {opp.admitProfileNote}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleSection>
                      )}

                      {/* Collapsible: Extracurricular */}
                      {(!report.campusOpportunities || report.campusOpportunities.length === 0) &&
                        report.extracurricularRecommendations && report.extracurricularRecommendations.length > 0 && (
                        <CollapsibleSection
                          label={t("pages.pathways.extracurricular")}
                          icon={<Users className="h-3.5 w-3.5" />}
                          pathwayId={pathway.id}
                          sectionKey="extracurricular"
                          openSections={openSections}
                          onToggle={toggleSection}
                        >
                          <ul className="text-sm text-slate-600 space-y-0.5">
                            {report.extracurricularRecommendations.map((r, i) => <li key={i}>• {r}</li>)}
                          </ul>
                        </CollapsibleSection>
                      )}

                      {/* Collapsible: Scholarships */}
                      {report.scholarshipOptions && report.scholarshipOptions.length > 0 && (
                        <CollapsibleSection
                          label={t("pages.pathways.scholarships")}
                          icon={<Award className="h-3.5 w-3.5" />}
                          pathwayId={pathway.id}
                          sectionKey="scholarships"
                          openSections={openSections}
                          onToggle={toggleSection}
                        >
                          <ul className="text-sm text-slate-600 space-y-0.5">
                            {report.scholarshipOptions.map((s, i) => <li key={i}>• {s}</li>)}
                          </ul>
                        </CollapsibleSection>
                      )}

                      {/* Collapsible: Internships */}
                      {report.internshipRecommendations && report.internshipRecommendations.length > 0 && (
                        <CollapsibleSection
                          label={t("pages.pathways.internships")}
                          icon={<Briefcase className="h-3.5 w-3.5" />}
                          pathwayId={pathway.id}
                          sectionKey="internships"
                          openSections={openSections}
                          onToggle={toggleSection}
                        >
                          <ul className="text-sm text-slate-600 space-y-0.5">
                            {report.internshipRecommendations.map((r, i) => <li key={i}>• {r}</li>)}
                          </ul>
                        </CollapsibleSection>
                      )}

                      {/* Collapsible: Risks */}
                      {report.risks && report.risks.length > 0 && (
                        <CollapsibleSection
                          label={t("pages.pathways.riskAlerts")}
                          icon={<AlertTriangle className="h-3.5 w-3.5" />}
                          pathwayId={pathway.id}
                          sectionKey="riskAlerts"
                          openSections={openSections}
                          onToggle={toggleSection}
                          color="#d97706"
                        >
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <ul className="text-sm text-amber-800 space-y-0.5">
                              {report.risks.map((risk, i) => <li key={i}>• {risk}</li>)}
                            </ul>
                          </div>
                        </CollapsibleSection>
                      )}

                      {/* Collapsible: Next Steps */}
                      {report.nextSteps && report.nextSteps.length > 0 && (
                        <CollapsibleSection
                          label={t("pages.pathways.nextSteps")}
                          icon={<ArrowRight className="h-3.5 w-3.5" />}
                          pathwayId={pathway.id}
                          sectionKey="nextSteps"
                          openSections={openSections}
                          onToggle={toggleSection}
                          color="#0f766e"
                        >
                          <ol className="space-y-1">
                            {report.nextSteps.map((step, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <span className="text-emerald-600 font-bold flex-shrink-0">{i + 1}.</span>
                                <span className="text-slate-600">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </CollapsibleSection>
                      )}
                    </CardContent>
                  )}

                  {/* Action buttons */}
                  <div className="px-6 pb-4 flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={isSelected ? "outline" : "default"}
                      onClick={() => selectPathway(pathway.id)}
                      disabled={selecting === pathway.id || isSelected}
                      className={cn(
                        "border-2 rounded-lg text-sm font-semibold",
                        isSelected
                          ? "border-slate-900 text-slate-900 bg-white"
                          : "border-slate-900 bg-slate-900 hover:bg-slate-700 text-white"
                      )}
                    >
                      {selecting === pathway.id ? <KaleonLoader size={14} /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                      {isSelected ? t("pages.pathways.primaryPathway") : t("pages.pathways.makePrimary")}
                    </Button>
                    {isSelected && (
                      <Button
                        size="sm"
                        onClick={() => generateRoadmap(pathway.id)}
                        disabled={generatingRoadmap === pathway.id}
                        className="border-2 border-slate-900 bg-slate-900 text-white hover:bg-slate-700 rounded-lg text-sm font-semibold"
                      >
                        {generatingRoadmap === pathway.id ? (
                          <><KaleonLoader size={14} />{t("pages.pathways.generating")}</>
                        ) : (
                          <><GraduationCap className="h-3.5 w-3.5 mr-1" />{t("pages.pathways.academicRoadmap")}</>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
                </motion.div>
              );
            })}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <CopyTrans i18nKey="pages.pathways.disclaimer" components={{ strong: <strong /> }} />
            </div>
          </motion.div>
          </>
        )}
        </PageMotion>
    </AppPageLayout>
  );
}
