import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Loader2, ArrowRight, BookOpen, TrendingUp,
  FlaskConical, CheckCircle2, AlertCircle, HelpCircle, XCircle,
  Star, ExternalLink, ChevronDown, ChevronUp, School,
} from "lucide-react";

interface Course {
  id: number;
  courseCode?: string;
  courseName: string;
  units?: number;
  grade?: string;
  status?: string;
  term?: string;
}

interface GpaSummary {
  estimatedGpa: number;
  totalUnits: number;
  completedUnits: number;
  inProgressUnits: number;
  courseCount: number;
}

// ─── Transferability types ────────────────────────────────────────────────────
interface CourseTransferResult {
  courseCode?: string;
  courseName: string;
  units: number;
  status: "transferable" | "likely" | "uncertain" | "unlikely";
  igetcArea?: string;
  csuGEArea?: string;
  assistNote: string;
}

interface UniversityMatch {
  university: string;
  system: string;
  matchScore: number;
  matchReason: string;
  transferableCount: number;
  totalCourses: number;
}

interface IgetcSummary {
  area1AEnglish: boolean;
  area1BCriticalThinking: boolean;
  area2Math: boolean;
  area3Arts: boolean;
  area4Social: boolean;
  area5Science: boolean;
  area6Language: boolean;
  completedAreas: string[];
  missingAreas: string[];
}

interface TransferabilityResult {
  communityCollege: string;
  summary: string;
  bestMatches: UniversityMatch[];
  courseAnalysis: CourseTransferResult[];
  igetcSummary: IgetcSummary;
  totalTransferableUnits: number;
  recommendations: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "P", "NP", "W", "IP"];
const EMPTY_COURSE = { courseCode: "", courseName: "", units: "3", grade: "", status: "completed", term: "" };

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  transferable: { label: "Transfers",    icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  likely:       { label: "Likely",       icon: CheckCircle2,  color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200" },
  uncertain:    { label: "Uncertain",    icon: HelpCircle,    color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200" },
  unlikely:     { label: "Unlikely",     icon: XCircle,       color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200" },
};

const SYSTEM_COLOR: Record<string, string> = {
  UC:      "bg-blue-100 text-blue-700",
  CSU:     "bg-green-100 text-green-700",
  Private: "bg-purple-100 text-purple-700",
};

const IGETC_AREAS = [
  { key: "area1AEnglish",         label: "Area 1A – English Composition" },
  { key: "area1BCriticalThinking", label: "Area 1B – Critical Thinking" },
  { key: "area2Math",             label: "Area 2 – Math & Quantitative Reasoning" },
  { key: "area3Arts",             label: "Area 3 – Arts & Humanities" },
  { key: "area4Social",           label: "Area 4 – Social & Behavioral Sciences" },
  { key: "area5Science",          label: "Area 5 – Physical & Biological Sciences" },
  { key: "area6Language",         label: "Area 6 – Languages Other Than English" },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CourseTransferResult["status"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function CourseAnalysisRow({ c }: { c: CourseTransferResult }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[c.status];
  return (
    <div className={cn("rounded-lg border overflow-hidden", cfg.border)}>
      <button
        className={cn("w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-95 transition", cfg.bg)}
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {c.courseCode && (
              <span className="text-xs font-mono bg-white/70 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">{c.courseCode}</span>
            )}
            <span className="text-sm font-semibold text-slate-800">{c.courseName}</span>
            <span className="text-xs text-slate-400">{c.units} units</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <StatusBadge status={c.status} />
            {c.igetcArea && (
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                IGETC {c.igetcArea}
              </span>
            )}
            {c.csuGEArea && (
              <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-medium">
                CSU GE {c.csuGEArea}
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-white border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
          <p className="mb-2">{c.assistNote}</p>
          <a
            href={`https://assist.org`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <ExternalLink className="h-3 w-3" />
            Verify on assist.org
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Main transferability panel ───────────────────────────────────────────────
function TransferabilityPanel({ result }: { result: TransferabilityResult }) {
  const igetc = result.igetcSummary;
  const completedCount = IGETC_AREAS.filter(a => igetc[a.key]).length;

  return (
    <div className="space-y-6 mt-6 pb-8">
      {/* Summary banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FlaskConical className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-900 mb-1">
              {result.totalTransferableUnits} transferable units · analyzed from {result.communityCollege}
            </p>
            <p className="text-sm text-indigo-700 leading-relaxed">{result.summary}</p>
          </div>
        </div>
      </div>

      {/* Best-matching universities */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <School className="h-4 w-4 text-indigo-500" />
          Best University Matches for Your Course List
        </h2>
        <div className="space-y-3">
          {result.bestMatches.map((m, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {i === 0 && <Star className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{m.university}</span>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", SYSTEM_COLOR[m.system] ?? "bg-slate-100 text-slate-600")}>{m.system}</span>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      m.matchScore >= 80 ? "bg-emerald-100 text-emerald-700" : m.matchScore >= 65 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {m.matchScore}% match
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1.5">{m.matchReason}</p>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", m.matchScore >= 80 ? "bg-emerald-400" : m.matchScore >= 65 ? "bg-amber-400" : "bg-rose-400")}
                        style={{ width: `${(m.transferableCount / Math.max(m.totalCourses, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                      {m.transferableCount}/{m.totalCourses} courses transfer
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IGETC progress */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          IGETC Completion — {completedCount}/{IGETC_AREAS.length} areas
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {IGETC_AREAS.map((area, i) => {
            const done = igetc[area.key];
            return (
              <div
                key={area.key}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0",
                  i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                )}
              >
                {done
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                <span className={cn("text-sm", done ? "text-slate-800 font-medium" : "text-slate-500")}>
                  {area.label}
                </span>
                <span className={cn("ml-auto text-xs font-semibold px-2 py-0.5 rounded-full", done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400")}>
                  {done ? "Complete" : "Needed"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          IGETC completion qualifies you for admission to any UC or CSU with general education requirements satisfied.{" "}
          <a href="https://assist.org" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Verify on assist.org →</a>
        </p>
      </div>

      {/* Per-course analysis */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-500" />
          Course-by-Course Analysis
          <span className="text-xs font-normal text-slate-400">— tap any row for details</span>
        </h2>
        <div className="space-y-2">
          {result.courseAnalysis.map((c, i) => (
            <CourseAnalysisRow key={i} c={c} />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Next Steps to Strengthen Your Transfer Application
          </h2>
          <ul className="space-y-2">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="text-amber-400 font-bold mt-0.5">{i + 1}.</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 text-center">
        Analysis is AI-generated based on typical ASSIST.org articulation patterns. Always verify exact equivalencies at{" "}
        <a href="https://assist.org" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">assist.org</a>{" "}
        and with your counselor.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Courses() {
  const { profileId } = useParams<{ profileId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [gpa, setGpa] = useState<GpaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newCourse, setNewCourse] = useState(EMPTY_COURSE);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TransferabilityResult | null>(null);

  const pid = parseInt(profileId);

  const loadCourses = () => {
    Promise.all([
      fetch(`/api/profiles/${pid}/courses`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" }).then(r => r.json()),
    ])
      .then(([c, g]: [Course[], GpaSummary]) => { setCourses(c); setGpa(g); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCourses(); }, [pid]);

  const addCourse = async () => {
    if (!newCourse.courseName.trim()) {
      toast({ title: "Course name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/profiles/${pid}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCourse,
          units: parseFloat(newCourse.units) || 3,
          grade: newCourse.status === "completed" ? newCourse.grade : undefined,
        }),
        credentials: "include",
      });
      const created = await r.json() as Course;
      setCourses(prev => [...prev, created]);
      setNewCourse(EMPTY_COURSE);
      setAdding(false);
      setAnalysis(null); // clear stale analysis when courses change
      fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" })
        .then(r => r.json()).then((g: GpaSummary) => setGpa(g)).catch(() => {});
      toast({ title: "Course added!" });
    } catch {
      toast({ title: "Error adding course", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (courseId: number) => {
    try {
      await fetch(`/api/courses/${courseId}`, { method: "DELETE", credentials: "include" });
      setCourses(prev => prev.filter(c => c.id !== courseId));
      setAnalysis(null); // clear stale analysis
      toast({ title: "Course removed" });
    } catch {
      toast({ title: "Error removing course", variant: "destructive" });
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const r = await fetch(`/api/profiles/${pid}/transferability-analysis`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) {
        const err = await r.json() as { error?: string };
        throw new Error(err.error ?? "Analysis failed");
      }
      const data = await r.json() as TransferabilityResult;
      setAnalysis(data);
      // Scroll to results
      setTimeout(() => document.getElementById("transfer-results")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Analysis failed", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const completed  = courses.filter(c => c.status === "completed");
  const inProgress = courses.filter(c => c.status === "in_progress");
  const planned    = courses.filter(c => c.status === "planned");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav profileId={pid} />
      <main className="pt-14 px-4 md:px-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="py-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
            <p className="text-slate-500 text-sm mt-1">
              Track your courses, then run a transferability analysis to see which California universities best match your coursework.
            </p>
          </div>
          <Button onClick={() => setAdding(true)} className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Add Course
          </Button>
        </div>

        {/* GPA Summary */}
        {gpa && gpa.courseCount > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Estimated GPA",  value: gpa.estimatedGpa > 0 ? gpa.estimatedGpa.toFixed(2) : "—" },
              { label: "Total Units",    value: gpa.totalUnits },
              { label: "Completed",      value: gpa.completedUnits + " units" },
              { label: "In Progress",    value: gpa.inProgressUnits + " units" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-indigo-600">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add course form */}
        {adding && (
          <Card className="mb-6 border-indigo-200">
            <CardHeader><CardTitle className="text-base">Add a Course</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Course Code (optional)</Label>
                  <Input value={newCourse.courseCode} onChange={e => setNewCourse(p => ({ ...p, courseCode: e.target.value }))} placeholder="e.g. PSYCH 101" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Course Name *</Label>
                  <Input value={newCourse.courseName} onChange={e => setNewCourse(p => ({ ...p, courseName: e.target.value }))} placeholder="e.g. Introduction to Psychology" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>Units</Label>
                  <Input type="number" min="0.5" max="8" step="0.5" value={newCourse.units} onChange={e => setNewCourse(p => ({ ...p, units: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={newCourse.status} onValueChange={v => setNewCourse(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="planned">Planned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newCourse.status === "completed" && (
                  <div className="space-y-1.5">
                    <Label>Grade</Label>
                    <Select value={newCourse.grade} onValueChange={v => setNewCourse(p => ({ ...p, grade: v }))}>
                      <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                      <SelectContent>
                        {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Term</Label>
                  <Input value={newCourse.term} onChange={e => setNewCourse(p => ({ ...p, term: e.target.value }))} placeholder="e.g. Fall 2024" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addCourse} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Course
                </Button>
                <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {courses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No courses yet. Add your completed and in-progress courses to get started.</p>
            <Button onClick={() => setAdding(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Add First Course
            </Button>
          </div>
        ) : (
          <>
            {/* Course lists */}
            <div className="space-y-6">
              {[
                { label: "Completed",   items: completed,   statusClass: "bg-emerald-100 text-emerald-700" },
                { label: "In Progress", items: inProgress,  statusClass: "bg-blue-100 text-blue-700" },
                { label: "Planned",     items: planned,     statusClass: "bg-slate-100 text-slate-600" },
              ].filter(g => g.items.length > 0).map(group => (
                <Card key={group.label}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${group.statusClass}`}>{group.label}</span>
                      <span className="text-slate-400 font-normal">{group.items.length} course{group.items.length !== 1 ? "s" : ""}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {group.items.map(course => (
                        <div key={course.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {course.courseCode && (
                                <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{course.courseCode}</span>
                              )}
                              <span className="text-sm font-medium text-slate-800">{course.courseName}</span>
                            </div>
                            <div className="flex gap-3 mt-0.5 text-xs text-slate-400">
                              {course.units && <span>{course.units} units</span>}
                              {course.grade && <span>Grade: <strong>{course.grade}</strong></span>}
                              {course.term && <span>{course.term}</span>}
                            </div>
                          </div>
                          <button onClick={() => deleteCourse(course.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Transferability Analysis CTA ── */}
            <div className="mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-base font-bold text-indigo-900 flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-indigo-500" />
                    Check Course Transferability
                  </h2>
                  <p className="text-sm text-indigo-700 mt-1">
                    AI will cross-reference your {courses.length} course{courses.length !== 1 ? "s" : ""} against ASSIST.org articulation agreements
                    to identify which California universities best match your coursework and show your IGETC progress.
                  </p>
                </div>
                <Button
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0 min-w-[180px]"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Analyze My Courses
                    </>
                  )}
                </Button>
              </div>

              {analyzing && (
                <div className="mt-4 bg-white/60 rounded-xl p-4 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-indigo-800">Checking articulation agreements…</p>
                  <p className="text-xs text-indigo-500 mt-1">AI is cross-referencing your courses with ASSIST.org data. This takes ~20 seconds.</p>
                </div>
              )}
            </div>

            {/* ── Results ── */}
            {analysis && (
              <div id="transfer-results">
                <TransferabilityPanel result={analysis} />
              </div>
            )}
          </>
        )}

        {/* Footer nav */}
        <div className="py-8 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            GPA calculations are estimates. Verify your official GPA with your college transcript.
          </p>
          <Button onClick={() => navigate(`/pathways/${pid}`)} className="bg-indigo-600 hover:bg-indigo-700">
            View My Pathway <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
