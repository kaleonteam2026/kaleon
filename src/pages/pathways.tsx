import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Target, AlertTriangle, CheckCircle, ArrowRight,
  ChevronDown, ChevronUp, Sparkles, BookOpen, Award, Users, Briefcase,
  Star, GraduationCap, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageMotion } from "@/components/page-motion";
import { motion } from "framer-motion";
import { fadeUp, useBrutalistMotion, DUR } from "@/lib/motion";
import { KALEON_LOGO_SRC } from "@/lib/brand";
import { CopyTrans } from "@/components/copy-trans";
import { t } from "@/lib/copy";
import { useAuth } from "@/contexts/auth-context";
import {
  getProfileForUser,
  getCoursesForProfile,
} from "@/lib/supabase-profiles";
import { GRADUATION_UNITS, graduationProgressPercent, computeGpaSummary } from "@/lib/course-progress";

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
  type: string;
  university: string;
  compatibilityScore: number;
  whyItFits: string;
  concerns: string;
  riskAnalysis?: string;
  gpaTarget: number;
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
}

const TYPE_LABELS: Record<string, { labelKey: string; color: string; bg: string }> = {
  least_compatible:      { labelKey: "pages.pathways.type_stretch", color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
  moderately_compatible: { labelKey: "pages.pathways.type_match",   color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  most_compatible:       { labelKey: "pages.pathways.type_safety",  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
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
  club: "bg-rose-100 text-rose-700",
  research: "bg-purple-100 text-purple-700",
  internship: "bg-blue-100 text-blue-700",
  honor_society: "bg-amber-100 text-amber-700",
  program: "bg-teal-100 text-teal-700",
  leadership: "bg-indigo-100 text-indigo-700",
  community: "bg-green-100 text-green-700",
  honors_program: "bg-amber-100 text-amber-700",
  career_prep: "bg-emerald-100 text-emerald-700",
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
  const [generatingGuidebook, setGeneratingGuidebook] = useState<number | null>(null);
  const [generatingRoadmap, setGeneratingRoadmap] = useState<number | null>(null);
  const pid = parseInt(profileId);
  const { enabled: pwMotionOn, lift: pwLift, itemVariants, containerVariants } = useBrutalistMotion();

  const loadPathways = () => {
    // Try API first (mock/dev mode), fall back to Supabase
    const apiPromise = Promise.all([
      fetch(`/api/profiles/${pid}/pathways`, { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : []) as Promise<Pathway[]>,
      ),
      fetch(`/api/profiles/${pid}/courses`, { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : []) as Promise<ProfileCourse[]>,
      ),
      fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : {}) as Promise<{ estimatedGpa?: number; totalUnits?: number }>,
      ),
    ]);

    apiPromise
      .then(([pathwayData, courseData, gpaData]) => {
        if (pathwayData.length > 0 || courseData.length > 0) {
          // API returned data
          setPathways(pathwayData);
          setProfileCourses(courseData);
          setProfileGpa(gpaData.estimatedGpa && gpaData.estimatedGpa > 0 ? gpaData.estimatedGpa : null);
          setTotalUnits(gpaData.totalUnits ?? 0);
          setLoading(false);
        } else if (user?.id) {
          // API returned empty — try Supabase directly
          Promise.all([
            getProfileForUser(user.id),
            getCoursesForProfile(pid),
          ]).then(([profile, storedCourses]) => {
            if (storedCourses.length > 0) {
              setProfileCourses(storedCourses as ProfileCourse[]);
              const gpaSummary = computeGpaSummary(
                storedCourses,
                profile?.currentGpa,
              );
              setProfileGpa(gpaSummary.estimatedGpa > 0 ? gpaSummary.estimatedGpa : null);
              setTotalUnits(gpaSummary.totalUnits ?? 0);
            }
            setLoading(false);
          }).catch(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadPathways(); }, [pid]);

  const completedCourseCodes = new Set(
    profileCourses
      .filter(c => c.status === "completed")
      .map(c => courseCodeKey(c.courseCode ?? c.courseName)),
  );

  const generatePathways = async () => {
    setGenerating(true);
    try {
      // Load profile and courses from Supabase directly (no non-existent API endpoints)
      let profile: Record<string, unknown> = {};
      let courses: ProfileCourse[] = [];
      let totalUnits = 0;
      if (user?.id) {
        const sp = await getProfileForUser(user.id);
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
          setProfileCourses(courses);
          setProfileGpa(gpaSummary.estimatedGpa > 0 ? gpaSummary.estimatedGpa : null);
          setTotalUnits(totalUnits);
        }
      }

      const r = await fetch(`/api/profiles/${pid}/generate-pathways`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: pid,
          fullName: profile.fullName,
          communityCollege: profile.communityCollege,
          intendedMajor: profile.intendedMajor,
          careerGoal: profile.careerGoal,
          currentGpa: profile.currentGpa,
          transferTimeline: profile.transferTimeline,
          financialSituation: profile.financialSituation,
          isFirstGen: profile.isFirstGen,
          courses,
          totalUnits,
        }),
      });
      if (r.status === 429) {
        toast({ title: t("pages.pathways.toast_rateLimit"), description: t("pages.pathways.toast_rateLimitDesc"), variant: "destructive" });
        return;
      }
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Generation failed");
      }
      const data = await r.json() as Pathway[] | PathwayGenerationResponse;
      const p = Array.isArray(data) ? data : (data.pathways ?? []);
      if (!Array.isArray(data) && data.progressSummary?.completedUnits != null) {
        setTotalUnits(data.progressSummary.completedUnits);
      }
      if (!Array.isArray(data) && data.progressSummary?.courseAnalysis) {
        setCourseAnalysis(data.progressSummary.courseAnalysis);
      }
      setPathways(p);
      toast({ title: t("pages.pathways.toast_generated"), description: t("pages.pathways.toast_generatedDesc") });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("pages.pathways.toast_genErrorDesc");
      toast({ title: t("pages.pathways.toast_genError"), description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const selectPathway = async (pathwayId: number) => {
    setSelecting(pathwayId);
    try {
      await fetch(`/api/pathways/${pathwayId}/select`, { method: "POST", credentials: "include" });
      setPathways(prev => prev.map(p => ({ ...p, isSelected: p.id === pathwayId ? "true" : "false" })));
      toast({ title: t("pages.pathways.toast_selected") });
    } catch {
      toast({ title: t("pages.pathways.toast_selectError"), variant: "destructive" });
    } finally {
      setSelecting(null);
    }
  };

  const generateGuidebook = async (pathwayId: number) => {
    setGeneratingGuidebook(pathwayId);
    try {
      const r = await fetch(`/api/pathways/${pathwayId}/generate-guidebook`, { method: "POST", credentials: "include" });
      if (r.status === 429) {
        toast({ title: t("pages.pathways.toast_rateLimit"), variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const g = await r.json() as { id: number };
      toast({ title: t("pages.pathways.toast_guidebookReady"), description: t("pages.pathways.toast_guidebookReadyDesc") });
      navigate(`/guidebook/${g.id}`);
    } catch {
      toast({ title: t("pages.pathways.toast_guidebookError"), variant: "destructive" });
    } finally {
      setGeneratingGuidebook(null);
    }
  };

  const generateRoadmap = async (pathwayId: number) => {
    setGeneratingRoadmap(pathwayId);
    try {
      const r = await fetch(`/api/pathways/${pathwayId}/generate-roadmap`, { method: "POST", credentials: "include" });
      if (r.status === 429) {
        toast({ title: t("pages.pathways.toast_rateLimit"), description: t("pages.pathways.toast_roadmapRateDesc"), variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const roadmap = await r.json() as { id: number };
      toast({ title: t("pages.pathways.toast_roadmapReady"), description: t("pages.pathways.toast_roadmapReadyDesc") });
      navigate(`/roadmap/${roadmap.id}`);
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
            className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 pwc-font-mono uppercase tracking-wider text-xs font-bold rounded-none"
          >
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("pages.pathways.generating")}</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />{pathways.length > 0 ? t("pages.pathways.regenerate") : t("pages.pathways.generatePathways")}</>
            )}
          </Button>
        </header>

        {profileCourses.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  {t("pages.pathways.completedCoursesTitle")}
                </h2>
                <p className="text-xs text-slate-600 mt-1">{t("pages.pathways.completedCoursesBody")}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {profileGpa != null && (
                  <div className="text-center">
                    <div className="font-bold text-indigo-600">{profileGpa.toFixed(2)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("pages.courses.estimatedGpa")}</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="font-bold text-indigo-600">{totalUnits} / {GRADUATION_UNITS}</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("pages.courses.totalUnits")}</div>
                </div>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
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
            <p className="text-sm mt-1 text-center max-w-sm" style={{ color: "#64748b" }}>{t("pages.pathways.generatingBody")}</p>
            <div className="mt-8 w-full max-w-md rounded-2xl p-6" style={{ background: "rgba(13,26,46,0.9)", border: "1px solid rgba(78,204,163,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3 pwc-font-mono" style={{ color: "#4ECCA3" }}>Loved by Transfer Students</p>
              <p className="text-3xl mb-1" style={{ color: "#4ECCA3", fontFamily: "Georgia, serif", lineHeight: 1 }}>"</p>
              <p className="font-bold -mt-1" style={{ color: "#f1f5f9" }}>"Took me 2 minutes to get a plan that would've taken me 3 appointments to figure out."</p>
              <div className="flex items-center gap-3 mt-5">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "rgba(78,204,163,0.15)", color: "#4ECCA3" }}>M</div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#f1f5f9" }}>Maria Hernandez</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>Student @ East Los Angeles College</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!generating && pathways.length === 0 && (
          <div className="text-center py-16">
            <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-slate-800">{t("pages.pathways.noPathwaysTitle")}</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              {t("pages.pathways.noPathwaysBody")}
            </p>
          </div>
        )}

        {!generating && pathways.length > 0 && (
          <motion.div
            className="space-y-4 pb-12"
            initial={pwMotionOn ? "hidden" : false}
            whileInView={pwMotionOn ? "show" : undefined}
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
          >
            {["least_compatible", "moderately_compatible", "most_compatible"].map(type => {
              const pathway = pathways.find(p => p.pathwayType === type);
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
                          {isSelected && (
                            <span className="text-xs bg-slate-900 text-white px-2 py-0.5 border-2 border-slate-900 flex items-center gap-1 pwc-font-mono uppercase tracking-wider font-bold">
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
                          color="#e11d48"
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
                          color="#e11d48"
                        >
                          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                            <ul className="text-sm text-rose-700 space-y-0.5">
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
                          color="#6366f1"
                        >
                          <ol className="space-y-1">
                            {report.nextSteps.map((step, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <span className="text-indigo-500 font-bold flex-shrink-0">{i + 1}.</span>
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
                        "border-2 rounded-none pwc-font-mono uppercase tracking-wider text-xs font-bold",
                        isSelected
                          ? "border-slate-900 text-slate-900 bg-white"
                          : "border-slate-900 bg-slate-900 hover:bg-slate-700 text-white"
                      )}
                    >
                      {selecting === pathway.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                      {isSelected ? t("pages.pathways.primaryPathway") : t("pages.pathways.makePrimary")}
                    </Button>
                    {isSelected && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => generateGuidebook(pathway.id)}
                          disabled={generatingGuidebook === pathway.id || generatingRoadmap === pathway.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {generatingGuidebook === pathway.id ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />{t("pages.pathways.generating")}</>
                          ) : (
                            <><Sparkles className="h-3.5 w-3.5 mr-1" />{t("pages.pathways.generateGuidebook")}</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => generateRoadmap(pathway.id)}
                          disabled={generatingRoadmap === pathway.id || generatingGuidebook === pathway.id}
                          className="bg-violet-600 hover:bg-violet-700 text-white"
                        >
                          {generatingRoadmap === pathway.id ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />{t("pages.pathways.generating")}</>
                          ) : (
                            <><GraduationCap className="h-3.5 w-3.5 mr-1" />{t("pages.pathways.academicRoadmap")}</>
                          )}
                        </Button>
                      </>
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
        )}
        </PageMotion>
    </AppPageLayout>
  );
}
