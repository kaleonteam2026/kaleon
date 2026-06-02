import type { EntryType } from "./progress-types";
import {
  BarChart3, Award, Briefcase, CheckCircle2, Star, AlertCircle, FileText,
  type LucideIcon,
} from "lucide-react";

export type EntryTypeConfig = {
  labelKey: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  descKey: string;
};

export const ENTRY_TYPES: Record<EntryType, EntryTypeConfig> = {
  gpa_update:    { labelKey: "pages.progress.et_gpa_label",         icon: BarChart3,     color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",    descKey: "pages.progress.et_gpa_desc" },
  certification: { labelKey: "pages.progress.et_cert_label",        icon: Award,         color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",   descKey: "pages.progress.et_cert_desc" },
  opportunity:   { labelKey: "pages.progress.et_opp_label",         icon: Briefcase,     color: "text-teal-700",    bg: "bg-teal-50",    border: "border-teal-200",    descKey: "pages.progress.et_opp_desc" },
  milestone:     { labelKey: "pages.progress.et_milestone_label",   icon: CheckCircle2,  color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", descKey: "pages.progress.et_milestone_desc" },
  achievement:   { labelKey: "pages.progress.et_achievement_label", icon: Star,          color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200",  descKey: "pages.progress.et_achievement_desc" },
  setback:       { labelKey: "pages.progress.et_setback_label",     icon: AlertCircle,   color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200",    descKey: "pages.progress.et_setback_desc" },
  note:          { labelKey: "pages.progress.et_note_label",        icon: FileText,      color: "text-slate-700",   bg: "bg-slate-50",   border: "border-slate-200",   descKey: "pages.progress.et_note_desc" },
};
