import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";

export function ScoreRing({ score }: { score: number }) {
  const reducedMotion = useReducedMotion();
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 75 ? t("pages.progress.onTrack") : score >= 50 ? t("pages.progress.needsAttention") : t("pages.progress.atRisk");
  const labelColor = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={reducedMotion ? undefined : { transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-800">{score}</span>
      </div>
      <div>
        <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-0.5">{t("pages.progress.trajectoryScore")}</p>
        <p className={cn("text-lg font-bold", labelColor)}>{label}</p>
        <p className="text-xs text-slate-600 mt-0.5">{t("pages.progress.outOf100")}</p>
      </div>
    </div>
  );
}
