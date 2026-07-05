import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { PageMotion } from "@/components/page-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/copy";
import { fetchWithTimeout } from "@/lib/api/client";
import { useRequestCleanup } from "@/hooks/use-request-cleanup";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCoursesForProfile, getProfileForUser, insertCourses, deleteCourse as deleteCourseSupabase, deleteAllCoursesForProfile } from "@/lib/supabase-profiles";
import { loadPathwaysFromDb, deleteAllPathwaysForProfile, deleteAllPathwaySnapshotsForProfile } from "@/lib/supabase-pathways";
import { deleteAllSnapshots } from "@/lib/supabase-semesters";
import { computeGpaSummary } from "@/lib/course-progress";
import { isAuthBypass } from "@/lib/dev-profile";
import { saveDevCourses } from "@/lib/dev-courses";
import {
  transferProgressPercent, transferUnitsRemaining,
} from "@/lib/course-progress";
import { Plus, Trash2, ArrowRight, BookOpen, FlaskConical,
  GraduationCap, ChevronDown, Upload, AlertTriangle, Info, CheckCircle2,
} from "lucide-react";
import { KaleonLoader } from "@/components/ui/kaleon-loader";
import { CatalogModal } from "@/components/courses/catalog-modal";
import { TransferabilityPanel } from "@/components/courses/transferability-panel";
import type { Course, GpaSummary, CourseCatalog, CatalogCourse, TransferabilityResult } from "@/components/courses/course-types";

const DEFAULT_TRANSFER_UNITS = 60;

interface SchoolOption {
  name: string;
  requiredUnits: number;
}

export default function Courses() {
  const { profileId } = useParams<{ profileId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [gpa, setGpa] = useState<GpaSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Pathways (school) state
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolIdx, setSelectedSchoolIdx] = useState(0);

  // Re-upload transcript state
  const [showReuploadConfirm, setShowReuploadConfirm] = useState(false);

  const handleReuploadConfirm = async () => {
    try {
      // Delete all existing courses before navigating to the upload flow
      if (isSupabaseConfigured && !isAuthBypass()) {
        await deleteAllCoursesForProfile(pid);
        await deleteAllSnapshots(pid);
        await deleteAllPathwaysForProfile(pid);
        await deleteAllPathwaySnapshotsForProfile(pid);
      } else {
        saveDevCourses(pid, []);
        // Also hit the mock API to clear its in-memory store
        fetch(`/api/profiles/${pid}/courses`, { method: "DELETE" }).catch(() => {});
      }
    } catch {
      // Non-fatal — if delete fails, the re-upload will still replace courses
    }
    navigate(`/onboarding?reupload=${pid}`);
  };

  // Catalog state
  const [modalOpen, setModalOpen] = useState(false);
  const [catalog, setCatalog] = useState<CourseCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Manual add course form
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualUnits, setManualUnits] = useState("");
  const [manualGrade, setManualGrade] = useState("");
  const [manualTerm, setManualTerm] = useState("");

  // Profile info
  const [communityCollege, setCommunityCollege] = useState<string>("");

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TransferabilityResult | null>(null);
  const [hasPathways, setHasPathways] = useState(false);

  const pid = parseInt(profileId);
  const getSignal = useRequestCleanup();

  const alreadyAdded = useMemo<Set<string>>(
    () => new Set(courses.map(c => `${c.courseCode ?? ""}::${c.courseName}`)),
    [courses]
  );

  const loadCourses = () => {
    // Real Supabase path
    if (isSupabaseConfigured && !isAuthBypass()) {
      Promise.all([
        getProfileForUser(user?.id ?? ""),
        getCoursesForProfile(pid),
        loadPathwaysFromDb(pid),
      ]).then(([profile, storedCourses, savedPathways]) => {
        setCourses(storedCourses);
        setGpa(computeGpaSummary(storedCourses, profile?.currentGpa ?? undefined));
        setSchoolOptions(savedPathways as unknown[]);
        setCommunityCollege(profile?.communityCollege ?? "");
        setHasPathways(Array.isArray(savedPathways) && savedPathways.length > 0);
      }).catch(console.error).finally(() => setLoading(false));
      return;
    }

    // Dev / mock path — guard every .json() behind r.ok
    Promise.all([
      fetch(`/api/profiles/${pid}/courses`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
      fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" }).then(r => r.ok ? r.json() : { estimatedGpa: 0, totalUnits: 0, completedUnits: 0, inProgressUnits: 0, courseCount: 0 }),
      fetch(`/api/profiles/${pid}/pathways`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),
      fetch(`/api/profiles/${pid}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : {})
        .catch(() => ({})),
    ])
      .then(([c, g, pathways, prof]: [Course[], GpaSummary, unknown[], Record<string, unknown>]) => {
        setCourses(c);
        setGpa(g);
        setSchoolOptions(pathways);
        setCommunityCollege((prof?.communityCollege as string) ?? "");
        setHasPathways(Array.isArray(pathways) && pathways.length > 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const setSchoolOptions = (pathways: unknown[]) => {
    const schoolOpts: SchoolOption[] = [];
    if (Array.isArray(pathways) && pathways.length > 0) {
      for (const pw of pathways) {
        const rj = (pw as Record<string, unknown>)?.reportJson as Record<string, unknown> | undefined;
        const name = String(rj?.university ?? "University");
        const req = Number(rj?.requiredUnits ?? DEFAULT_TRANSFER_UNITS);
        if (name && name !== "University") {
          schoolOpts.push({ name, requiredUnits: req });
        }
      }
    }
    schoolOpts.push({ name: "Transfer Minimum", requiredUnits: DEFAULT_TRANSFER_UNITS });
    setSchools(schoolOpts);
    setSelectedSchoolIdx(0);
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
        const errBody = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(errBody.error ?? t("pages.courses.couldNotLoadCatalog"));
      }
      const data = await r.json() as CourseCatalog;
      setCatalog(data);
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : t("pages.courses.failedLoadCatalog"));
    } finally {
      setCatalogLoading(false);
    }
  };

  const addCourseFromCatalog = async (
    catalogCourse: CatalogCourse,
    detail: { grade?: string; status: string; term: string }
  ) => {
    if (isSupabaseConfigured && !isAuthBypass() && user?.id) {
      const created = await insertCourses(pid, user.id, [{
        courseCode: catalogCourse.courseCode,
        courseName: catalogCourse.courseName,
        units: catalogCourse.units,
        grade: detail.grade,
        status: detail.status,
        term: detail.term || undefined,
      }]);
      if (created.length === 0) throw new Error(t("pages.courses.failedAddCourse"));
      setCourses(prev => {
        const updated = [...prev, created[0]];
        setGpa(computeGpaSummary(updated));
        return updated;
      });
      setAnalysis(null);
      toast({ title: t("pages.courses.toastAdded", { code: catalogCourse.courseCode }) });
      return;
    }

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
    if (!r.ok) throw new Error(t("pages.courses.failedAddCourse"));
    const created = await r.json() as Course;
    setCourses(prev => [...prev, created]);
    setAnalysis(null);
    fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(g => g && setGpa(g)).catch(() => {});
    toast({ title: t("pages.courses.toastAdded", { code: catalogCourse.courseCode }) });
  };

  const addManualCourse = async () => {
    if (!manualCode.trim()) {
      toast({ title: "Course code is required", variant: "destructive" });
      return;
    }
    const code = manualCode.trim().toUpperCase();
    // Check for duplicates by course code
    const exists = alreadyAdded.has(`${code}::${manualName.trim() || code}`) ||
      courses.some(c => c.courseCode?.toUpperCase() === code);
    if (exists) {
      toast({ title: `"${code}" is already in your list`, variant: "destructive" });
      return;
    }
    const courseData = {
      courseCode: code,
      courseName: manualName.trim() || code,
      units: manualUnits ? parseFloat(manualUnits) : undefined,
      grade: manualGrade.trim() || undefined,
      status: "completed" as const,
      term: manualTerm.trim() || undefined,
    };

    try {
      if (isSupabaseConfigured && !isAuthBypass() && user?.id) {
        const created = await insertCourses(pid, user.id, [courseData]);
        if (created.length === 0) throw new Error("Failed to add course");
        setCourses(prev => {
          const updated = [...prev, created[0]];
          setGpa(computeGpaSummary(updated));
          return updated;
        });
        toast({ title: t("pages.courses.toastAdded", { code }) });
      } else {
        const r = await fetch(`/api/profiles/${pid}/courses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(courseData),
          credentials: "include",
        });
        if (!r.ok) throw new Error("Failed to add course");
        const created = await r.json() as Course;
        setCourses(prev => {
          const updated = [...prev, created];
          setGpa(computeGpaSummary(updated));
          return updated;
        });
        toast({ title: t("pages.courses.toastAdded", { code }) });
      }
    } catch {
      toast({ title: "Failed to add course", variant: "destructive" });
    }

    setManualCode("");
    setManualName("");
    setManualUnits("");
    setManualGrade("");
    setManualTerm("");
    setShowManualAdd(false);
    setAnalysis(null);
  };

  const deleteCourse = async (courseId: number) => {
    try {
      if (isSupabaseConfigured && !isAuthBypass()) {
        const ok = await deleteCourseSupabase(courseId);
        if (!ok) throw new Error("Delete failed");
      } else {
        await fetch(`/api/courses/${courseId}`, { method: "DELETE", credentials: "include" });
      }
      setCourses(prev => {
        const updated = prev.filter(c => c.id !== courseId);
        setGpa(computeGpaSummary(updated));
        return updated;
      });
      setAnalysis(null);
      toast({ title: t("pages.courses.toastCourseRemoved") });
    } catch {
      toast({ title: t("pages.courses.toastErrorRemoving"), variant: "destructive" });
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const r = await fetchWithTimeout(`/api/profiles/${pid}/transferability-analysis`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityCollege: communityCollege,
          courses: courses.map(c => ({
            courseCode: c.courseCode,
            courseName: c.courseName,
            units: c.units,
            term: c.term,
            status: c.status,
          })),
        }),
        timeout: 180_000,
      }, getSignal());
      if (r.status === 429) {
        toast({ title: "Rate limit reached", description: "Please wait a moment before analyzing again.", variant: "destructive" });
        return;
      }
      if (!r.ok) {
        const errText = await r.text().catch(() => "");
        try {
          const err = JSON.parse(errText) as { error?: string };
          throw new Error(err.error ?? t("pages.courses.analysisFailed"));
        } catch {
          throw new Error(`Server error (${r.status}): ${errText.slice(0, 200)}`);
        }
      }
      const data = await r.json() as TransferabilityResult;
      setAnalysis(data);
      setTimeout(() => document.getElementById("transfer-results")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t("pages.courses.analysisFailed"), variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const completed  = courses.filter(c => c.status === "completed");
  const inProgress = courses.filter(c => c.status === "in_progress");
  const planned    = courses.filter(c => c.status === "planned");

  // Current school target
  const activeSchool = schools[selectedSchoolIdx] ?? schools[schools.length - 1] ??
    { name: "Transfer Minimum", requiredUnits: DEFAULT_TRANSFER_UNITS };
  const schoolUnits = activeSchool.requiredUnits;

  if (loading) {
    return <PageLoadingState showNav profileId={pid} />;
  }

  return (
    <AppPageLayout profileId={pid} maxWidth="4xl">
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

      {/* Header */}
      <div className="py-6 border-b-2 border-slate-900 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">{t("pages.courses.title")}</h1>
          <p className="text-slate-600 text-sm mt-1">
            {courses.length === 0
              ? "Select courses directly from your college&apos;s catalog to ensure accurate course codes and unit counts."
              : analysis
                ? "Transfer analysis complete. Your personalized pathway is ready below."
                : "Your courses are loaded. Run a transferability analysis to see how they apply toward UC/CSU requirements."}
          </p>
        </div>
        <div className="flex gap-2">
          {showManualAdd ? (
            <Button
              onClick={() => setShowManualAdd(false)}
              variant="outline"
              className="border-slate-300 text-slate-600 rounded-none"
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={() => setShowManualAdd(true)}
              variant="outline"
              className="border-slate-300 text-slate-600 rounded-none group relative"
              title="Add a single course manually — use this to fix a missing or incorrectly imported course"
            >
              <Plus className="h-4 w-4 mr-2" /> Manual
            </Button>
          )}

          <Button
            onClick={() => setShowReuploadConfirm(true)}
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none group relative"
            title="Replace all courses by uploading a new transcript PDF — use this to start over"
          >
            <Upload className="h-4 w-4 mr-2" /> Re-upload Transcript
          </Button>
        </div>
      </div>

      {/* Re-upload confirmation dialog */}
      {showReuploadConfirm && (
        <div className="mb-6 p-5 border-2 border-amber-300 bg-amber-50 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-amber-900 mb-1">{t("pages.courses.reuploadWarningTitle")}</h3>
              <p className="text-sm text-amber-800 mb-4">
                {t("pages.courses.reuploadWarningBody")}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowReuploadConfirm(false)}
                  variant="outline"
                  className="border-slate-300 text-slate-600 rounded-none"
                >
                  {t("pages.courses.reuploadCancel")}
                </Button>
                <Button
                  onClick={() => { void handleReuploadConfirm(); }}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-none"
                >
                  <Upload className="h-4 w-4 mr-2" /> {t("pages.courses.reuploadConfirm")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Course Form */}
      {showManualAdd && (
        <div className="mb-6 p-4 border-2 border-slate-200 bg-slate-50 rounded-none">
          <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-tight">Add a Course Manually</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">Code *</label>
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="e.g. MATH 101"
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">Name</label>
              <input
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Course name"
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">Units</label>
              <input
                value={manualUnits}
                onChange={e => setManualUnits(e.target.value)}
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 3"
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">Grade</label>
              <input
                value={manualGrade}
                onChange={e => setManualGrade(e.target.value)}
                placeholder="e.g. A, B+"
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">Term</label>
              <input
                value={manualTerm}
                onChange={e => setManualTerm(e.target.value)}
                placeholder="e.g. Fall 2023"
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addManualCourse} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-sm px-6">
              <Plus className="h-4 w-4 mr-2" /> Add Course
            </Button>
          </div>
        </div>
      )}

      <PageMotion>
        {/* GPA Summary */}
        {gpa && gpa.courseCount > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: t("pages.courses.estimatedGpa"),  value: gpa.estimatedGpa > 0 ? gpa.estimatedGpa.toFixed(2) : "—" },
              { label: t("pages.courses.totalUnits"),    value: gpa.totalUnits },
              { label: t("pages.courses.sectionCompleted"),      value: `${gpa.completedUnits} ${t("pages.courses.earnedUnits")}` },
              { label: t("pages.courses.inProgressUnits"),    value: `${gpa.inProgressUnits} ${t("pages.courses.totalUnits").toLowerCase()}` },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-emerald-600">{s.value}</div>
                <div className="text-xs text-slate-600">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Transfer unit progress */}
        {gpa && (
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
                {t("pages.courses.transferProgress")}
              </span>
              <span className={`text-sm font-bold ${gpa.totalUnits >= schoolUnits ? "text-emerald-600" : "text-amber-600"}`}>
                {gpa.totalUnits} / {schoolUnits}
              </span>
            </div>
            {/* School selector */}
            {schools.length > 1 && (
              <div className="mb-3 flex items-center gap-2">
                <label className="text-xs text-slate-500">{t("pages.courses.targetSchool")}</label>
                <div className="relative inline-block">
                  <select
                    className="appearance-none bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                    value={selectedSchoolIdx}
                    onChange={e => setSelectedSchoolIdx(Number(e.target.value))}
                  >
                    {schools.map((s, i) => (
                      <option key={`${s.name}-${i}`} value={i}>
                        {s.name} ({s.requiredUnits}u)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${gpa.totalUnits >= schoolUnits ? "bg-emerald-500" : "bg-emerald-400"}`}
                style={{ width: `${transferProgressPercent(gpa.totalUnits, schoolUnits)}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-1.5 flex justify-between">
              <span>
                {gpa.totalUnits >= schoolUnits
                  ? t("pages.courses.transferComplete", { school: activeSchool.name })
                  : t("pages.courses.transferRemaining", { units: transferUnitsRemaining(gpa.totalUnits, schoolUnits).toFixed(1) })}
              </span>
              <span>{t("pages.courses.schoolRequires", { school: activeSchool.name, units: schoolUnits })}</span>
            </p>
          </div>
        )}

        {/* Prompt to run analysis when courses loaded but not yet analyzed */}
        {!analysis && courses.length > 0 && (
          <div className="mb-5 flex items-center gap-2 px-1">
            <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            <p className="text-xs text-teal-600 font-medium">
              {courses.length} course{courses.length !== 1 ? "s" : ""} loaded.{" "}
              <button onClick={runAnalysis} className="underline font-semibold hover:text-teal-800 ml-1">
                Run transfer analysis
              </button>{" "}
              to see which credits transfer.
            </p>
          </div>
        )}

        {/* Empty state */}
        {courses.length === 0 ? (
          <div className="py-12">
            <div className="text-center mb-8">
              <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-800 mb-1">Welcome to Your Courses</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Start by importing your transcript or browsing your college&apos;s catalog to add courses.
              </p>
            </div>
            <div className="max-w-md mx-auto space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Import your transcript</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Upload a PDF of your unofficial transcript to auto-populate your courses.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Browse the course catalog</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select courses directly from your college&apos;s catalog.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Analyze transferability</h3>
                  <p className="text-xs text-slate-500 mt-0.5">See which courses transfer to UC/CSU and what&apos;s still needed.</p>
                </div>
              </div>
            </div>
            <div className="text-center mt-8">
              <Button onClick={openCatalog} className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none">
                <Plus className="h-4 w-4 mr-2" /> Browse Course Catalog
              </Button>
              <p className="text-xs text-slate-500 mt-3">
                or{" "}
                <button onClick={() => navigate(`/onboarding?reupload=${pid}`)} className="underline font-medium text-indigo-600 hover:text-indigo-800">
                  upload your transcript
                </button>{" "}
                to get started faster
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Course lists */}
            <div className="space-y-5">
              {[
                { label: t("pages.courses.sectionCompleted"),   items: completed,  statusClass: "bg-emerald-100 text-emerald-700" },
                { label: t("pages.courses.sectionInProgress"), items: inProgress, statusClass: "bg-blue-100 text-blue-700" },
                { label: t("pages.courses.sectionPlanned"),     items: planned,    statusClass: "bg-slate-100 text-slate-600" },
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
                          {course.id && (<button onClick={() => deleteCourse(course.id!)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Transferability Analysis CTA */}
            {analysis ? (
              <div className="mt-8 bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-200 rounded-2xl p-5">
                <div className="flex items-start sm:items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-indigo-900">Analysis Complete</h3>
                    <p className="text-xs text-indigo-600">Last analyzed: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <Button onClick={runAnalysis} disabled={analyzing} variant="outline" size="sm" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 rounded-none flex-shrink-0">
                    {analyzing ? <><KaleonLoader size={14} /> Re-analyzing…</> : "Re-analyze"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-8 bg-gradient-to-br from-teal-50 to-slate-50 border border-teal-200 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-teal-900 flex items-center gap-2">
                      <FlaskConical className="h-5 w-5 text-teal-500" />
                      Check Course Transferability
                    </h2>
                    <p className="text-sm text-teal-700 mt-1">
                      AI will cross-reference your {courses.length} course{courses.length !== 1 ? "s" : ""} against{" "}
                      <span className="relative group cursor-help" title="An articulation agreement is a formal agreement between two colleges specifying which courses transfer between them. ASSIST.org is California's official repository of these agreements.">
                        ASSIST.org articulation agreements
                        <Info className="inline h-3 w-3 ml-0.5 text-teal-400 align-middle" />
                      </span>{" "}
                      to identify which California universities best match your coursework and show your IGETC progress.
                    </p>
                  </div>
                  <Button onClick={runAnalysis} disabled={analyzing} className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none flex-shrink-0 min-w-[180px]">
                    {analyzing ? (
                      <><KaleonLoader size={16} /> Analyzing…</>
                    ) : (
                      <><FlaskConical className="h-4 w-4 mr-2" /> Analyze My Courses</>
                    )}
                  </Button>
                </div>
                {analyzing && (
                  <div className="mt-4 bg-white/60 rounded-xl p-4 text-center">
                    <KaleonLoader size={32} />
                    <p className="text-sm font-medium text-teal-800">{t("pages.courses.checkingArticulation")}</p>
                    <p className="text-xs text-teal-500 mt-1">{t("pages.courses.crossReferencing")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {analysis && (
              <div id="transfer-results">
                <TransferabilityPanel result={analysis} />
              </div>
            )}
          </>
        )}

        {/* Motivational context */}
        {courses.length > 0 && (
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)" }}>
              <p className="font-bold text-sm" style={{ color: "#d97706" }}>One Wrong Class Can Ruin Everything</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#92400e", filter: "brightness(2)" }}>
                Classes that don't transfer can prevent you from being admitted. Our AI cross-references every course against ASSIST.org to make sure you're on track.
              </p>
            </div>
            <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(78,204,163,0.04)", border: "1px solid rgba(78,204,163,0.15)" }}>
              <p className="font-bold text-sm" style={{ color: "#059669" }}>Save Money</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#64748b" }}>
                Save hundreds by avoiding private counselors and wasted tuition on courses that don't apply toward your transfer requirements.
              </p>
            </div>
          </div>
        )}

        <div className="text-center py-6">
          {hasPathways ? (
            <Button onClick={() => navigate(`/pathways/${pid}`)} className="bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-600 rounded-none">
              View Your Pathway <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => navigate(`/pathways/${pid}`)} className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none">
              Generate Your Pathway <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </PageMotion>
    </AppPageLayout>
  );
}
