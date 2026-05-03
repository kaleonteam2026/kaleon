import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  Plus, Trash2, Loader2, ArrowRight, BookOpen, FlaskConical,
  CheckCircle2, AlertCircle, HelpCircle, XCircle, Star,
  ExternalLink, ChevronDown, ChevronUp, School, Search,
  X, ChevronRight, GraduationCap, Library,
} from "lucide-react";

// ─── Domain types ─────────────────────────────────────────────────────────────
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

interface CatalogCourse {
  courseCode: string;
  courseName: string;
  units: number;
  description: string;
  category: string;
  igetcArea?: string;
  csuGEArea?: string;
  transferable: boolean;
}

interface CourseCatalog {
  college: string;
  major: string;
  categories: string[];
  courses: CatalogCourse[];
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

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  transferable: { label: "Transfers",  icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  likely:       { label: "Likely",     icon: CheckCircle2, color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200" },
  uncertain:    { label: "Uncertain",  icon: HelpCircle,   color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200" },
  unlikely:     { label: "Unlikely",   icon: XCircle,      color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200" },
};

const SYSTEM_COLOR: Record<string, string> = {
  UC: "bg-blue-100 text-blue-700", CSU: "bg-green-100 text-green-700", Private: "bg-purple-100 text-purple-700",
};

const IGETC_AREAS = [
  { key: "area1AEnglish",          label: "Area 1A – English Composition" },
  { key: "area1BCriticalThinking", label: "Area 1B – Critical Thinking" },
  { key: "area2Math",              label: "Area 2 – Math & Quantitative Reasoning" },
  { key: "area3Arts",              label: "Area 3 – Arts & Humanities" },
  { key: "area4Social",            label: "Area 4 – Social & Behavioral Sciences" },
  { key: "area5Science",           label: "Area 5 – Physical & Biological Sciences" },
  { key: "area6Language",          label: "Area 6 – Languages Other Than English" },
] as const;

const CATEGORY_ICON: Record<string, typeof BookOpen> = {
  "Major Requirements":         GraduationCap,
  "IGETC / GE Requirements":    Library,
  "Electives & Prerequisites":  BookOpen,
};

// ─── Transferability sub-components ──────────────────────────────────────────
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
            {c.courseCode && <span className="text-xs font-mono bg-white/70 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">{c.courseCode}</span>}
            <span className="text-sm font-semibold text-slate-800">{c.courseName}</span>
            <span className="text-xs text-slate-600">{c.units} units</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            <StatusBadge status={c.status} />
            {c.igetcArea && <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">IGETC {c.igetcArea}</span>}
            {c.csuGEArea && <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-medium">CSU GE {c.csuGEArea}</span>}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-600 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-white border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
          <p className="mb-2">{c.assistNote}</p>
          <a href="https://assist.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            <ExternalLink className="h-3 w-3" /> Verify on assist.org
          </a>
        </div>
      )}
    </div>
  );
}

function TransferabilityPanel({ result }: { result: TransferabilityResult }) {
  const igetc = result.igetcSummary;
  const completedCount = IGETC_AREAS.filter(a => igetc[a.key]).length;
  return (
    <div className="space-y-6 mt-6 pb-8">
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
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                      m.matchScore >= 80 ? "bg-emerald-100 text-emerald-700" : m.matchScore >= 65 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                    )}>{m.matchScore}% match</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-1.5">{m.matchReason}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", m.matchScore >= 80 ? "bg-emerald-400" : m.matchScore >= 65 ? "bg-amber-400" : "bg-rose-400")}
                        style={{ width: `${(m.transferableCount / Math.max(m.totalCourses, 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-600 whitespace-nowrap">{m.transferableCount}/{m.totalCourses} courses transfer</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          IGETC Completion — {completedCount}/{IGETC_AREAS.length} areas
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {IGETC_AREAS.map((area, i) => {
            const done = igetc[area.key];
            return (
              <div key={area.key} className={cn("flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                <span className={cn("text-sm", done ? "text-slate-800 font-medium" : "text-slate-600")}>{area.label}</span>
                <span className={cn("ml-auto text-xs font-semibold px-2 py-0.5 rounded-full", done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                  {done ? "Complete" : "Needed"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-600 mt-2">
          IGETC completion qualifies you for any UC or CSU with GE satisfied.{" "}
          <a href="https://assist.org" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Verify on assist.org →</a>
        </p>
      </div>

      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-600" />
          Course-by-Course Analysis
          <span className="text-xs font-normal text-slate-600">— tap any row for details</span>
        </h2>
        <div className="space-y-2">
          {result.courseAnalysis.map((c, i) => <CourseAnalysisRow key={i} c={c} />)}
        </div>
      </div>

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

      <p className="text-xs text-slate-600 text-center">
        Analysis is AI-generated based on typical ASSIST.org articulation patterns. Always verify at{" "}
        <a href="https://assist.org" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">assist.org</a> and with your counselor.
      </p>
    </div>
  );
}

// ─── Catalog course picker ────────────────────────────────────────────────────
interface CoursePickerProps {
  catalog: CourseCatalog;
  alreadyAdded: Set<string>;
  onPick: (course: CatalogCourse) => void;
  onClose: () => void;
}

function CoursePicker({ catalog, alreadyAdded, onPick, onClose }: CoursePickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return catalog.courses.filter(c => {
      const matchesSearch = !q ||
        c.courseCode.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
      const matchesCategory = activeCategory === "All" || c.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [catalog.courses, search, activeCategory]);

  const categories = ["All", ...catalog.categories];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{catalog.college}</h2>
          <p className="text-xs text-slate-600">{catalog.major} · {catalog.courses.length} courses in catalog</p>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-700 p-1">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by course code or name…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-b border-slate-100 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition whitespace-nowrap",
              activeCategory === cat
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {cat === "All" ? `All (${catalog.courses.length})` : cat}
          </button>
        ))}
      </div>

      {/* Course list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-sm">No courses match your search.</div>
        ) : (
          filtered.map(c => {
            const added = alreadyAdded.has(`${c.courseCode}::${c.courseName}`);
            const Icon = CATEGORY_ICON[c.category] ?? BookOpen;
            return (
              <button
                key={`${c.courseCode}::${c.courseName}`}
                disabled={added}
                onClick={() => onPick(c)}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-3 rounded-lg border transition",
                  added
                    ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                    : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer"
                )}
              >
                <Icon className="h-4 w-4 text-slate-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{c.courseCode}</span>
                    <span className="text-sm font-semibold text-slate-800 truncate">{c.courseName}</span>
                    <span className="text-xs text-slate-600 ml-auto flex-shrink-0">{c.units} units</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{c.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {c.igetcArea && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full">IGETC {c.igetcArea}</span>
                    )}
                    {c.csuGEArea && (
                      <span className="text-xs bg-teal-50 text-teal-600 border border-teal-100 px-1.5 py-0.5 rounded-full">CSU GE {c.csuGEArea}</span>
                    )}
                    {c.transferable && (
                      <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-full">Transferable</span>
                    )}
                    {added && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">Already added</span>}
                  </div>
                </div>
                {!added && <ChevronRight className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-1" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Add-course details panel (after picking from catalog) ────────────────────
interface CourseDetailFormProps {
  course: CatalogCourse;
  onSave: (data: { grade?: string; status: string; term: string }) => void;
  onBack: () => void;
  saving: boolean;
}

function CourseDetailForm({ course, onSave, onBack, saving }: CourseDetailFormProps) {
  const [status, setStatus] = useState("completed");
  const [grade, setGrade] = useState("");
  const [term, setTerm] = useState("");

  return (
    <div className="p-4 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mb-2">
        ← Back to catalog
      </button>

      {/* Selected course summary */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono bg-white border border-indigo-200 px-1.5 py-0.5 rounded text-indigo-700">{course.courseCode}</span>
              <span className="text-sm font-bold text-indigo-900">{course.courseName}</span>
            </div>
            <p className="text-xs text-indigo-600 mt-1">{course.units} units · {course.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {course.igetcArea && <span className="text-xs bg-white text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded-full">IGETC {course.igetcArea}</span>}
              {course.csuGEArea && <span className="text-xs bg-white text-teal-600 border border-teal-200 px-1.5 py-0.5 rounded-full">CSU GE {course.csuGEArea}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {status === "completed" && (
          <div className="space-y-1.5">
            <Label>Grade</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>
                {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Term (optional)</Label>
        <Input value={term} onChange={e => setTerm(e.target.value)} placeholder="e.g. Fall 2024" />
      </div>

      <Button
        onClick={() => onSave({ grade: grade || undefined, status, term })}
        disabled={saving}
        className="w-full bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
        Add to My Courses
      </Button>
    </div>
  );
}

// ─── Modal overlay ────────────────────────────────────────────────────────────
function CatalogModal({
  open, onClose, catalog, catalogLoading, catalogError, alreadyAdded, onAddCourse, pid
}: {
  open: boolean;
  onClose: () => void;
  catalog: CourseCatalog | null;
  catalogLoading: boolean;
  catalogError: string | null;
  alreadyAdded: Set<string>;
  onAddCourse: (course: CatalogCourse, detail: { grade?: string; status: string; term: string }) => Promise<void>;
  pid: number;
}) {
  const [selected, setSelected] = useState<CatalogCourse | null>(null);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, open, onClose);

  if (!open) return null;

  const handleSave = async (detail: { grade?: string; status: string; term: string }) => {
    if (!selected) return;
    setSaving(true);
    try {
      await onAddCourse(selected, detail);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-modal-title"
        tabIndex={-1}
        className="relative bg-white w-full sm:max-w-xl sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden focus:outline-none"
        style={{ height: "85vh" }}>
        <h2 id="catalog-modal-title" className="sr-only">Add a course from your college&apos;s catalog</h2>

        {catalogLoading && (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm font-medium text-slate-700 text-center">
              Loading your college&apos;s course catalog…
            </p>
            <p className="text-xs text-slate-600 text-center">
              Fetching courses specific to your college and major. This takes about 15 seconds.
            </p>
          </div>
        )}

        {catalogError && (
          <div className="p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
            <p className="text-sm font-medium text-slate-700">{catalogError}</p>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}

        {!catalogLoading && !catalogError && catalog && (
          selected ? (
            <CourseDetailForm
              course={selected}
              onSave={handleSave}
              onBack={() => setSelected(null)}
              saving={saving}
            />
          ) : (
            <CoursePicker
              catalog={catalog}
              alreadyAdded={alreadyAdded}
              onPick={setSelected}
              onClose={onClose}
            />
          )
        )}
      </div>
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

  // Catalog state
  const [modalOpen, setModalOpen] = useState(false);
  const [catalog, setCatalog] = useState<CourseCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TransferabilityResult | null>(null);

  const pid = parseInt(profileId);

  const alreadyAdded = useMemo<Set<string>>(
    () => new Set(courses.map(c => `${c.courseCode ?? ""}::${c.courseName}`)),
    [courses]
  );

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

  const openCatalog = async () => {
    setModalOpen(true);
    if (catalog) return; // already loaded

    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const r = await fetch(`/api/profiles/${pid}/course-catalog`, { credentials: "include" });
      if (!r.ok) {
        const err = await r.json() as { error?: string };
        throw new Error(err.error ?? "Could not load catalog");
      }
      const data = await r.json() as CourseCatalog;
      setCatalog(data);
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Failed to load course catalog");
    } finally {
      setCatalogLoading(false);
    }
  };

  const addCourseFromCatalog = async (
    catalogCourse: CatalogCourse,
    detail: { grade?: string; status: string; term: string }
  ) => {
    const r = await fetch(`/api/profiles/${pid}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseCode: catalogCourse.courseCode,
        courseName: catalogCourse.courseName,
        units: catalogCourse.units,
        grade: detail.grade,
        status: detail.status,
        term: detail.term || undefined,
      }),
      credentials: "include",
    });
    if (!r.ok) throw new Error("Failed to add course");
    const created = await r.json() as Course;
    setCourses(prev => [...prev, created]);
    setAnalysis(null);
    fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" })
      .then(r => r.json()).then((g: GpaSummary) => setGpa(g)).catch(() => {});
    toast({ title: `${catalogCourse.courseCode} added!` });
  };

  const deleteCourse = async (courseId: number) => {
    try {
      await fetch(`/api/courses/${courseId}`, { method: "DELETE", credentials: "include" });
      setCourses(prev => prev.filter(c => c.id !== courseId));
      setAnalysis(null);
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
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
      <Nav profileId={pid} />

      <CatalogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        catalog={catalog}
        catalogLoading={catalogLoading}
        catalogError={catalogError}
        alreadyAdded={alreadyAdded}
        onAddCourse={addCourseFromCatalog}
        pid={pid}
      />

      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none px-4 md:px-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="py-6 border-b-2 border-slate-900 mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">My Courses</h1>
            <p className="text-slate-600 text-sm mt-1">
              Select courses directly from your college&apos;s catalog to ensure accurate course codes and unit counts.
            </p>
          </div>
          <Button onClick={openCatalog} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none flex-shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Add Course
          </Button>
        </div>

        {/* GPA Summary */}
        {gpa && gpa.courseCount > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Estimated GPA",  value: gpa.estimatedGpa > 0 ? gpa.estimatedGpa.toFixed(2) : "—" },
              { label: "Total Units",    value: gpa.totalUnits },
              { label: "Completed",      value: `${gpa.completedUnits} units` },
              { label: "In Progress",    value: `${gpa.inProgressUnits} units` },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-indigo-600">{s.value}</div>
                <div className="text-xs text-slate-600">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 60-Unit Transfer Progress */}
        {gpa && (
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                Units Toward Transfer
              </span>
              <span className={`text-sm font-bold ${gpa.totalUnits >= 60 ? "text-emerald-600" : "text-indigo-600"}`}>
                {gpa.totalUnits} / 60
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${gpa.totalUnits >= 60 ? "bg-emerald-500" : "bg-indigo-500"}`}
                style={{ width: `${Math.min(100, (gpa.totalUnits / 60) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-1.5 flex justify-between">
              <span>{gpa.totalUnits >= 60 ? "✓ 60-unit minimum met! Great progress." : `${(60 - gpa.totalUnits).toFixed(1)} more units to reach transfer minimum`}</span>
              <span>Min: 60 semester units</span>
            </p>
          </div>
        )}

        {/* Empty state */}
        {courses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium mb-1">No courses added yet</p>
            <p className="text-slate-600 text-sm mb-6">
              Browse your college&apos;s actual course catalog and add the courses you&apos;ve completed or are taking.
            </p>
            <Button onClick={openCatalog} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
              <Plus className="h-4 w-4 mr-2" /> Browse Course Catalog
            </Button>
          </div>
        ) : (
          <>
            {/* Course lists */}
            <div className="space-y-5">
              {[
                { label: "Completed",   items: completed,  statusClass: "bg-emerald-100 text-emerald-700" },
                { label: "In Progress", items: inProgress, statusClass: "bg-blue-100 text-blue-700" },
                { label: "Planned",     items: planned,    statusClass: "bg-slate-100 text-slate-600" },
              ].filter(g => g.items.length > 0).map(group => (
                <Card key={group.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${group.statusClass}`}>{group.label}</span>
                      <span className="text-slate-600 font-normal">{group.items.length} course{group.items.length !== 1 ? "s" : ""}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      {group.items.map(course => (
                        <div key={course.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {course.courseCode && (
                                <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{course.courseCode}</span>
                              )}
                              <span className="text-sm font-medium text-slate-800">{course.courseName}</span>
                            </div>
                            <div className="flex gap-3 mt-0.5 text-xs text-slate-600">
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

            {/* Transferability Analysis CTA */}
            <div className="mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-base font-bold text-indigo-900 flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-indigo-500" />
                    Check Course Transferability
                  </h2>
                  <p className="text-sm text-indigo-700 mt-1">
                    AI will cross-reference your {courses.length} course{courses.length !== 1 ? "s" : ""} against ASSIST.org articulation agreements to identify which California universities best match your coursework and show your IGETC progress.
                  </p>
                </div>
                <Button onClick={runAnalysis} disabled={analyzing} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none flex-shrink-0 min-w-[180px]">
                  {analyzing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing…</>
                  ) : (
                    <><FlaskConical className="h-4 w-4 mr-2" /> Analyze My Courses</>
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

            {/* Results */}
            {analysis && (
              <div id="transfer-results">
                <TransferabilityPanel result={analysis} />
              </div>
            )}
          </>
        )}

        {/* Footer nav */}
        <div className="py-6 border-b-2 border-slate-900 mb-6 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            GPA calculations are estimates. Verify your official GPA with your college transcript.
          </p>
          <Button onClick={() => navigate(`/pathways/${pid}`)} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
            View My Pathway <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
