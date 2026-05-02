import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, ArrowRight, BookOpen, TrendingUp } from "lucide-react";

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

const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "P", "NP", "W", "IP"];

const EMPTY_COURSE = { courseCode: "", courseName: "", units: "3", grade: "", status: "completed", term: "" };

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

  const pid = parseInt(profileId);

  const loadCourses = () => {
    Promise.all([
      fetch(`/api/profiles/${pid}/courses`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" }).then(r => r.json()),
    ])
      .then(([c, g]: [Course[], GpaSummary]) => {
        setCourses(c);
        setGpa(g);
      })
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
      // Refresh GPA
      fetch(`/api/profiles/${pid}/gpa-summary`, { credentials: "include" })
        .then(r => r.json())
        .then((g: GpaSummary) => setGpa(g))
        .catch(() => {});
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
      toast({ title: "Course removed" });
    } catch {
      toast({ title: "Error removing course", variant: "destructive" });
    }
  };

  const completed = courses.filter(c => c.status === "completed");
  const inProgress = courses.filter(c => c.status === "in_progress");
  const planned = courses.filter(c => c.status === "planned");

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
        <div className="py-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
            <p className="text-slate-500 text-sm mt-1">Track your completed and in-progress courses for GPA and transfer readiness.</p>
          </div>
          <Button onClick={() => setAdding(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> Add Course
          </Button>
        </div>

        {/* GPA Summary */}
        {gpa && gpa.courseCount > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Estimated GPA", value: gpa.estimatedGpa > 0 ? gpa.estimatedGpa.toFixed(2) : "—", icon: TrendingUp },
              { label: "Total Units", value: gpa.totalUnits, icon: BookOpen },
              { label: "Completed", value: gpa.completedUnits + " units", icon: BookOpen },
              { label: "In Progress", value: gpa.inProgressUnits + " units", icon: BookOpen },
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
            <CardHeader>
              <CardTitle className="text-base">Add a Course</CardTitle>
            </CardHeader>
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

        {/* Course lists */}
        {courses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No courses yet. Add your completed and in-progress courses.</p>
            <Button onClick={() => setAdding(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Add First Course
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {[
              { label: "Completed", items: completed, statusClass: "bg-emerald-100 text-emerald-700" },
              { label: "In Progress", items: inProgress, statusClass: "bg-blue-100 text-blue-700" },
              { label: "Planned", items: planned, statusClass: "bg-slate-100 text-slate-600" },
            ].filter(g => g.items.length > 0).map(group => (
              <Card key={group.label}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${group.statusClass}`}>
                      {group.label}
                    </span>
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
        )}

        {/* Continue button */}
        <div className="py-8 text-right">
          <Button onClick={() => navigate(`/matches/${pid}`)} className="bg-indigo-600 hover:bg-indigo-700">
            View University Matches <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-slate-400 text-center pb-8">
          GPA calculations are estimates based on entered grades. Verify your official GPA with your college transcript.
        </p>
      </main>
    </div>
  );
}
