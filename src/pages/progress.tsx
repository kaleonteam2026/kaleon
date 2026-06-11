import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "@/components/markdown-renderer";
import { cn } from "@/lib/utils";
import { PageMotion } from "@/components/page-motion";
import { motion } from "framer-motion";
import { fadeUp, useBrutalistMotion, DUR } from "@/lib/motion";
import {
  TrendingUp, Plus, Loader2, Download, AlertTriangle,
  GraduationCap, Award, CheckCircle2, Sparkles, Activity,
  BookOpen, Target, ArrowRight, BarChart3, Info,
} from "lucide-react";
import { t } from "@/lib/copy";
import { useToast } from "@/hooks/use-toast";

import { PathwayLockScreen } from "@/components/progress/pathway-lock-screen";
import { PathwayHistoryPanel } from "@/components/progress/pathway-history-panel";
import { EntryFeedbackCard } from "@/components/progress/entry-feedback-card";
import { EntryCard } from "@/components/progress/entry-card";
import { AnalysisCard } from "@/components/progress/analysis-card";
import { ScoreRing } from "@/components/progress/score-ring";
import { ENTRY_TYPES } from "@/components/progress/entry-types-config";
import type { EntryType, ProgressEntry, EntryFeedback, ProgressAnalysis } from "@/components/progress/progress-types";

/** Local pathway data shape for the progress page. */
interface PathwayOverviewData {
  university?: string;
  pathwayType?: string;
  compatibilityScore?: unknown;
  gpaTarget?: unknown;
  requiredUnits?: unknown;
  courseGaps?: string[];
  risks?: string[];
  nextSteps?: string[];
}

interface PathwayInfo {
  hasSelectedPathway: boolean;
  pathway: PathwayOverviewData | null;
}
import { useAuth } from "@/contexts/auth-context";
import {
  getSelectedPathway,
  loadPathwaysFromDb,
  loadPathwaySnapshots,
} from "@/lib/supabase-pathways";
import type { PathwaySnapshot, Pathway } from "@/lib/supabase-pathways";
import {
  getCoursesForProfile,
  getProfileForUser,
} from "@/lib/supabase-profiles";
import { IGETC_AREAS, CSU_GE_AREAS } from "@/components/courses/course-types";
import type { TransferabilityResult, CourseTransferResult } from "@/components/courses/course-types";
import { computeGpaSummary, graduationProgressPercent, transferProgressPercent } from "@/lib/course-progress";
import type { StoredCourse } from "@/lib/course-progress";

type Tab = "log" | "timeline" | "assessment" | "history";

export default function ProgressTracker() {
  const { enabled: prMotionOn, lift: prLift, itemVariants, containerVariants } = useBrutalistMotion();
  const { profileId } = useParams<{ profileId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const pid = parseInt(profileId);

  // Pathway gate
  const [pathwayInfo, setPathwayInfo] = useState<PathwayInfo | null>(null);
  const [pathwayLoading, setPathwayLoading] = useState(true);

  // Courses data for transfer/IGETC overview
  const [profileCourses, setProfileCourses] = useState<StoredCourse[]>([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [profileGpa, setProfileGpa] = useState<number | null>(null);
  const [igetcDoneCount, setIgetcDoneCount] = useState<number | null>(null);
  const [calgetcDoneCount, setCalgetcDoneCount] = useState<number | null>(null);
  const [gePattern, setGePattern] = useState<"igetc" | "calgetc">("igetc");
  const [transferabilityResult, setTransferabilityResult] = useState<TransferabilityResult | null>(null);

  // Tab
  const [tab, setTab] = useState<Tab>("log");

  // Log form
  const [entryType, setEntryType] = useState<EntryType>("gpa_update");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [numericValue, setNumericValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Entry feedback
  const [pendingFeedback, setPendingFeedback] = useState<{ loading: boolean; data: EntryFeedback | null; entryTitle: string }>({
    loading: false, data: null, entryTitle: "",
  });

  // Timeline
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [filterType, setFilterType] = useState<EntryType | "all">("all");

  // Assessment
  const [analyses, setAnalyses] = useState<ProgressAnalysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [activeAnalysis, setActiveAnalysis] = useState<ProgressAnalysis | null>(null);
  const [generating, setGenerating] = useState(false);
  const [, setCurrentSection] = useState("");

  // Pathway history snapshots
  const [pathwaySnapshots, setPathwaySnapshots] = useState<PathwaySnapshot[]>([]);
  const [pathwayHistory, setPathwayHistory] = useState<Pathway[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const analysisRef = useRef<HTMLDivElement>(null);

  // Load pathway gate + data (Supabase direct, no non-existent API endpoints)
  useEffect(() => {
    if (!user?.id) {
      setPathwayLoading(false);
      return;
    }

    let cancelled = false;

    getSelectedPathway(pid).then(selected => {
      if (cancelled) return;
      if (selected) {
        setPathwayInfo({
          hasSelectedPathway: true,
          pathway: {
            university: selected.reportJson?.university,
            pathwayType: selected.pathwayType,
            compatibilityScore: selected.compatibilityScore,
            gpaTarget: selected.reportJson?.gpaTarget,
            requiredUnits: selected.reportJson?.requiredUnits,
            courseGaps: selected.reportJson?.courseGaps,
            risks: selected.reportJson?.risks,
            nextSteps: selected.reportJson?.nextSteps,
          },
        });
      } else {
        setPathwayInfo({ hasSelectedPathway: false, pathway: null });
      }
    }).catch(() => {
      if (!cancelled) setPathwayInfo({ hasSelectedPathway: false, pathway: null });
    }).finally(() => {
      if (!cancelled) setPathwayLoading(false);
    });

    getCoursesForProfile(pid).then(courses => {
      if (cancelled) return;
      setProfileCourses(courses);
      const gpaSummary = computeGpaSummary(courses);
      setTotalUnits(gpaSummary.totalUnits ?? 0);
    }).catch(() => {});

    getProfileForUser(user.id).then(profile => {
      if (cancelled) return;
      setProfileGpa(profile?.currentGpa ?? null);
    }).catch(() => {});

    fetch(`/api/profiles/${pid}/progress`, { credentials: "include" })
      .then(r => r.json())
      .then((e: ProgressEntry[]) => setEntries(e))
      .catch(() => {})
      .finally(() => setLoadingEntries(false));

    fetch(`/api/profiles/${pid}/progress/analyses`, { credentials: "include" })
      .then(r => r.json())
      .then((a: ProgressAnalysis[]) => { setAnalyses(a); if (a.length > 0) setActiveAnalysis(a[0]); })
      .catch(() => {})
      .finally(() => setLoadingAnalyses(false));

    // Load IGETC areas (may not exist in production — degrade gracefully)
    fetch(`/api/profiles/${pid}/igetc`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { areas?: Record<string, boolean> } | null) => {
        if (data?.areas) {
          setIgetcDoneCount(Object.values(data.areas).filter(Boolean).length);
        }
      })
      .catch(() => {});

    // Load CalGETC areas (may not exist in production — degrade gracefully)
    fetch(`/api/profiles/${pid}/calgetc`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { areas?: Record<string, boolean> } | null) => {
        if (data?.areas) {
          setCalgetcDoneCount(Object.values(data.areas).filter(Boolean).length);
        }
      })
      .catch(() => {});

    // Load transferability analysis results to show per-course GE area mapping
    fetch(`/api/profiles/${pid}/transferability-analysis`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: TransferabilityResult | null) => {
        if (data?.courseAnalysis && data.courseAnalysis.length > 0) {
          setTransferabilityResult(data);
        }
      })
      .catch(() => {});

    // Load pathway history snapshots for the History tab
    Promise.all([
      loadPathwaySnapshots(pid),
      loadPathwaysFromDb(pid),
    ]).then(([snapshots, allPathways]) => {
      if (cancelled) return;
      setPathwaySnapshots(snapshots);
      setPathwayHistory(allPathways);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoadingHistory(false);
    });
  }, [pid]);

  const handleLogEntry = async () => {
    if (!title.trim()) { toast({ title: t("pages.progress.titleRequired"), variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        entryType, title: title.trim(),
        description: description.trim() || undefined,
        entryDate: entryDate || undefined,
        numericValue: entryType === "gpa_update" && numericValue ? parseFloat(numericValue) : undefined,
      };
      const r = await fetch(`/api/profiles/${pid}/progress`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), credentials: "include",
      });
      if (!r.ok) throw new Error();
      const entry = await r.json() as ProgressEntry;
      setEntries(prev => [entry, ...prev]);

      const loggedTitle = title.trim();
      setTitle(""); setDescription(""); setNumericValue("");

      // Kick off instant AI feedback
      setPendingFeedback({ loading: true, data: null, entryTitle: loggedTitle });
      toast({ title: t("pages.progress.updateLogged"), description: t("pages.progress.updateLoggedDesc") });

      fetch(`/api/profiles/${pid}/progress/entry-feedback`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id }), credentials: "include",
      })
        .then(r => r.json())
        .then((fb: EntryFeedback) => setPendingFeedback({ loading: false, data: fb, entryTitle: loggedTitle }))
        .catch(() => {
          setPendingFeedback({ loading: false, data: null, entryTitle: loggedTitle });
          toast({ title: t("pages.progress.aiFeedbackError"), variant: "destructive" });
        });
    } catch {
      toast({ title: t("pages.progress.entrySaveError"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId: number) => {
    try {
      await fetch(`/api/progress/${entryId}`, { method: "DELETE", credentials: "include" });
      setEntries(prev => prev.filter(e => e.id !== entryId));
      toast({ title: t("pages.progress.entryDeleted") });
    } catch {
      toast({ title: t("pages.progress.entryDeleteError"), variant: "destructive" });
    }
  };

  const handleGenerateAnalysis = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`/api/profiles/${pid}/progress/analyze`, { method: "POST", credentials: "include" });
      if (r.status === 429) { toast({ title: t("pages.progress.rateLimitReached"), description: t("pages.progress.rateLimitDesc"), variant: "destructive" }); return; }
      if (!r.ok) throw new Error();
      const analysis = await r.json() as ProgressAnalysis;
      setAnalyses(prev => [analysis, ...prev]);
      setActiveAnalysis(analysis);
      toast({ title: t("pages.progress.assessmentReady") });
      setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      toast({ title: t("pages.progress.assessmentError"), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const downloadAnalysis = () => {
    if (!activeAnalysis?.contentMarkdown) return;
    const blob = new Blob([activeAnalysis.contentMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `dyp-progress-${activeAnalysis.id}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEntries = filterType === "all" ? entries : entries.filter(e => e.entryType === filterType);
  const gpaEntries = entries.filter(e => e.entryType === "gpa_update" && e.numericValue != null).sort((a, b) => (a.entryDate ?? "").localeCompare(b.entryDate ?? ""));
  const latestGpa = gpaEntries.length > 0 ? gpaEntries[gpaEntries.length - 1].numericValue : null;
  const certCount = entries.filter(e => e.entryType === "certification").length;
  const oppCount = entries.filter(e => e.entryType === "opportunity").length;
  const achievementCount = entries.filter(e => e.entryType === "achievement").length;

  if (pathwayLoading) {
    return <PageLoadingState showNav profileId={pid} />;
  }

  return (
    <AppPageLayout profileId={pid} maxWidth="4xl">

      {/* Page header */}
      <div className="py-7">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">{t("pages.progress.title")}</h1>
          {pathwayInfo?.hasSelectedPathway && (
            <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {String(pathwayInfo.pathway?.university ?? t("pages.progress.pathwayActiveFallback"))}
            </span>
          )}
        </div>
        <p className="text-slate-600 text-sm">
          {t("pages.progress.intro")}
        </p>
      </div>

      <PageMotion>
        {/* ── PATHWAY OVERVIEW CARD ────────────────────────────────────────── */}
        {pathwayInfo?.hasSelectedPathway && pathwayInfo.pathway && (
          <div className="mb-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-emerald-400" />
                    {String(pathwayInfo.pathway.university ?? t("pages.progress.pathwayActiveFallback"))}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {Boolean(pathwayInfo.pathway.pathwayType) && (
                      <span className="text-xs px-2 py-0.5 rounded-full border font-semibold bg-white/10 text-white/80 border-white/20 capitalize">
                        {String(pathwayInfo.pathway.pathwayType).replace(/_/g, " ")}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {t("pages.pathways.compatibility")} {String(pathwayInfo.pathway.compatibilityScore ?? "—")}%
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  {typeof pathwayInfo.pathway.gpaTarget === "number" && (
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{Number(pathwayInfo.pathway.gpaTarget).toFixed(1)}</div>
                      <div className="text-[10px] uppercase tracking-wider text-white/60">{t("pages.progress.gpaTarget")}</div>
                    </div>
                  )}
                  {typeof pathwayInfo.pathway.requiredUnits === "number" && (
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{totalUnits}/{Number(pathwayInfo.pathway.requiredUnits)}</div>
                      <div className="text-[10px] uppercase tracking-wider text-white/60">Units</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Transfer progress bar */}
              {typeof pathwayInfo.pathway.requiredUnits === "number" && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-sm font-semibold text-slate-700">{t("pages.courses.transferProgress")}</p>
                    <p className="text-sm text-slate-500">
                      {t("pages.courses.transferProgressLabel", {
                        completed: totalUnits,
                        required: Number(pathwayInfo.pathway.requiredUnits),
                        school: String(pathwayInfo.pathway.university ?? ""),
                      })}
                    </p>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                      style={{ width: `${transferProgressPercent(totalUnits, Number(pathwayInfo.pathway.requiredUnits))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* GPA Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                  <div className="text-lg font-bold text-indigo-600">
                    {((latestGpa ?? profileGpa) ?? 0) > 0 ? Number(latestGpa ?? profileGpa).toFixed(2) : "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{t("pages.progress.latestGpa")}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                  <div className="text-lg font-bold text-amber-600">
                    {typeof pathwayInfo.pathway.gpaTarget === "number" ? Number(pathwayInfo.pathway.gpaTarget).toFixed(1) : "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{t("pages.pathways.gpaTarget")}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                  <div className="text-lg font-bold" style={{
                    color: profileGpa != null && typeof pathwayInfo.pathway.gpaTarget === "number"
                      ? Number(profileGpa) >= Number(pathwayInfo.pathway.gpaTarget) ? "#059669" : "#e11d48"
                      : "#94a3b8"
                  }}>
                    {profileGpa != null && typeof pathwayInfo.pathway.gpaTarget === "number"
                      ? Number(pathwayInfo.pathway.gpaTarget) - Number(profileGpa) > 0
                        ? `Need +${(Number(pathwayInfo.pathway.gpaTarget) - Number(profileGpa)).toFixed(2)}`
                        : "Met ✓"
                      : "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Gap</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                  <div className="text-lg font-bold text-slate-900">{profileCourses.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Courses</div>
                </div>
              </div>

              {/* GE pattern toggle + area checklist */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    {gePattern === "igetc"
                      ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" />{t("pages.courses.igetcCompletion", { count: igetcDoneCount ?? "—", total: IGETC_AREAS.length })}</>
                      : <><CheckCircle2 className="h-4 w-4 text-teal-500" />CalGETC (CSU GE Breadth) — {calgetcDoneCount ?? "—"}/{CSU_GE_AREAS.length}</>
                    }
                  </h3>
                  <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      onClick={() => setGePattern("igetc")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${gePattern === "igetc" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      IGETC
                    </button>
                    <button
                      onClick={() => setGePattern("calgetc")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${gePattern === "calgetc" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      CalGETC
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(gePattern === "igetc" ? IGETC_AREAS : CSU_GE_AREAS).map((area) => {
                    const areaKey = area.key;
                    // Find analysis courses that map to this area
                    const areaCourses = transferabilityResult?.courseAnalysis.filter((c) =>
                      gePattern === "igetc"
                        ? c.igetcArea === areaKey
                        : c.csuGEArea === areaKey
                    ) ?? [];
                    // Match against profile courses to get their actual status
                    const courseStatusMap = new Map<string, string>();
                    for (const pc of profileCourses) {
                      const key = (pc.courseCode ?? pc.courseName).toUpperCase().replace(/\s+/g, " ");
                      courseStatusMap.set(key, pc.status ?? "completed");
                    }
                    const planned = areaCourses.filter(c => courseStatusMap.get((c.courseCode ?? c.courseName).toUpperCase().replace(/\s+/g, " ")) === "planned");
                    const other = areaCourses.filter(c => courseStatusMap.get((c.courseCode ?? c.courseName).toUpperCase().replace(/\s+/g, " ")) !== "planned");

                    return (
                      <div
                        key={areaKey}
                        className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center flex-shrink-0">
                            <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                          </div>
                          <span className="text-xs text-slate-600">{t(area.labelKey)}</span>
                          {areaCourses.length > 0 && (
                            <span className="ml-auto text-[10px] text-slate-400">{areaCourses.length} course{areaCourses.length !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                        {other.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {other.map((c, ci) => (
                              <div key={ci} className="flex items-center gap-1.5 text-[11px] text-slate-500 pl-1">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                                <span className="truncate">{c.courseCode || c.courseName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {planned.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {planned.map((c, ci) => (
                              <div key={ci} className="flex items-center gap-1.5 text-[11px] pl-1">
                                <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                                <span className="truncate text-amber-600">{c.courseCode || c.courseName}</span>
                                <span className="text-[10px] px-1 rounded bg-amber-100 text-amber-700 font-medium">Planned</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {areaCourses.length === 0 && transferabilityResult && (
                          <div className="mt-1 text-[10px] text-slate-400 italic">—</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  <Info className="h-3 w-3 inline mr-0.5" />
                  {gePattern === "igetc"
                    ? `${t("pages.courses.igetcQualifies")} — ${t("pages.igetc.verifyTitle")}.`
                    : "CSU GE Breadth (CalGETC) requirements for CSU transfer. Verify with ASSIST.org."
                  }
                </p>
              </div>

              {/* Quick links */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href={`/courses/${profileId}`}>
                  <Button variant="outline" size="sm" className="rounded-none border-slate-300 text-xs">
                    <BookOpen className="h-3.5 w-3.5 mr-1" />{t("pages.courses.title")}
                  </Button>
                </Link>
                <Link href={`/pathways/${profileId}`}>
                  <Button variant="outline" size="sm" className="rounded-none border-slate-300 text-xs">
                    <Target className="h-3.5 w-3.5 mr-1" />{t("pages.pathways.title")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── PATHWAY LOCK ─────────────────────────────────────────────────────── */}
        {!pathwayInfo?.hasSelectedPathway ? (
          <PathwayLockScreen profileId={pid} />
        ) : (
          <>

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200">
              {([
                { id: "log",        label: t("pages.progress.tab_log"),        icon: Plus,      badge: undefined as number | undefined },
                { id: "timeline",   label: t("pages.progress.tab_timeline"),   icon: Activity,  badge: entries.length as number | undefined },
                { id: "assessment", label: t("pages.progress.tab_assessment"), icon: Sparkles,  badge: analyses.length as number | undefined },
                { id: "history",    label: "History",           icon: BarChart3, badge: pathwaySnapshots.length as number | undefined },
              ]).map(tabCfg => (
                <button
                  key={tabCfg.id}
                  onClick={() => setTab(tabCfg.id as Tab)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    tab === tabCfg.id ? "bg-white text-indigo-700 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-700"
                  )}
                >
                  <tabCfg.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tabCfg.label}</span>
                  {tabCfg.badge !== undefined && tabCfg.badge > 0 && (
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-semibold",
                      tab === tabCfg.id ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-600"
                    )}>{tabCfg.badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── TAB: LOG UPDATE ────────────────────────────────────────────── */}
            {tab === "log" && (
              <div className="mb-12 space-y-5">
                {/* Pending feedback card */}
                {(pendingFeedback.loading || pendingFeedback.data) && (
                  <div>
                    {pendingFeedback.loading ? (
                      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 flex items-center gap-3 animate-in fade-in duration-200">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-indigo-800">{t("pages.progress.checkingGuidebook")}</p>
                          <p className="text-xs text-indigo-500 mt-0.5">{t("pages.progress.analyzingAlignment", { title: pendingFeedback.entryTitle })}</p>
                        </div>
                      </div>
                    ) : pendingFeedback.data ? (
                      <EntryFeedbackCard
                        feedback={pendingFeedback.data}
                        entryTitle={pendingFeedback.entryTitle}
                        onDismiss={() => setPendingFeedback({ loading: false, data: null, entryTitle: "" })}
                      />
                    ) : null}
                  </div>
                )}

                {/* Form (hidden while feedback is showing) */}
                {!pendingFeedback.loading && !pendingFeedback.data && (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 mb-1">{t("pages.progress.logUpdate")}</h2>
                      <p className="text-xs text-slate-600">{t("pages.progress.everyEntryChecked")}</p>
                    </div>

                    {/* Entry type grid */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">{t("pages.progress.whatLogging")}</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {(Object.entries(ENTRY_TYPES) as [EntryType, typeof ENTRY_TYPES[EntryType]][]).map(([type, cfg]) => {
                          const Icon = cfg.icon;
                          const active = entryType === type;
                          return (
                            <button key={type} type="button" onClick={() => setEntryType(type)}
                              className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                                active ? cn("border-2 shadow-sm", cfg.border, cfg.bg) : "border-slate-200 bg-white hover:border-slate-300"
                              )}>
                              <Icon className={cn("h-5 w-5", active ? cfg.color : "text-slate-600")} />
                              <span className={cn("text-xs font-semibold leading-tight", active ? cfg.color : "text-slate-600")}>{t(cfg.labelKey)}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-600">{t(ENTRY_TYPES[entryType].descKey)}</p>
                    </div>

                    {entryType === "gpa_update" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="gpaValue">{t("pages.progress.gpaValue")}</Label>
                        <Input id="gpaValue" type="number" min="0" max="4" step="0.01"
                          value={numericValue} onChange={e => setNumericValue(e.target.value)}
                          placeholder={t("pages.progress.gpaPlaceholder")} className="max-w-xs" />
                        <p className="text-xs text-slate-600">{t("pages.progress.gpaRange")}</p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="entryTitle">{entryType === "gpa_update" ? t("pages.progress.semesterTerm") : t("pages.progress.titleLabel")}</Label>
                      <Input id="entryTitle" value={title} onChange={e => setTitle(e.target.value)}
                        placeholder={
                          entryType === "gpa_update" ? t("pages.progress.ph_gpa") :
                          entryType === "certification" ? t("pages.progress.ph_cert") :
                          entryType === "opportunity" ? t("pages.progress.ph_opp") :
                          entryType === "milestone" ? t("pages.progress.ph_milestone") :
                          entryType === "achievement" ? t("pages.progress.ph_achievement") :
                          entryType === "setback" ? t("pages.progress.ph_setback") :
                          t("pages.progress.ph_note")
                        } />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="entryDesc">{t("pages.progress.detailsLabel")} <span className="text-slate-600 font-normal">{t("pages.progress.optional")}</span></Label>
                      <Textarea id="entryDesc" rows={3} value={description} onChange={e => setDescription(e.target.value)}
                        placeholder={t("pages.progress.detailsPlaceholder")} />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="entryDate">{t("pages.progress.dateLabel")}</Label>
                      <Input id="entryDate" type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="max-w-xs" />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <Button onClick={handleLogEntry} disabled={saving || !title.trim()} className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none">
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("pages.progress.savingDots")}</> : <><Plus className="h-4 w-4 mr-2" />{t("pages.progress.logAnalyze")}</>}
                      </Button>
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-indigo-400" />
                        {t("pages.progress.aiCheckPath", { uni: String(pathwayInfo?.pathway?.university ?? t("pages.progress.pathwayActiveFallback")) })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: TIMELINE ──────────────────────────────────────────────── */}
            {tab === "timeline" && (
              <div className="mb-12 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilterType("all")}
                    className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition",
                      filterType === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    )}>
                    {t("pages.progress.filterAll")} ({entries.length})
                  </button>
                  {(Object.entries(ENTRY_TYPES) as [EntryType, typeof ENTRY_TYPES[EntryType]][]).map(([type, cfg]) => {
                    const count = entries.filter(e => e.entryType === type).length;
                    if (count === 0) return null;
                    return (
                      <button key={type} onClick={() => setFilterType(type)}
                        className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition",
                          filterType === type ? cn("border", cfg.border, cfg.bg, cfg.color) : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}>
                        {t(cfg.labelKey)} ({count})
                      </button>
                    );
                  })}
                </div>

                {loadingEntries ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-indigo-400" /></div>
                ) : filteredEntries.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                    <Activity className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">{t("pages.progress.noUpdates")}</p>
                    <p className="text-slate-600 text-sm mt-1">{t("pages.progress.useLogTab")}</p>
                    <Button variant="outline" size="sm" onClick={() => setTab("log")} className="mt-4">
                      <Plus className="h-3.5 w-3.5 mr-1" />{t("pages.progress.logFirstUpdate")}
                    </Button>
                  </div>
                ) : (
                  <motion.div
                    className="space-y-3"
                    initial={prMotionOn ? "hidden" : false}
                    whileInView={prMotionOn ? "show" : undefined}
                    viewport={{ once: true, margin: "-50px" }}
                    variants={containerVariants}
                  >
                    {filteredEntries.map(entry => (
                      <motion.div
                        key={entry.id}
                        variants={itemVariants ?? fadeUp(6, DUR.base)}
                        whileHover={prMotionOn ? prLift : undefined}
                      >
                        <EntryCard entry={entry} onDelete={handleDelete} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* ── TAB: AI ASSESSMENT ─────────────────────────────────────────── */}
            {tab === "assessment" && (
              <div className="mb-12 space-y-5">
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-bold text-slate-900">{t("pages.progress.aiAssessment")}</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        {t("pages.progress.aiAssessmentBody", { uni: String(pathwayInfo?.pathway?.university ?? t("pages.progress.pathwayActiveFallback")), count: entries.length })}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {t("pages.progress.chip_courses")}</span>
                        <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {t("pages.progress.chip_guidebook")}</span>
                        <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {t("pages.progress.chip_updates", { count: entries.length })}</span>
                        <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {t("pages.progress.chip_admission")}</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {t("pages.progress.chip_riskFlags")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 items-center">
                    <Button onClick={handleGenerateAnalysis} disabled={generating} className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none">
                      {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("pages.progress.analyzingJourneyDots")}</> : <><Sparkles className="h-4 w-4 mr-2" />{analyses.length > 0 ? t("pages.progress.regenerateAssessment") : t("pages.progress.generateMyAssessment")}</>}
                    </Button>
                    <p className="text-xs text-slate-600">{t("pages.progress.rateLimit")}</p>
                  </div>
                  {generating && (
                    <div className="mt-4 bg-white/70 rounded-xl p-4 flex items-center gap-3 border border-indigo-100">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{t("pages.progress.analyzingJourney")}</p>
                        <p className="text-xs text-slate-600">{t("pages.progress.reviewingCourses", { count: entries.length })}</p>
                      </div>
                    </div>
                  )}
                </div>

                {loadingAnalyses ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-600" /></div>
                ) : analyses.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                    <BarChart3 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">{t("pages.progress.noAssessments")}</p>
                    <p className="text-slate-600 text-sm mt-1">{t("pages.progress.generateFirst")}</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-[220px_1fr] gap-5 items-start">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide px-1">{t("pages.progress.assessmentHistory")}</p>
                      <motion.div
                        className="space-y-2"
                        initial={prMotionOn ? "hidden" : false}
                        whileInView={prMotionOn ? "show" : undefined}
                        viewport={{ once: true, margin: "-50px" }}
                        variants={containerVariants}
                      >
                        {analyses.map(a => (
                          <motion.div
                            key={a.id}
                            variants={itemVariants ?? fadeUp(6, DUR.base)}
                            whileHover={prMotionOn ? prLift : undefined}
                          >
                            <AnalysisCard analysis={a} isActive={activeAnalysis?.id === a.id} onClick={() => setActiveAnalysis(a)} />
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                    {activeAnalysis && (
                      <div ref={analysisRef}>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <ScoreRing score={activeAnalysis.overallScore ?? 0} />
                            <div className="flex-1">
                              {activeAnalysis.summary && <p className="text-sm text-slate-600 leading-relaxed">{activeAnalysis.summary}</p>}
                              <p className="text-xs text-slate-600 mt-2">
                                {t("pages.progress.generatedAt", { date: new Date(activeAnalysis.createdAt).toLocaleDateString('en-US', { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) })}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={downloadAnalysis} className="flex-shrink-0">
                              <Download className="h-4 w-4 mr-1" />{t("pages.progress.download")}
                            </Button>
                          </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 md:px-10 py-8">
                          <MarkdownContent markdown={activeAnalysis.contentMarkdown ?? t("pages.progress.noContent")} setSection={setCurrentSection} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* ── TAB: PATHWAY HISTORY ───────────────────────────────────────── */}
            {tab === "history" && (
              <div className="mb-12">
                {loadingHistory ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-600" /></div>
                ) : (
                  <PathwayHistoryPanel
                    snapshots={pathwaySnapshots}
                    pathways={pathwayHistory}
                    profileId={pid}
                  />
                )}
              </div>
            )}
          </>
        )}

      </PageMotion>
    </AppPageLayout>
  );
}
