import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";

export function AdmissionBadge({ chance, delta }: { chance: number; delta: number }) {
  const color = chance >= 70 ? "bg-emerald-50 border-emerald-200 text-emerald-700"
    : chance >= 45 ? "bg-amber-50 border-amber-200 text-amber-700"
    : "bg-rose-50 border-rose-200 text-rose-700";
  const deltaColor = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-slate-600";
  const deltaPrefix = delta > 0 ? "+" : "";
  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-sm", color)}>
      <GraduationCap className="h-4 w-4" />
      <span>{t("pages.progress.admissionChanceLabel", { chance })}</span>
      {delta !== 0 && (
        <span className={cn("text-xs font-bold", deltaColor)}>
          {t("pages.progress.deltaFromUpdate", { prefix: deltaPrefix, delta })}
        </span>
      )}
    </div>
  );
}
