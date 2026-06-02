import { useReducedMotion } from "framer-motion";
import { Plus, ChevronRight, ArrowRight, BookOpen, TrendingUp, RefreshCcw, Info, CheckCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { AdmissionBadge } from "./admission-badge";
import type { EntryFeedback } from "./progress-types";

interface EntryFeedbackCardProps {
  feedback: EntryFeedback;
  onDismiss: () => void;
  entryTitle: string;
}

export function EntryFeedbackCard({ feedback, onDismiss, entryTitle }: EntryFeedbackCardProps) {
  const reducedMotion = useReducedMotion();
  const severityConfig = {
    positive: { bg: "bg-emerald-50", border: "border-emerald-300", icon: CheckCheck, iconColor: "text-emerald-600", label: t("pages.progress.alignedWithGuidebook"), labelBg: "bg-emerald-100 text-emerald-700" },
    caution:  { bg: "bg-amber-50",   border: "border-amber-300",   icon: Info,       iconColor: "text-amber-600",   label: t("pages.progress.reviewRecommended"),    labelBg: "bg-amber-100 text-amber-700" },
    concern:  { bg: "bg-rose-50",    border: "border-rose-300",    icon: XCircle,    iconColor: "text-rose-600",    label: t("pages.progress.needsAttentionLabel"),  labelBg: "bg-rose-100 text-rose-700" },
  };
  const cfg = severityConfig[feedback.severity];
  const Icon = cfg.icon;

  return (
    <div className={cn("rounded-2xl border-2 p-5 space-y-4 animate-in fade-in duration-300", reducedMotion ? "" : "slide-in-from-bottom-2", cfg.bg, cfg.border)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", cfg.bg, "border", cfg.border)}>
            <Icon className={cn("h-4 w-4", cfg.iconColor)} />
          </div>
          <div>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", cfg.labelBg)}>{cfg.label}</span>
            <p className="text-sm font-bold text-slate-800 mt-1">{feedback.heading}</p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-slate-600 hover:text-slate-600 text-lg leading-none flex-shrink-0 mt-0.5">&times;</button>
      </div>

      {/* Admission chance */}
      <AdmissionBadge chance={feedback.currentAdmissionChance} delta={feedback.admissionImpactDelta} />

      {/* Alignment score */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-600 text-xs">{t("pages.progress.guidebookAlignment")}</span>
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-32">
          <div
            className={cn("h-full rounded-full transition-all duration-700",
              feedback.alignmentScore >= 70 ? "bg-emerald-500" : feedback.alignmentScore >= 40 ? "bg-amber-500" : "bg-rose-500"
            )}
            style={{ width: `${feedback.alignmentScore}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-600">{feedback.alignmentScore}/100</span>
      </div>

      {/* Guidebook check */}
      <p className="text-xs text-slate-600 italic border-l-2 border-slate-300 pl-3">{feedback.guidebookCheck}</p>

      {/* Main feedback */}
      <p className="text-sm text-slate-700 leading-relaxed">{feedback.feedback}</p>

      {/* Action steps — label and color changes based on severity */}
      {feedback.reconciliationSteps.length > 0 && (() => {
        const stepConfig = feedback.severity === "positive"
          ? { label: t("pages.progress.waysToMaximize"), border: "border-emerald-200", labelColor: "text-emerald-700", arrowColor: "text-emerald-500", icon: TrendingUp }
          : feedback.severity === "caution"
          ? { label: t("pages.progress.alignmentSuggestions"), border: "border-amber-200", labelColor: "text-amber-700", arrowColor: "text-amber-500", icon: Info }
          : { label: t("pages.progress.caReconciliation"), border: "border-rose-200", labelColor: "text-rose-700", arrowColor: "text-rose-400", icon: RefreshCcw };
        const StepIcon = stepConfig.icon;
        return (
          <div className={cn("bg-white/80 rounded-xl border p-4", stepConfig.border)}>
            <p className={cn("text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1", stepConfig.labelColor)}>
              <StepIcon className="h-3 w-3" /> {stepConfig.label}
            </p>
            <ul className="space-y-2">
              {feedback.reconciliationSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <ChevronRight className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", stepConfig.arrowColor)} />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Next aligned actions */}
      {feedback.nextAlignedActions.length > 0 && (
        <div className="bg-white/80 rounded-xl border border-emerald-200 p-4">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> {t("pages.progress.nextStepsGuidebook")}
          </p>
          <ul className="space-y-2">
            {feedback.nextAlignedActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <ArrowRight className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={onDismiss} className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" />{t("pages.progress.logAnotherUpdate")}
      </Button>
    </div>
  );
}
