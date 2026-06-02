import { useEffect, useState, useMemo, useRef } from "react";
import { Search, X, ChevronRight, BookOpen, GraduationCap, Library, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";
import type { CatalogCourse } from "./course-types";

const CATEGORY_ICON: Record<string, typeof BookOpen> = {
  "Major Requirements":         GraduationCap,
  "IGETC / GE Requirements":    Library,
  "Electives & Prerequisites":  BookOpen,
};

interface CoursePickerProps {
  catalog: {
    college: string;
    major: string;
    categories: string[];
    courses: CatalogCourse[];
  };
  alreadyAdded: Set<string>;
  onPick: (course: CatalogCourse) => void;
  onClose: () => void;
}

export function CoursePicker({ catalog, alreadyAdded, onPick, onClose }: CoursePickerProps) {
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
            placeholder={t("pages.courses.catalogSearchPlaceholder")}
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
          <div className="text-center py-10 text-slate-600 text-sm">{t("pages.courses.noCoursesMatch")}</div>
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
                    <span className="text-xs text-slate-600 ml-auto flex-shrink-0">{t("pages.courses.unitsLabel", { count: c.units })}</span>
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
                      <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-full">{t("pages.courses.transferable")}</span>
                    )}
                    {added && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{t("pages.courses.alreadyAdded")}</span>}
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
