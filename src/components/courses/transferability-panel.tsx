import { useState } from "react";
import { CheckCircle2, AlertCircle, Star, School, BookOpen, FlaskConical, ExternalLink, Info } from "lucide-react";
// Note: using direct import — lucide-react icons are destructured in the original code
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";
import { CourseAnalysisRow } from "./course-analysis-row";
import { IGETC_AREAS, CSU_GE_AREAS } from "./course-types";
import type { TransferabilityResult } from "./course-types";

const SYSTEM_COLOR: Record<string, string> = {
  UC: "bg-blue-100 text-blue-700", CSU: "bg-green-100 text-green-700", Private: "bg-purple-100 text-purple-700",
};

export function TransferabilityPanel({ result }: { result: TransferabilityResult }) {
  const [showIgetcInfo, setShowIgetcInfo] = useState(false);
  const [showCsuInfo, setShowCsuInfo] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const igetc = result.igetcSummary;
  const completedCount = IGETC_AREAS.filter(a => igetc[a.key as keyof typeof igetc]).length;
  return (
    <div className="space-y-6 mt-6 pb-8">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FlaskConical className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-900 mb-1">
              {t("pages.courses.transferableUnitsFrom", { units: result.totalTransferableUnits, college: result.communityCollege })}
            </p>
            <p className="text-sm text-indigo-700 leading-relaxed">{result.summary}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <School className="h-4 w-4 text-indigo-500" />
          {t("pages.courses.bestUniMatches")}
        </h2>
        <div className="space-y-3">
          {result.bestMatches.map((m, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm transition-all hover:border-indigo-300 hover:shadow-md cursor-pointer" onClick={() => setExpandedCard(expandedCard === i ? null : i)}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {i === 0 && <Star className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{m.university}</span>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", SYSTEM_COLOR[m.system] ?? "bg-slate-100 text-slate-600")}>{m.system}</span>
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                        m.matchScore >= 80 ? "bg-emerald-100 text-emerald-700" : m.matchScore >= 65 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                      )}>{t("pages.courses.percentMatch", { score: m.matchScore })}</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-1.5">{m.matchReason}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", m.matchScore >= 80 ? "bg-emerald-400" : m.matchScore >= 65 ? "bg-amber-400" : "bg-rose-400")}
                          style={{ width: `${(m.transferableCount / Math.max(m.totalCourses, 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-600 whitespace-nowrap">{t("pages.courses.coursesTransferRatio", { transferable: m.transferableCount, total: m.totalCourses })}</span>
                    </div>
                  </div>
                </div>
              </div>
              {expandedCard === i && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 rounded-b-xl">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Why this match:</strong> {m.matchReason}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Compare this university&apos;s transfer requirements on{" "}
                    <a href="https://assist.org" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                      assist.org
                    </a>
                    {" "}or discuss with your counselor.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          {t("pages.courses.igetcCompletion", { count: completedCount, total: IGETC_AREAS.length })}
          <button onClick={() => setShowIgetcInfo(!showIgetcInfo)} className="ml-1 text-slate-400 hover:text-slate-600 transition-colors" title="What is IGETC?">
            <Info className="h-4 w-4" />
          </button>
        </h2>
        {showIgetcInfo && (
          <div className="mb-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
            IGETC (Intersegmental General Education Transfer Curriculum) is a set of general education courses that community college students can complete to satisfy lower-division GE requirements at any UC or most CSU campuses. Completing IGETC means you won't need to take additional GE courses after transferring.
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {IGETC_AREAS.map((area, i) => {
            const done = igetc[area.key as keyof typeof igetc];
            return (
              <div key={area.key} className={cn("flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                <span className={cn("text-sm", done ? "text-slate-800 font-medium" : "text-slate-600")}>{t(area.labelKey)}</span>
                <span className={cn("ml-auto text-xs font-semibold px-2 py-0.5 rounded-full", done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                  {done ? t("pages.courses.complete") : t("pages.courses.needed")}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-600 mt-2">
          {t("pages.courses.igetcQualifies")}{" "}
          <a href="https://assist.org" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{t("pages.courses.verifyAssist")}</a>
        </p>
      </div>

      {result.calgetcSummary && (
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-teal-500" />
          CalGETC (CSU GE Breadth) — {result.calgetcSummary.completedAreas.length}/{CSU_GE_AREAS.length}
          <button onClick={() => setShowCsuInfo(!showCsuInfo)} className="ml-1 text-slate-400 hover:text-slate-600 transition-colors" title="What is CSU GE Breadth?">
            <Info className="h-4 w-4" />
          </button>
        </h2>
        {showCsuInfo && (
          <div className="mb-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
            CSU General Education Breadth (also called CalGETC) is a set of courses that satisfy the lower-division GE requirements at any California State University campus. It covers areas like written communication, critical thinking, math, sciences, arts, humanities, social sciences, and ethnic studies.
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {CSU_GE_AREAS.map((area, i) => {
            const done = result.calgetcSummary![area.key as keyof typeof result.calgetcSummary];
            return (
              <div key={area.key} className={cn("flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                {done ? <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                <span className={cn("text-sm", done ? "text-slate-800 font-medium" : "text-slate-600")}>{t(area.labelKey)}</span>
                <span className={cn("ml-auto text-xs font-semibold px-2 py-0.5 rounded-full", done ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-600")}>
                  {done ? t("pages.courses.complete") : t("pages.courses.needed")}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-600 mt-2">
          CSU GE Breadth (CalGETC) requirements for CSU transfer.{" "}
          <a href="https://assist.org" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{t("pages.courses.verifyAssist")}</a>
        </p>
      </div>
      )}

      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-600" />
          {t("pages.courses.analysisHeader")}
          <span className="text-xs font-normal text-slate-600">{t("pages.courses.tapRowDetails")}</span>
        </h2>
        <div className="space-y-2">
          {result.courseAnalysis.map((c, i) => <CourseAnalysisRow key={i} c={c} />)}
        </div>
      </div>

      {result.recommendations.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-indigo-500" />
            {t("pages.courses.nextStepsHeader")}
          </h2>
          <ul className="space-y-2">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-indigo-800">
                <span className="text-indigo-400 font-bold mt-0.5">{i + 1}.</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-600 text-center">
        {t("pages.courses.aiDisclaimerPrefix")}
        <a href="https://assist.org" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">assist.org</a>
        {t("pages.courses.aiDisclaimerSuffix")}
      </p>
    </div>
  );
}
