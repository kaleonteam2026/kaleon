import { cn } from "@/lib/utils";
import type { ProgressAnalysis } from "./progress-types";

interface AnalysisCardProps {
  analysis: ProgressAnalysis;
  isActive: boolean;
  onClick: () => void;
}

export function AnalysisCard({ analysis, isActive, onClick }: AnalysisCardProps) {
  const score = analysis.overallScore ?? 0;
  const color = score >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-rose-600 bg-rose-50 border-rose-200";
  return (
    <button
      onClick={onClick}
      className={cn("w-full text-left p-3 rounded-xl border transition-all",
        isActive ? "border-indigo-400 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-600">
          {new Date(analysis.createdAt).toLocaleDateString('en-US', { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", color)}>{score}/100</span>
      </div>
      {analysis.summary && <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">{analysis.summary}</p>}
    </button>
  );
}
