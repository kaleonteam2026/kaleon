import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
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
  FileText, BarChart3, Clock, ChevronDown, ChevronUp, Sparkles,
  Activity, Target, BookOpen,
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

interface ProgressAnalysis {
  id: number;
  contentMarkdown?: string | null;
  overallScore?: number | null;
  summary?: string | null;
  createdAt: string;
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

// ─── Score ring component ─────────────────────────────────────────────────────
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
          <circle
            cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-800">
          {score}
        </span>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5">Trajectory Score</p>
        <p className={cn("text-lg font-bold", labelColor)}>{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">out of 100 points</p>
      </div>
    </div>
  );
}

// ─── Timeline entry card ──────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }: { entry: ProgressEntry; onDelete: (id: number) => void }) {
  const cfg = ENTRY_TYPES[entry.entryType] ?? ENTRY_TYPES.note;
  const Icon = cfg.icon;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(entry.id);
    setDeleting(false);
  };

  return (
    <div className={cn("relative flex gap-3 p-4 rounded-xl border bg-white shadow-sm transition-all hover:shadow", cfg.border)}>
      <div className={cn("flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center", cfg.bg)}>
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-full border", cfg.bg, cfg.color, cfg.border)}>
              {cfg.label}
            </span>
            <p className="mt-1 text-sm font-semibold text-slate-800 leading-tight">{entry.title}</p>
            {entry.numericValue != null && (
              <p className="text-xs text-slate-500 mt-0.5">
                GPA: <strong className="text-slate-800">{entry.numericValue.toFixed(2)}</strong>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {entry.entryDate && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />{entry.entryDate}
              </span>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-slate-300 hover:text-rose-400 transition p-0.5"
              title="Delete entry"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        {entry.description && (
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{entry.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Analysis history card ────────────────────────────────────────────────────
function AnalysisCard({
  analysis,
  isActive,
  onClick,
}: {
  analysis: ProgressAnalysis;
  isActive: boolean;
  onClick: () => void;
}) {
  const score = analysis.overallScore ?? 0;
  const color = score >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-rose-600 bg-rose-50 border-rose-200";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl border transition-all",
        isActive ? "border-indigo-400 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">
          {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", color)}>
          {score}/100
        </span>
      </div>
      {analysis.summary && (
        <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">{analysis.summary}</p>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab = "log" | "timeline" | "assessment";

export default function ProgressTracker() {
  const { profileId } = useParams<{ profileId: string }>();
  const { toast } = useToast();
  const pid = parseInt(profileId);

  // Tab
  const [tab, setTab] = useState<Tab>("log");

  // Log form
  const [entryType, setEntryType] = useState<EntryType>("gpa_update");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [numericValue, setNumericValue] = useState("");
  const [saving, setSaving] = useState(false);

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

  // Load data
  useEffect(() => {
    fetch(`/api/profiles/${pid}/progress`, { credentials: "include" })
      .then(r => r.json())
      .then((e: ProgressEntry[]) => setEntries(e))
      .catch(() => {})
      .finally(() => setLoadingEntries(false));

    fetch(`/api/profiles/${pid}/progress/analyses`, { credentials: "include" })
      .then(r => r.json())
      .then((a: ProgressAnalysis[]) => {
        setAnalyses(a);
        if (a.length > 0) setActiveAnalysis(a[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingAnalyses(false));
  }, [pid]);

  const handleLogEntry = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        entryType,
        title: title.trim(),
        description: description.trim() || undefined,
        entryDate: entryDate || undefined,
        numericValue: entryType === "gpa_update" && numericValue ? parseFloat(numericValue) : undefined,
      };
      const r = await fetch(`/api/profiles/${pid}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!r.ok) throw new Error();
      const entry = await r.json() as ProgressEntry;
      setEntries(prev => [entry, ...prev]);
      setTitle("");
      setDescription("");
      setNumericValue("");
      toast({ title: "Update logged!", description: "Your progress has been recorded." });
      setTab("timeline");
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
      const r = await fetch(`/api/profiles/${pid}/progress/analyze`, {
        method: "POST",
        credentials: "include",
      });
      if (r.status === 429) {
        toast({ title: "Rate limit reached", description: "Up to 5 analyses per hour.", variant: "destructive" });
        return;
      }
      if (!r.ok) throw new Error();
      const analysis = await r.json() as ProgressAnalysis;
      setAnalyses(prev => [analysis, ...prev]);
      setActiveAnalysis(analysis);
      toast({ title: "Assessment ready!", description: "Your live progress analysis has been generated." });
      setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      toast({ title: "Error generating assessment", description: "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const downloadAnalysis = () => {
    if (!activeAnalysis?.contentMarkdown) return;
    const blob = new Blob([activeAnalysis.contentMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pathwise-progress-${activeAnalysis.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEntries = filterType === "all" ? entries : entries.filter(e => e.entryType === filterType);

  // Quick stats
  const gpaEntries = entries.filter(e => e.entryType === "gpa_update" && e.numericValue != null).sort((a, b) => (a.entryDate ?? "").localeCompare(b.entryDate ?? ""));
  const latestGpa = gpaEntries.length > 0 ? gpaEntries[gpaEntries.length - 1].numericValue : null;
  const certCount = entries.filter(e => e.entryType === "certification").length;
  const oppCount = entries.filter(e => e.entryType === "opportunity").length;
  const achievementCount = entries.filter(e => e.entryType === "achievement").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav profileId={pid} />
      <main className="pt-14 px-4 md:px-8 max-w-4xl mx-auto">

        {/* Page header */}
        <div className="py-7">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">My Progress Tracker</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Log certifications, GPA updates, opportunities, and milestones. Your AI advisor analyzes everything and updates your trajectory in real time.
          </p>
        </div>

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
              <p className="text-2xl font-bold text-violet-600">{achievementCount}</p>
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
                tab === t.id
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                  tab === t.id ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-600"
                )}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: LOG UPDATE ──────────────────────────────────────────────────── */}
        {tab === "log" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6 mb-12">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Log a Progress Update</h2>
              <p className="text-xs text-slate-400">Every entry feeds your AI assessment. The more you log, the more accurate your trajectory analysis becomes.</p>
            </div>

            {/* Entry type selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">What are you logging?</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {(Object.entries(ENTRY_TYPES) as [EntryType, typeof ENTRY_TYPES[EntryType]][]).map(([type, cfg]) => {
                  const Icon = cfg.icon;
                  const active = entryType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEntryType(type)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                        active
                          ? cn("border-2 shadow-sm", cfg.border, cfg.bg)
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", active ? cfg.color : "text-slate-400")} />
                      <span className={cn("text-xs font-semibold leading-tight", active ? cfg.color : "text-slate-600")}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">{ENTRY_TYPES[entryType].description}</p>
            </div>

            {/* GPA value */}
            {entryType === "gpa_update" && (
              <div className="space-y-1.5">
                <Label htmlFor="gpaValue">GPA Value</Label>
                <Input
                  id="gpaValue"
                  type="number"
                  min="0" max="4" step="0.01"
                  value={numericValue}
                  onChange={e => setNumericValue(e.target.value)}
                  placeholder="e.g. 3.75"
                  className="max-w-xs"
                />
                <p className="text-xs text-slate-400">Enter your semester GPA or updated cumulative GPA (0.00 – 4.00)</p>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="entryTitle">
                {entryType === "gpa_update" ? "Semester / Term" : "Title"}
              </Label>
              <Input
                id="entryTitle"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={
                  entryType === "gpa_update" ? "e.g. Fall 2025 GPA" :
                  entryType === "certification" ? "e.g. AWS Cloud Practitioner" :
                  entryType === "opportunity" ? "e.g. Joined Psychology Research Lab" :
                  entryType === "milestone" ? "e.g. Completed IGETC Area 1A" :
                  entryType === "achievement" ? "e.g. Dean's List — Spring 2025" :
                  entryType === "setback" ? "e.g. Received C in MATH 2" :
                  "e.g. Met with transfer counselor"
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="entryDesc">Details <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Textarea
                id="entryDesc"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add any additional context — what you learned, next steps, or how this connects to your goals…"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="entryDate">Date</Label>
              <Input
                id="entryDate"
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <Button
              onClick={handleLogEntry}
              disabled={saving || !title.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" />Log This Update</>
              )}
            </Button>
          </div>
        )}

        {/* ── TAB: TIMELINE ────────────────────────────────────────────────────── */}
        {tab === "timeline" && (
          <div className="mb-12 space-y-4">
            {/* Filter chips */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType("all")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold border transition",
                  filterType === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                )}
              >
                All ({entries.length})
              </button>
              {(Object.entries(ENTRY_TYPES) as [EntryType, typeof ENTRY_TYPES[EntryType]][]).map(([type, cfg]) => {
                const count = entries.filter(e => e.entryType === type).length;
                if (count === 0) return null;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold border transition",
                      filterType === type
                        ? cn("border", cfg.border, cfg.bg, cfg.color)
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {cfg.label} ({count})
                  </button>
                );
              })}
            </div>

            {loadingEntries ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
              </div>
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

        {/* ── TAB: AI ASSESSMENT ───────────────────────────────────────────────── */}
        {tab === "assessment" && (
          <div className="mb-12 space-y-5">

            {/* Generate panel */}
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-slate-900">AI Live Progress Assessment</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Your AI advisor analyzes your logged updates, course history, selected pathway, and profile to produce a comprehensive, real-time evaluation of where you stand — and exactly what to do next.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Pulls your courses</span>
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Checks your pathway</span>
                    <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Analyzes {entries.length} logged updates</span>
                    <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Returns tailored next steps</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <Button
                  onClick={handleGenerateAnalysis}
                  disabled={generating}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyzing your journey…</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />{analyses.length > 0 ? "Regenerate Assessment" : "Generate My Assessment"}</>
                  )}
                </Button>
                {entries.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Log some updates first for a more accurate assessment
                  </p>
                )}
                <p className="text-xs text-slate-400">Up to 5 assessments per hour</p>
              </div>

              {generating && (
                <div className="mt-4 bg-white/70 rounded-xl p-4 flex items-center gap-3 border border-indigo-100">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Analyzing your full journey…</p>
                    <p className="text-xs text-slate-400">Reviewing courses, pathway, and {entries.length} logged updates. This takes 20–40 seconds.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Past assessments sidebar + active content */}
            {loadingAnalyses ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : analyses.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <BarChart3 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No assessments yet</p>
                <p className="text-slate-400 text-sm mt-1">Generate your first AI progress assessment above.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-[220px_1fr] gap-5 items-start">
                {/* Sidebar: history */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Assessment History</p>
                  {analyses.map(a => (
                    <AnalysisCard
                      key={a.id}
                      analysis={a}
                      isActive={activeAnalysis?.id === a.id}
                      onClick={() => setActiveAnalysis(a)}
                    />
                  ))}
                </div>

                {/* Main content */}
                {activeAnalysis && (
                  <div ref={analysisRef}>
                    {/* Score header */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <ScoreRing score={activeAnalysis.overallScore ?? 0} />
                        <div className="flex-1">
                          {activeAnalysis.summary && (
                            <p className="text-sm text-slate-600 leading-relaxed">{activeAnalysis.summary}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">
                            Generated {new Date(activeAnalysis.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={downloadAnalysis} className="flex-shrink-0">
                          <Download className="h-4 w-4 mr-1" />Download
                        </Button>
                      </div>
                    </div>

                    {/* Full markdown report */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 md:px-10 py-8">
                      <MarkdownContent
                        markdown={activeAnalysis.contentMarkdown ?? "No content available."}
                        setSection={setCurrentSection}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom disclaimer */}
        <p className="text-xs text-slate-400 text-center pb-10">
          Pathwise CC Progress Tracker · All data is private to your account · AI assessments are not a substitute for official academic advising
        </p>
      </main>
    </div>
  );
}
