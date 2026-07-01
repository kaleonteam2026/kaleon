import { useState } from "react";
import { Trash2, Clock } from "lucide-react";
import { KaleonLoader } from "@/components/ui/kaleon-loader";
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";
import { ENTRY_TYPES } from "./entry-types-config";
import type { ProgressEntry } from "./progress-types";

interface EntryCardProps {
  entry: ProgressEntry;
  onDelete: (id: number) => void;
}

export function EntryCard({ entry, onDelete }: EntryCardProps) {
  const cfg = ENTRY_TYPES[entry.entryType] ?? ENTRY_TYPES.note;
  const Icon = cfg.icon;
  const [deleting, setDeleting] = useState(false);
  return (
    <div className={cn("relative flex gap-3 p-4 rounded-xl border bg-white shadow-sm transition-all hover:shadow", cfg.border)}>
      <div className={cn("flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center", cfg.bg)}>
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-full border", cfg.bg, cfg.color, cfg.border)}>{t(cfg.labelKey)}</span>
            <p className="mt-1 text-sm font-semibold text-slate-800 leading-tight">{entry.title}</p>
            {entry.numericValue != null && (
              <p className="text-xs text-slate-600 mt-0.5">{t("pages.progress.gpaLabel")} <strong className="text-slate-800">{entry.numericValue.toFixed(2)}</strong></p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {entry.entryDate && (
              <span className="text-xs text-slate-600 flex items-center gap-1"><Clock className="h-3 w-3" />{entry.entryDate}</span>
            )}
            <button
              onClick={async () => { setDeleting(true); await onDelete(entry.id); setDeleting(false); }}
              disabled={deleting}
              className="text-slate-300 hover:text-rose-400 transition p-0.5"
              title={t("pages.progress.deleteEntry")}
            >
              {deleting ? <KaleonLoader size={14} /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        {entry.description && <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{entry.description}</p>}
      </div>
    </div>
  );
}
