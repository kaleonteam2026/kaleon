import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";
import type { CourseTransferResult } from "./course-types";

const STATUS_CONFIG: Record<string, { labelKey: string; icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  transferable: { labelKey: "pages.courses.status_transferable", icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  likely:       { labelKey: "pages.courses.status_likely",       icon: CheckCircle2, color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200" },
  uncertain:    { labelKey: "pages.courses.status_uncertain",    icon: HelpCircle,   color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200" },
  unlikely:     { labelKey: "pages.courses.status_unlikely",     icon: XCircle,      color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200" },
};

export function StatusBadge({ status }: { status: CourseTransferResult["status"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
      <Icon className="h-3 w-3" />
      {t(cfg.labelKey)}
    </span>
  );
}
