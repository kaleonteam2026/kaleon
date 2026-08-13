import { useState, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { KaleonLoader } from "@/components/ui/kaleon-loader";
import { t } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { CoursePicker } from "./course-picker";
import { CourseDetailForm } from "./course-detail-form";
import type { CatalogCourse, CourseCatalog } from "./course-types";

interface CatalogModalProps {
  open: boolean;
  onClose: () => void;
  catalog: CourseCatalog | null;
  catalogLoading: boolean;
  catalogError: string | null;
  alreadyAdded: Set<string>;
  onAddCourse: (course: CatalogCourse, detail: { grade?: string; status: string; term: string }) => Promise<void>;
  pid: number;
}

export function CatalogModal({
  open, onClose, catalog, catalogLoading, catalogError, alreadyAdded, onAddCourse
}: CatalogModalProps) {
  const [selected, setSelected] = useState<CatalogCourse | null>(null);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, open, onClose);

  if (!open) return null;

  const handleSave = async (detail: { grade?: string; status: string; term: string }) => {
    if (!selected) return;
    setSaving(true);
    try {
      await onAddCourse(selected, detail);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-modal-title"
        tabIndex={-1}
        className="relative bg-white w-full sm:max-w-xl sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden focus:outline-none"
        style={{ height: "85vh" }}>
        <h2 id="catalog-modal-title" className="sr-only">{t("pages.courses.catalogModalTitle")}</h2>

        {catalogLoading && (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
            <KaleonLoader size={32} />
            <p className="text-sm font-medium text-slate-700 text-center">
              Loading your college's course catalog…
            </p>
            <p className="text-xs text-slate-600 text-center">
              Fetching courses specific to your college and major. This takes about 15 seconds.
            </p>
          </div>
        )}

        {catalogError && (
          <div className="p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
            <p className="text-sm font-medium text-slate-700">{catalogError}</p>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}

        {!catalogLoading && !catalogError && catalog && (
          selected ? (
            <CourseDetailForm
              course={selected}
              onSave={handleSave}
              onBack={() => setSelected(null)}
              saving={saving}
            />
          ) : (
            <CoursePicker
              catalog={catalog}
              alreadyAdded={alreadyAdded}
              onPick={setSelected}
              onClose={onClose}
            />
          )
        )}
      </div>
    </div>
  );
}
