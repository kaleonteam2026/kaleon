import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MarkdownContent } from "@/components/markdown-renderer";
import { cn } from "@/lib/utils";
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
const ENTRY_TYPES: Record<EntryType, { label: string; icon: React.ElementType; color: string; bg: string; border: string; description: string }> = {
  gpa_update:    { label: "GPA Update",    icon: BarChart3,     color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",    description: "Log a semester or cumulative GPA" },
  certification: { label: "Certification", icon: Award,         color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   description: "A certificate or credential earned" },
  opportunity:   { label: "Opportunity",   icon: Briefcase,     color: "text-teal-700",    bg: "bg-teal-50",    border: "border-teal-200",    description: "Club joined, research, internship, etc." },
  milestone:     { label: "Milestone",     icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", description: "Transfer checklist item or program completed" },
  achievement:   { label: "Achievement",   icon: Star,          color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200",  description: "Award, honor, Dean's List, etc." },
  setback:       { label: "Setback",       icon: AlertCircle,   color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200",    description: "Grade concern, dropped class, etc." },
  note:          { label: "Note",          icon: FileText,      color: "text-slate-700",   bg: "bg-slate-50",   border: "border-slate-200",   description: "General note or reflection" },
};

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 75 ? "On Track" : score >= 50 ? "Needs Attention" : "At Risk";
  const labelColor = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-800">{score}</span>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5">Trajectory Score</p>
        <p className={cn("text-lg font-bold", labelColor)}>{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">out of 100 points</p>
      </div>
    </div>
  );
}

// ─── Admission chance badge ───────────────────────────────────────────────────
function AdmissionBadge({ chance, delta }: { chance: number; delta: number }) {
  const color = chance >= 70 ? "bg-emerald-50 border-emerald-200 text-emerald-700"
    : chance >= 45 ? "bg-amber-50 border-amber-200 text-amber-700"
    : "bg-rose-50 border-rose-200 text-rose-700";
  const deltaColor = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-slate-400";
  const deltaPrefix = delta > 0 ? "+" : "";
  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-sm", color)}>
      <GraduationCap className="h-4 w-4" />
      <span>{chance}% est. admission chance</span>
      {delta !== 0 && (
        <span className={cn("text-xs font-bold", deltaColor)}>
          ({deltaPrefix}{delta}% from this update)
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
  const severityConfig = {
    positive: { bg: "bg-emerald-50", border: "border-emerald-300", icon: CheckCheck, iconColor: "text-emerald-600", label: "Aligned with Guidebook", labelBg: "bg-emerald-100 text-emerald-700" },
    caution:  { bg: "bg-amber-50",   border: "border-amber-300",   icon: Info,       iconColor: "text-amber-600",   label: "Review Recommended",    labelBg: "bg-amber-100 text-amber-700" },
    concern:  { bg: "bg-rose-50",    border: "border-rose-300",    icon: XCircle,    iconColor: "text-rose-600",    label: "Needs Attention",        labelBg: "bg-rose-100 text-rose-700" },
  };
  const cfg = severityConfig[feedback.severity];
  const Icon = cfg.icon;

  return (
    <div className={cn("rounded-2xl border-2 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300", cfg.bg, cfg.border)}>
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
        <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 text-lg leading-none flex-shrink-0 mt-0.5">×</button>
      </div>

      {/* Admission chance */}
      <AdmissionBadge chance={feedback.currentAdmissionChance} delta={feedback.admissionImpactDelta} />

      {/* Alignment score */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500 text-xs">Guidebook alignment:</span>
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
          ? { label: "Ways to Maximize This", border: "border-emerald-200", labelColor: "text-emerald-700", arrowColor: "text-emerald-500", icon: TrendingUp }
          : feedback.severity === "caution"
          ? { label: "Alignment Suggestions", border: "border-amber-200", labelColor: "text-amber-700", arrowColor: "text-amber-500", icon: Info }
          : { label: "California Reconciliation Options", border: "border-rose-200", labelColor: "text-rose-700", arrowColor: "text-rose-400", icon: RefreshCcw };
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
            <BookOpen className="h-3 w-3" /> Next Steps per Your Guidebook
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
        <Plus className="h-3.5 w-3.5 mr-1" />Log Another Update
      </Button>
    </div>
  );
}

// ─── Timeline entry card ──────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }: { entry: ProgressEntry; onDelete: (id: number) => void }) {
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
            <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-full border", cfg.bg, cfg.color, cfg.border)}>{cfg.label}</span>
            <p className="mt-1 text-sm font-semibold text-slate-800 leading-tight">{entry.title}</p>
            {entry.numericValue != null && (
              <p className="text-xs text-slate-500 mt-0.5">GPA: <strong className="text-slate-800">{entry.numericValue.toFixed(2)}</strong></p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {entry.entryDate && (
              <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" />{entry.entryDate}</span>
            )}
            <button
              onClick={async () => { setDeleting(true); await onDelete(entry.id); setDeleting(false); }}
              disabled={deleting}
              className="text-slate-300 hover:text-rose-400 transition p-0.5"
              title="Delete entry"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        {entry.description && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{entry.description}</p>}
      </div>
    </div>
  );
}

// ─── Analysis history card ────────────────────────────────────────────────────
function AnalysisCard({ analysis, isActive, onClick }: { analysis: ProgressAnalysis; isActive: boolean; onClick: () => void }) {
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
        <span className="text-xs text-slate-500">
          {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", color)}>{score}/100</span>
      </div>
      {analysis.summary && <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">{analysis.summary}</p>}
    </button>
  );
}

// ─── Pathway lock screen ──────────────────────────────────────────────────────
function PathwayLockScreen({ profileId }: { profileId: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center mb-5">
        <Lock className="h-9 w-9 text-slate-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Select Your Pathway First</h2>
      <p className="text-slate-500 max-w-md leading-relaxed mb-2">
        The Progress Tracker is activated once you've committed to a transfer pathway. Your AI advisor needs to know your target university and guidebook before it can evaluate your updates and predict your admission chances.
      </p>
      <p className="text-sm text-slate-400 mb-8">Go to your Pathway tab, review your university matches, and select the one you're targeting.</p>
      <Link href={`/pathways/${profileId}`}>
        <Button className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none gap-2">
          <Target className="h-4 w-4" />
          Go to My Pathway
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm text-center">
        {[
          { icon: GraduationCap, label: "Admission prediction", color: "text-indigo-500" },
          { icon: BookOpen,      label: "Guidebook alignment",  color: "text-violet-500" },
          { icon: TrendingUp,    label: "Live trajectory score", color: "text-emerald-500" },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <Icon className={cn("h-5 w-5 mx-auto mb-1.5", color)} />
            <p className="text-xs text-slate-500 font-medium">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab = "log" | "timeline" | "assessment";

export default function ProgressTracker() {
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
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
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
      toast({ title: "Update logged! Analyzing with AI…", description: "Checking alignment with your guidebook." });

      fetch(`/api/profiles/${pid}/progress/entry-feedback`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id }), credentials: "include",
      })
        .then(r => r.json())
        .then((fb: EntryFeedback) => setPendingFeedback({ loading: false, data: fb, entryTitle: loggedTitle }))
        .catch(() => {
          setPendingFeedback({ loading: false, data: null, entryTitle: loggedTitle });
          toast({ title: "Could not load AI feedback", variant: "destructive" });
        });
    } catch {
      toast({ title: "Error saving entry", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId: number) => {
    try {
      await fetch(`/api/progress/${entryId}`, { method: "DELETE", credentials: "include" });
      setEntries(prev => prev.filter(e => e.id !== entryId));
      toast({ title: "Entry deleted" });
    } catch {
      toast({ title: "Error deleting entry", variant: "destructive" });
    }
  };

  const handleGenerateAnalysis = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`/api/profiles/${pid}/progress/analyze`, { method: "POST", credentials: "include" });
      if (r.status === 429) { toast({ title: "Rate limit reached", description: "Up to 5 analyses per hour.", variant: "destructive" }); return; }
      if (!r.ok) throw new Error();
      const analysis = await r.json() as ProgressAnalysis;
      setAnalyses(prev => [analysis, ...prev]);
      setActiveAnalysis(analysis);
      toast({ title: "Assessment ready!" });
      setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      toast({ title: "Error generating assessment", variant: "destructive" });
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
      <main className="pt-14 pb-20 md:pb-8 px-4 md:px-8 max-w-4xl mx-auto">

        {/* Page header */}
        <div className="py-7">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">My Progress Tracker</h1>
            {pathwayInfo?.hasSelectedPathway && (
              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {String(pathwayInfo.pathway?.university ?? "Pathway Active")}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm">
            Log certifications, GPA updates, opportunities, and milestones. Your AI advisor checks every update against your guidebook and predicts your updated admission chances in real time.
          </p>
        </div>

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
                  <p className="text-xs text-slate-500 mt-0.5">Latest GPA</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-amber-600">{certCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Certifications</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-teal-600">{oppCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Opportunities</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-slate-900">{achievementCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Achievements</p>
                </div>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200">
              {([
                { id: "log",        label: "Log Update",    icon: Plus,      badge: undefined as number | undefined },
                { id: "timeline",   label: "My Timeline",   icon: Activity,  badge: entries.length as number | undefined },
                { id: "assessment", label: "AI Assessment", icon: Sparkles,  badge: analyses.length as number | undefined },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as Tab)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    tab === t.id ? "bg-white text-indigo-700 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.badge !== undefined && t.badge > 0 && (
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-semibold",
                      tab === t.id ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-600"
                    )}>{t.badge}</span>
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
                          <p className="text-sm font-semibold text-indigo-800">Checking against your guidebook…</p>
                          <p className="text-xs text-indigo-500 mt-0.5">Analyzing alignment and predicting admission impact for "{pendingFeedback.entryTitle}"</p>
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
                      <h2 className="text-base font-bold text-slate-900 mb-1">Log a Progress Update</h2>
                      <p className="text-xs text-slate-400">Every entry is checked against your <strong className="text-slate-600">{String(pathwayInfo?.pathway?.university ?? "selected university")}</strong> guidebook in real time.</p>
                    </div>

                    {/* Entry type grid */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">What are you logging?</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {(Object.entries(ENTRY_TYPES) as [EntryType, typeof ENTRY_TYPES[EntryType]][]).map(([type, cfg]) => {
                          const Icon = cfg.icon;
                          const active = entryType === type;
                          return (
                            <button key={type} type="button" onClick={() => setEntryType(type)}
                              className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                                active ? cn("border-2 shadow-sm", cfg.border, cfg.bg) : "border-slate-200 bg-white hover:border-slate-300"
                              )}>
                              <Icon className={cn("h-5 w-5", active ? cfg.color : "text-slate-400")} />
                              <span className={cn("text-xs font-semibold leading-tight", active ? cfg.color : "text-slate-600")}>{cfg.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-400">{ENTRY_TYPES[entryType].description}</p>
                    </div>

                    {entryType === "gpa_update" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="gpaValue">GPA Value</Label>
                        <Input id="gpaValue" type="number" min="0" max="4" step="0.01"
                          value={numericValue} onChange={e => setNumericValue(e.target.value)}
                          placeholder="e.g. 3.75" className="max-w-xs" />
                        <p className="text-xs text-slate-400">0.00 – 4.00. The AI will compare this against your pathway's GPA requirements.</p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="entryTitle">{entryType === "gpa_update" ? "Semester / Term" : "Title"}</Label>
                      <Input id="entryTitle" value={title} onChange={e => setTitle(e.target.value)}
                        placeholder={
                          entryType === "gpa_update" ? "e.g. Fall 2025 GPA" :
                          entryType === "certification" ? "e.g. AWS Cloud Practitioner" :
                          entryType === "opportunity" ? "e.g. Joined Psychology Research Lab" :
                          entryType === "milestone" ? "e.g. Completed IGETC Area 1A" :
                          entryType === "achievement" ? "e.g. Dean's List — Spring 2025" :
                          entryType === "setback" ? "e.g. Received C in MATH 2" :
                          "e.g. Met with transfer counselor"
                        } />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="entryDesc">Details <span className="text-slate-400 font-normal">(optional)</span></Label>
                      <Textarea id="entryDesc" rows={3} value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Add context — the AI uses this to give you more precise guidebook alignment feedback…" />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="entryDate">Date</Label>
                      <Input id="entryDate" type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="max-w-xs" />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <Button onClick={handleLogEntry} disabled={saving || !title.trim()} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : <><Plus className="h-4 w-4 mr-2" />Log & Analyze</>}
                      </Button>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-indigo-400" />
                        AI will check this against your {String(pathwayInfo?.pathway?.university ?? "university")} guidebook instantly
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
                    All ({entries.length})
                  </button>
                  {(Object.entries(ENTRY_TYPES) as [EntryType, typeof ENTRY_TYPES[EntryType]][]).map(([type, cfg]) => {
                    const count = entries.filter(e => e.entryType === type).length;
                    if (count === 0) return null;
                    return (
                      <button key={type} onClick={() => setFilterType(type)}
                        className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition",
                          filterType === type ? cn("border", cfg.border, cfg.bg, cfg.color) : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}>
                        {cfg.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {loadingEntries ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-indigo-400" /></div>
                ) : filteredEntries.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                    <Activity className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No updates logged yet</p>
                    <p className="text-slate-400 text-sm mt-1">Use the Log Update tab to start tracking your progress.</p>
                    <Button variant="outline" size="sm" onClick={() => setTab("log")} className="mt-4">
                      <Plus className="h-3.5 w-3.5 mr-1" />Log Your First Update
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEntries.map(entry => (
                      <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
                    ))}
                  </div>
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
                      <h2 className="text-base font-bold text-slate-900">AI Live Progress Assessment</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Your AI advisor reviews your full profile, courses, <strong>{String(pathwayInfo?.pathway?.university ?? "selected university")}</strong> guidebook, and all {entries.length} logged updates to predict your admission chances and give precise next steps.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Courses</span>
                        <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Guidebook</span>
                        <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {entries.length} updates</span>
                        <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Admission prediction</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Risk flags</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 items-center">
                    <Button onClick={handleGenerateAnalysis} disabled={generating} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
                      {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyzing your journey…</> : <><Sparkles className="h-4 w-4 mr-2" />{analyses.length > 0 ? "Regenerate Assessment" : "Generate My Assessment"}</>}
                    </Button>
                    <p className="text-xs text-slate-400">Up to 5 assessments per hour</p>
                  </div>
                  {generating && (
                    <div className="mt-4 bg-white/70 rounded-xl p-4 flex items-center gap-3 border border-indigo-100">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Analyzing your full journey…</p>
                        <p className="text-xs text-slate-400">Reviewing courses, guidebook, and {entries.length} logged updates. This takes 20–40 seconds.</p>
                      </div>
                    </div>
                  )}
                </div>

                {loadingAnalyses ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                ) : analyses.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                    <BarChart3 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No assessments yet</p>
                    <p className="text-slate-400 text-sm mt-1">Generate your first AI progress assessment above.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-[220px_1fr] gap-5 items-start">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Assessment History</p>
                      {analyses.map(a => (
                        <AnalysisCard key={a.id} analysis={a} isActive={activeAnalysis?.id === a.id} onClick={() => setActiveAnalysis(a)} />
                      ))}
                    </div>
                    {activeAnalysis && (
                      <div ref={analysisRef}>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <ScoreRing score={activeAnalysis.overallScore ?? 0} />
                            <div className="flex-1">
                              {activeAnalysis.summary && <p className="text-sm text-slate-600 leading-relaxed">{activeAnalysis.summary}</p>}
                              <p className="text-xs text-slate-400 mt-2">
                                Generated {new Date(activeAnalysis.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={downloadAnalysis} className="flex-shrink-0">
                              <Download className="h-4 w-4 mr-1" />Download
                            </Button>
                          </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 md:px-10 py-8">
                          <MarkdownContent markdown={activeAnalysis.contentMarkdown ?? "No content available."} setSection={setCurrentSection} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <p className="text-xs text-slate-400 text-center pb-10">
          DYP Progress Tracker · AI assessments are not a substitute for official academic advising
        </p>
      </main>
    </div>
  );
}
