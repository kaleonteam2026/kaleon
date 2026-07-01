import { useState } from "react";
import { Plus } from "lucide-react";
import { KaleonLoader } from "@/components/ui/kaleon-loader";
import { t } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADES } from "./course-types";
import type { CatalogCourse } from "./course-types";

interface CourseDetailFormProps {
  course: CatalogCourse;
  onSave: (data: { grade?: string; status: string; term: string }) => void;
  onBack: () => void;
  saving: boolean;
}

export function CourseDetailForm({ course, onSave, onBack, saving }: CourseDetailFormProps) {
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
              <SelectItem value="completed">{t("pages.courses.statusCompleted")}</SelectItem>
              <SelectItem value="in_progress">{t("pages.courses.statusInProgress")}</SelectItem>
              <SelectItem value="planned">{t("pages.courses.statusPlanned")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {status === "completed" && (
          <div className="space-y-1.5">
            <Label>Grade</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger><SelectValue placeholder={t("pages.courses.gradePlaceholder")} /></SelectTrigger>
              <SelectContent>
                {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Term (optional)</Label>
        <Input value={term} onChange={e => setTerm(e.target.value)} placeholder={t("pages.courses.termPlaceholder")} />
      </div>

      <Button
        onClick={() => onSave({ grade: grade || undefined, status, term })}
        disabled={saving}
        className="w-full bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none"
      >
        {saving ? <KaleonLoader size={16} /> : <Plus className="h-4 w-4 mr-2" />}
        Add to My Courses
      </Button>
    </div>
  );
}
