import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";
import { StatusBadge } from "./status-badge";
import type { CourseTransferResult } from "./course-types";

const STATUS_CONFIG: Record<string, { border: string; bg: string }> = {
  transferable: { border: "border-emerald-200", bg: "bg-emerald-50" },
  likely:       { border: "border-blue-200",    bg: "bg-blue-50" },
  uncertain:    { border: "border-amber-200",   bg: "bg-amber-50" },
  unlikely:     { border: "border-rose-200",    bg: "bg-rose-50" },
};

export function CourseAnalysisRow({ c }: { c: CourseTransferResult }) {
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
            <span className="text-xs text-slate-600">{t("pages.courses.unitsLabel", { count: c.units })}</span>
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
            <ExternalLink className="h-3 w-3" /> {t("pages.courses.verifyOnAssist")}
          </a>
        </div>
      )}
    </div>
  );
}
