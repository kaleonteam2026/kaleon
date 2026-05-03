import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useTranslation } from "react-i18next";
import Nav from "@/components/nav";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MarkdownContent } from "@/components/markdown-renderer";
import { cn } from "@/lib/utils";
import { PageMotion } from "@/components/page-motion";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, useMotionEnabled, useDirSign, hoverLift, DUR } from "@/lib/motion";
import {
  TrendingUp, Plus, Loader2, Trash2, AlertTriangle, Download,
  GraduationCap, Award, Briefcase, CheckCircle2, Star, AlertCircle,
  FileText, BarChart3, Clock, Sparkles, Activity, Target, BookOpen,
  Lock, ArrowRight, CheckCheck, XCircle, Info, RefreshCcw, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type EntryType =
  | "gpa_update"
  | "certification"
  | "opportunity"
  | "milestone"
  | "achievement"
  | "setback"
  | "note";

interface ProgressEntry {
  id: number;
  entryType: EntryType;
  title: string;
  description?: string | null;
  entryDate?: string | null;
  numericValue?: number | null;
  createdAt: string;
}

interface EntryFeedback {
  aligned: boolean;
  alignmentScore: number;
  currentAdmissionChance: number;
  admissionImpactDelta: number;
  severity: "positive" | "caution" | "concern";
  heading: string;
  feedback: string;
  reconciliationSteps: string[];
  nextAlignedActions: string[];
  guidebookCheck: string;
}

interface ProgressAnalysis {
  id: number;
  contentMarkdown?: string | null;
  overallScore?: number | null;
  summary?: string | null;
  createdAt: string;
}

interface PathwayInfo {
  hasSelectedPathway: boolean;
  pathway: Record<string, unknown> | null;
}

// ─── Entry type config ────────────────────────────────────────────────────────
const ENTRY_TYPES: Record<EntryType, { labelKey: string; icon: React.ElementType; color: string; bg: string; border: string; descKey: string }> = {
  gpa_update:    { labelKey: "pages.progress.et_gpa_label",         icon: BarChart3,     color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",    descKey: "pages.progress.et_gpa_desc" },
  certification: { labelKey: "pages.progress.et_cert_label",        icon: Award,         color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   descKey: "pages.progress.et_cert_desc" },
  opportunity:   { labelKey: "pages.progress.et_opp_label",         icon: Briefcase,     color: "text-teal-700",    bg: "bg-teal-50",    border: "border-teal-200",    descKey: "pages.progress.et_opp_desc" },
  milestone:     { labelKey: "pages.progress.et_milestone_label",   icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", descKey: "pages.progress.et_milestone_desc" },
  achievement:   { labelKey: "pages.progress.et_achievement_label", icon: Star,          color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200",  descKey: "pages.progress.et_achievement_desc" },
  setback:       { labelKey: "pages.progress.et_setback_label",     icon: AlertCircle,   color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200",    descKey: "pages.progress.et_setback_desc" },
  note:          { labelKey: "pages.progress.et_note_label",        icon: FileText,      color: "text-slate-700",   bg: "bg-slate-50",   border: "border-slate-200",   descKey: "pages.progress.et_note_desc" },
};

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 75 ? t("pages.progress.onTrack") : score >= 50 ? t("pages.progress.needsAttention") : t("pages.progress.atRisk");
  const labelColor = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={reducedMotion ? undefined : { transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-800">{score}</span>
      </div>
      <div>
        <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-0.5">{t("pages.progress.trajectoryScore")}</p>
        <p className={cn("text-lg font-bold", labelColor)}>{label}</p>
        <p className="text-xs text-slate-600 mt-0.5">{t("pages.progress.outOf100")}</p>
      </div>
    </div>
  );
}

// ─── Admission chance badge ───────────────────────────────────────────────────
function AdmissionBadge({ chance, delta }: { chance: number; delta: number }) {
  const { t } = useTranslation();
  const color = chance >= 70 ? "bg-emerald-50 border-emerald-200 text-emerald-700"
    : chance >= 45 ? "bg-amber-50 border-amber-200 text-amber-700"
    : "bg-rose-50 border-rose-200 text-rose-700";
  const deltaColor = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-slate-600";
  const deltaPrefix = delta > 0 ? "+" : "";
  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-sm", color)}>
      <GraduationCap className="h-4 w-4" />
      <span>{t("pages.progress.admissionChanceLabel", { chance })}</span>
      {delta !== 0 && (
        <span className={cn("text-xs font-bold", deltaColor)}>
          {t("pages.progress.deltaFromUpdate", { prefix: deltaPrefix, delta })}
        </span>
      )}
    </div>
  );
}

// ─── Entry feedback card ──────────────────────────────────────────────────────
function EntryFeedbackCard({ feedback, onDismiss, entryTitle }: {
  feedback: EntryFeedback;
  onDismiss: () => void;
  entryTitle: string;
}) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const severityConfig = {
    positive: { bg: "bg-emerald-50", border: "border-emerald-300", icon: CheckCheck, iconColor: "text-emerald-600", label: t("pages.progress.alignedWithGuidebook"), labelBg: "bg-emerald-100 text-emerald-700" },
    caution:  { bg: "bg-amber-50",   border: "border-amber-300",   icon: Info,       iconColor: "text-amber-600",   label: t("pages.progress.reviewRecommended"),    labelBg: "bg-amber-100 text-amber-700" },
    concern:  { bg: "bg-rose-50",    border: "border-rose-300",    icon: XCircle,    iconColor: "text-rose-600",    label: t("pages.progress.needsAttentionLabel"),  labelBg: "bg-rose-100 text-rose-700" },
  };
  const cfg = severityConfig[feedback.severity];
  const Icon = cfg.icon;

  return (
    <div className={cn("rounded-2xl border-2 p-5 space-y-4 animate-in fade-in duration-300", reducedMotion ? "" : "slide-in-from-bottom-2", cfg.bg, cfg.border)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", cfg.bg, "border", cfg.border)}>
            <Icon className={cn("h-4 w-4", cfg.iconColor)} />
          </div>
          <div>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", cfg.labelBg)}>{cfg.label}</span>
            <p className="text-sm font-bold text-slate-800 mt-1">{feedback.heading}</p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-slate-600 hover:text-slate-600 text-lg leading-none flex-shrink-0 mt-0.5">×</button>
      </div>

      {/* Admission chance */}
      <AdmissionBadge chance={feedback.currentAdmissionChance} delta={feedback.admissionImpactDelta} />

      {/* Alignment score */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-600 text-xs">{t("pages.progress.guidebookAlignment")}</span>
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-32">
          <div
            className={cn("h-full rounded-full transition-all duration-700",
              feedback.alignmentScore >= 70 ? "bg-emerald-500" : feedback.alignmentScore >= 40 ? "bg-amber-500" : "bg-rose-500"
            )}
            style={{ width: `${feedback.alignmentScore}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-600">{feedback.alignmentScore}/100</span>
      </div>

      {/* Guidebook check */}
      <p className="text-xs text-slate-600 italic border-l-2 border-slate-300 pl-3">{feedback.guidebookCheck}</p>

      {/* Main feedback */}
      <p className="text-sm text-slate-700 leading-relaxed">{feedback.feedback}</p>

      {/* Action steps — label and color changes based on severity */}
      {feedback.reconciliationSteps.length > 0 && (() => {
        const stepConfig = feedback.severity === "positive"
          ? { label: t("pages.progress.waysToMaximize"), border: "border-emerald-200", labelColor: "text-emerald-700", arrowColor: "text-emerald-500", icon: TrendingUp }
          : feedback.severity === "caution"
          ? { label: t("pages.progress.alignmentSuggestions"), border: "border-amber-200", labelColor: "text-amber-700", arrowColor: "text-amber-500", icon: Info }
          : { label: t("pages.progress.caReconciliation"), border: "border-rose-200", labelColor: "text-rose-700", arrowColor: "text-rose-400", icon: RefreshCcw };
        const StepIcon = stepConfig.icon;
        return (
          <div className={cn("bg-white/80 rounded-xl border p-4", stepConfig.border)}>
            <p className={cn("text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1", stepConfig.labelColor)}>
              <StepIcon className="h-3 w-3" /> {stepConfig.label}
            </p>
            <ul className="space-y-2">
              {feedback.reconciliationSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <ChevronRight className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", stepConfig.arrowColor)} />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Next aligned actions */}
      {feedback.nextAlignedActions.length > 0 && (
        <div className="bg-white/80 rounded-xl border border-emerald-200 p-4">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> {t("pages.progress.nextStepsGuidebook")}
          </p>
          <ul className="space-y-2">
            {feedback.nextAlignedActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <ArrowRight className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={onDismiss} className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" />{t("pages.progress.logAnotherUpdate")}
      </Button>
    </div>
  );
}

// ─── Timeline entry card ──────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }: { entry: ProgressEntry; onDelete: (id: number) => void }) {
  const { t } = useTranslation();
  const cfg = ENTRY_TYPES[entry.entryType] ?? ENTRY_TYPES.note;
  const Icon = cfg.icon;
  const [deleting, setDeleting] = useState(false);
  return (
    <div className={cn("relative flex gap-3 p-4 rounded-xl border bg-white shadow-sm transition-all hover:shadow", cfg.border)}>
      <div className={cn("flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center", cfg.bg)}>
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-full border", cfg.bg, cfg.color, cfg.border)}>{t(cfg.labelKey)}</span>
            <p className="mt-1 text-sm font-semibold text-slate-800 leading-tight">{entry.title}</p>
            {entry.numericValue != null && (
              <p className="text-xs text-slate-600 mt-0.5">{t("pages.progress.gpaLabel")} <strong className="text-slate-800">{entry.numericValue.toFixed(2)}</strong></p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {entry.entryDate && (
              <span className="text-xs text-slate-600 flex items-center gap-1"><Clock className="h-3 w-3" />{entry.entryDate}</span>
            )}
            <button
              onClick={async () => { setDeleting(true); await onDelete(entry.id); setDeleting(false); }}
              disabled={deleting}
              className="text-slate-300 hover:text-rose-400 transition p-0.5"
              title={t("pages.progress.deleteEntry")}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        {entry.description && <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{entry.description}</p>}
      </div>
    </div>
  );
}

// ─── Analysis history card ────────────────────────────────────────────────────
function AnalysisCard({ analysis, isActive, onClick }: { analysis: ProgressAnalysis; isActive: boolean; onClick: () => void }) {
  const { i18n } = useTranslation();
  const score = analysis.overallScore ?? 0;
  const color = score >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-rose-600 bg-rose-50 border-rose-200";
  return (
    <button
      onClick={onClick}
      className={cn("w-full text-left p-3 rounded-xl border transition-all",
        isActive ? "border-indigo-400 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-600">
          {new Date(analysis.createdAt).toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", color)}>{score}/100</span>
      </div>
      {analysis.summary && <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">{analysis.summary}</p>}
    </button>
  );
}

// ─── Pathway lock screen ──────────────────────────────────────────────────────
function PathwayLockScreen({ profileId }: { profileId: number }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center mb-5">
        <Lock className="h-9 w-9 text-slate-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">{t("pages.progress.selectPathwayFirst")}</h2>
      <p className="text-slate-600 max-w-md leading-relaxed mb-2">
        {t("pages.progress.pathwayLockBody")}
      </p>
      <p className="text-sm text-slate-600 mb-8">{t("pages.progress.goToPathway")}</p>
      <Link href={`/pathways/${profileId}`}>
        <Button className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none gap-2">
          <Target className="h-4 w-4" />
          {t("pages.progress.goToMyPathway")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm text-center">
        {[
          { icon: GraduationCap, labelKey: "pages.progress.lockFeat_admission", color: "text-indigo-500" },
          { icon: BookOpen,      labelKey: "pages.progress.lockFeat_guidebook", color: "text-violet-500" },
          { icon: TrendingUp,    labelKey: "pages.progress.lockFeat_trajectory", color: "text-emerald-500" },
        ].map(({ icon: Icon, labelKey, color }) => (
          <div key={labelKey} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <Icon className={cn("h-5 w-5 mx-auto mb-1.5", color)} />
            <p className="text-xs text-slate-600 font-medium">{t(labelKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab = "log" | "timeline" | "assessment";

export default function ProgressTracker() {
  const prMotionOn = useMotionEnabled();
  const prDir = useDirSign();
  const prLift = hoverLift(prDir);
  const { t, i18n } = useTranslation();
  const { profileId } = useParams<{ profileId: string }>();
  const { toast } = useToast();
  const pid = parseInt(profileId);

  // Pathway gate
  const [pathwayInfo, setPathwayInfo] = useState<PathwayInfo | null>(null);
  const [pathwayLoading, setPathwayLoading] = useState(true);

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
  const analysisRef = useRef<HTMLDivElement>(null);

  // Load pathway gate + data
  useEffect(() => {
    fetch(`/api/profiles/${pid}/progress/selected-pathway`, { credentials: "include" })
      .then(r => r.json())
      .then((info: PathwayInfo) => setPathwayInfo(info))
      .catch(() => setPathwayInfo({ hasSelectedPathway: false, pathway: null }))
      .finally(() => setPathwayLoading(false));

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
    return (
      <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
        <Nav profileId={pid} />
        <div className="pt-14 flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <Nav profileId={pid} />
      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none px-4 md:px-8 max-w-4xl mx-auto">

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
        {/* ── PATHWAY LOCK ─────────────────────────────────────────────────────── */}
        {!pathwayInfo?.hasSelectedPathway ? (
          <PathwayLockScreen profileId={pid} />
        ) : (
          <>
            {/* Quick stats strip */}
            {entries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-blue-600">{latestGpa != null ? latestGpa.toFixed(2) : "—"}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{t("pages.progress.latestGpa")}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-amber-600">{certCount}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{t("pages.progress.certifications")}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-teal-600">{oppCount}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{t("pages.progress.opportunities")}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-slate-900">{achievementCount}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{t("pages.progress.achievements")}</p>
                </div>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200">
              {([
                { id: "log",        label: t("pages.progress.tab_log"),        icon: Plus,      badge: undefined as number | undefined },
                { id: "timeline",   label: t("pages.progress.tab_timeline"),   icon: Activity,  badge: entries.length as number | undefined },
                { id: "assessment", label: t("pages.progress.tab_assessment"), icon: Sparkles,  badge: analyses.length as number | undefined },
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
                      <Button onClick={handleLogEntry} disabled={saving || !title.trim()} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
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
                    variants={prMotionOn ? staggerContainer(0.04) : undefined}
                  >
                    {filteredEntries.map(entry => (
                      <motion.div
                        key={entry.id}
                        variants={prMotionOn ? fadeUp(6, DUR.base) : undefined}
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
                    <Button onClick={handleGenerateAnalysis} disabled={generating} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
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
                        variants={prMotionOn ? staggerContainer(0.04) : undefined}
                      >
                        {analyses.map(a => (
                          <motion.div
                            key={a.id}
                            variants={prMotionOn ? fadeUp(6, DUR.base) : undefined}
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
                                {t("pages.progress.generatedAt", { date: new Date(activeAnalysis.createdAt).toLocaleDateString(i18n.language, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) })}
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
          </>
        )}

        <p className="text-xs text-slate-600 text-center pb-10">
          {t("pages.progress.footerDisclaimer")}
        </p>
        </PageMotion>
      </main>
    </div>
  );
}
