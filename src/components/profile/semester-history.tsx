import { useState, useEffect } from "react";
import { Plus, Trash2, GraduationCap, BookOpen } from "lucide-react";
import { KaleonLoader } from "@/components/ui/kaleon-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { getSemesterSnapshots, deleteSnapshot, createSnapshot } from "@/lib/supabase-semesters";
import { isAuthBypass, getDevSemesterSnapshots, saveDevSemesterSnapshot, deleteDevSemesterSnapshot } from "@/lib/dev-profile";
import { isSupabaseConfigured } from "@/lib/supabase";
import { GRADUATION_UNITS } from "@/lib/course-progress";
import type { SemesterSnapshot, SnapshotCourse } from "@/types/semester";

interface SemesterHistoryProps {
  profileId: number;
}

export function SemesterHistory({ profileId }: SemesterHistoryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [snapshots, setSnapshots] = useState<(SemesterSnapshot & { courses: SnapshotCourse[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newGpa, setNewGpa] = useState("");
  const [newUnits, setNewUnits] = useState("");
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const bypass = isAuthBypass();

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      if (bypass) {
        const devData = getDevSemesterSnapshots(profileId);
        setSnapshots(devData.map((d) => ({
          id: d.id,
          user_id: user?.id ?? "",
          profile_id: d.profile_id,
          term_label: d.term_label,
          college: d.college,
          term_gpa: d.term_gpa,
          cumulative_gpa: d.cumulative_gpa,
          term_units: d.term_units,
          cumulative_units: d.cumulative_units,
          course_count: d.course_count,
          created_at: d.created_at,
          updated_at: d.created_at,
          courses: d.courses.map((c, i) => ({
            id: i,
            snapshot_id: d.id,
            course_code: c.course_code ?? null,
            course_name: c.course_name,
            units: c.units ?? null,
            grade: c.grade ?? null,
          })),
        })));
      } else if (isSupabaseConfigured) {
        const data = await getSemesterSnapshots(profileId);
        setSnapshots(data);
      }
    } catch (e) {
      console.error("Failed to load semester snapshots:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, [profileId]);

  const handleDelete = async (snapshotId: number) => {
    setDeleting((prev) => new Set(prev).add(snapshotId));
    try {
      if (bypass) {
        deleteDevSemesterSnapshot(snapshotId);
      } else {
        await deleteSnapshot(snapshotId);
      }
      await loadSnapshots();
      toast({ title: "Semester deleted" });
    } catch {
      toast({ title: "Failed to delete semester", variant: "destructive" });
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(snapshotId);
        return next;
      });
    }
  };

  const handleAdd = async () => {
    if (!newTerm.trim()) {
      toast({ title: "Term label is required", variant: "destructive" });
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    try {
      const gpa = newGpa.trim() ? parseFloat(newGpa) : null;
      const units = newUnits.trim() ? parseFloat(newUnits) : null;

      if (bypass) {
        saveDevSemesterSnapshot(profileId, {
          user_id: user.id,
          profile_id: profileId,
          term_label: newTerm.trim(),
          college: "Manual Entry",
          cumulative_gpa: gpa,
          cumulative_units: units,
          term_gpa: gpa,
          term_units: units,
          courses: [],
        });
      } else if (isSupabaseConfigured) {
        await createSnapshot({
          user_id: user.id,
          profile_id: profileId,
          term_label: newTerm.trim(),
          college: "Manual Entry",
          cumulative_gpa: gpa,
          cumulative_units: units,
          term_gpa: gpa,
          term_units: units,
          courses: [],
        });
      }

      setNewTerm("");
      setNewGpa("");
      setNewUnits("");
      setAdding(false);
      await loadSnapshots();
      toast({ title: "Semester added" });
    } catch {
      toast({ title: "Failed to add semester", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const latestUnits = snapshots.length > 0
    ? (snapshots[snapshots.length - 1].cumulative_units ?? 0)
    : 0;
  const gradPercent = Math.min(100, Math.round((latestUnits / GRADUATION_UNITS) * 100));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Semester History
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Track your progress across semesters
            {latestUnits > 0 && (
              <span className="ml-1">
                · {latestUnits} / {GRADUATION_UNITS} units ({gradPercent}%)
              </span>
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Semester
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <KaleonLoader size={20} />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-6">
            <GraduationCap className="h-8 w-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No semesters recorded yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Complete onboarding with a transcript or add one manually above.
            </p>
          </div>
        ) : (
          <>
            {/* Graduation progress bar */}
            {snapshots.length > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Graduation Progress</span>
                  <span>{latestUnits} / {GRADUATION_UNITS}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${gradPercent}%`, background: "linear-gradient(90deg, #10b981, #059669)" }}
                  />
                </div>
              </div>
            )}

            {/* Semester list */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {[...snapshots].reverse().map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{s.term_label}</span>
                      {s.cumulative_gpa != null && (
                        <span className="text-sm font-mono font-bold text-emerald-600">
                          {s.cumulative_gpa.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      {s.college && <span className="truncate max-w-[140px]">{s.college}</span>}
                      {s.college && s.cumulative_units != null && <span>·</span>}
                      {s.cumulative_units != null && <span>{s.cumulative_units} units</span>}
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {s.course_count} course{s.course_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting.has(s.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition disabled:opacity-40"
                    title="Delete semester"
                  >
                    {deleting.has(s.id) ? (
                      <KaleonLoader size={14} />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Add semester form */}
        {adding && (
          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 space-y-3">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">New Semester</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-emerald-700">Term</Label>
                <Input
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder='e.g. "Fall 2025"'
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-emerald-700">Cumulative GPA</Label>
                <Input
                  value={newGpa}
                  onChange={(e) => setNewGpa(e.target.value)}
                  placeholder="3.5"
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-emerald-700">Units</Label>
                <Input
                  value={newUnits}
                  onChange={(e) => setNewUnits(e.target.value)}
                  placeholder="15"
                  type="number"
                  min="0"
                  step="0.5"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setAdding(false); setNewTerm(""); setNewGpa(""); setNewUnits(""); }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAdd}
                disabled={saving || !newTerm.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? <KaleonLoader size={14} /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
