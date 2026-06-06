import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { PageMotion } from "@/components/page-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/copy";
import {
  transferProgressPercent, transferUnitsRemaining,
} from "@/lib/course-progress";
import {
  Plus, Trash2, Loader2, ArrowRight, BookOpen, FlaskConical,
  GraduationCap, ChevronDown,
} from "lucide-react";
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
  const { toast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [gpa, setGpa] = useState<GpaSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Pathways (school) state
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolIdx, setSelectedSchoolIdx] = useState(0);

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
      fetch(`/api/profiles/${pid}/pathways`, { credentials: "include" })
        .then(r => r.json())
        .catch(() => []),
    ])
      .then(([c, g, pathways]: [Course[], GpaSummary, unknown[]]) => {
        setCourses(c);
        setGpa(g);
        // Extract school options from pathways
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
        // Always include a default "Transfer Minimum" option
        schoolOpts.push({ name: "Transfer Minimum", requiredUnits: DEFAULT_TRANSFER_UNITS });
        setSchools(schoolOpts);
        setSelectedSchoolIdx(0);
      })
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
        throw new Error(err.error ?? t("pages.courses.couldNotLoadCatalog"));
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
      .then(r => r.json()).then((g: GpaSummary) => setGpa(g)).catch(() => {});
    toast({ title: t("pages.courses.toastAdded", { code: catalogCourse.courseCode }) });
  };

  const deleteCourse = async (courseId: number) => {
    try {
      await fetch(`/api/courses/${courseId}`, { method: "DELETE", credentials: "include" });
      setCourses(prev => prev.filter(c => c.id !== courseId));
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
      const r = await fetch(`/api/profiles/${pid}/transferability-analysis`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) {
        const err = await r.json() as { error?: string };
        throw new Error(err.error ?? t("pages.courses.analysisFailed"));
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
    return <PageLoadingState />;
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
            Select courses directly from your college&apos;s catalog to ensure accurate course codes and unit counts.
          </p>
        </div>
        <Button onClick={openCatalog} className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" /> Add Course
        </Button>
      </div>

      <PageMotion>
        {/* GPA Summary */}
        {gpa && gpa.courseCount > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: t("pages.courses.estimatedGpa"),  value: gpa.estimatedGpa > 0 ? gpa.estimatedGpa.toFixed(2) : "—" },
              { label: t("pages.courses.totalUnits"),    value: gpa.totalUnits },
              { label: t("pages.courses.sectionCompleted"),      value: `${gpa.completedUnits} ${t("pages.courses.totalUnits").toLowerCase()}` },
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

        {/* Empty state */}
        {courses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium mb-1">{t("pages.courses.empty")}</p>
            <p className="text-slate-600 text-sm mb-6">
              Browse your college&apos;s actual course catalog and add the courses you&apos;ve completed or are taking.
            </p>
            <Button onClick={openCatalog} className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none">
              <Plus className="h-4 w-4 mr-2" /> Browse Course Catalog
            </Button>
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
            <div className="mt-8 bg-gradient-to-br from-teal-50 to-slate-50 border border-teal-200 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-base font-bold text-teal-900 flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-teal-500" />
                    Check Course Transferability
                  </h2>
                  <p className="text-sm text-teal-700 mt-1">
                    AI will cross-reference your {courses.length} course{courses.length !== 1 ? "s" : ""} against ASSIST.org articulation agreements to identify which California universities best match your coursework and show your IGETC progress.
                  </p>
                </div>
                <Button onClick={runAnalysis} disabled={analyzing} className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none flex-shrink-0 min-w-[180px]">
                  {analyzing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing…</>
                  ) : (
                    <><FlaskConical className="h-4 w-4 mr-2" /> Analyze My Courses</>
                  )}
                </Button>
              </div>
              {analyzing && (
                <div className="mt-4 bg-white/60 rounded-xl p-4 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-teal-800">{t("pages.courses.checkingArticulation")}</p>
                  <p className="text-xs text-teal-500 mt-1">{t("pages.courses.crossReferencing")}</p>
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
          <Button onClick={() => navigate(`/pathways/${pid}`)} className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none">
            View My Pathway <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </PageMotion>
    </AppPageLayout>
  );
}
