import { useRef, useState } from "react";
import { FileText, Upload, X, Loader2, Info, Sparkles, Check, GraduationCap, ChevronDown, ChevronRight, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";
import { AnimatePresence, motion } from "framer-motion";
import { ParsingMessages } from "./parsing-messages";
import { DUR, EASE_OUT } from "@/lib/motion";
import {
  ONBOARDING_INPUT,
  TRANSFER_TIMELINE_KEYS,
  FINANCIAL_KEYS,
} from "./onboarding-constants";
import { CollegeAutocomplete } from "./college-autocomplete";
import { MajorAutocomplete } from "./major-autocomplete";
import type { FormData, PendingTranscript, ScanResult } from "./onboarding-types";

const choiceBtn = (selected: boolean) =>
  cn(
    "text-sm px-3 py-2.5 rounded-xl border text-left font-medium transition-all",
    selected
      ? "border-transparent text-[#050c18]"
      : "bg-[rgba(5,12,24,0.5)] border-[rgba(78,204,163,0.2)] text-slate-300 hover:border-[rgba(78,204,163,0.45)]",
  );

const choiceBtnStyle = (selected: boolean) =>
  selected ? { background: "linear-gradient(135deg, #4ECCA3, #38b2ac)" } : undefined;

interface FormStepsProps {
  step: number;
  form: FormData;
  onSet: (field: keyof FormData, value: string) => void;
  pendingTranscripts: PendingTranscript[];
  onAddPendingFile: (file: File) => void;
  onUpdatePendingCollege: (id: string, college: string) => void;
  onRemovePendingFile: (id: string) => void;
  scanning: boolean;
  scanError: string | null;
  scanResults: ScanResult[];
  onScan: () => void;
  onRemoveCourseFromScan: (college: string, code: string) => void;
  onAddCourseToScan: (college: string, course: { code: string; name: string; units?: number; term?: string }) => void;
  onUpdateCourseInScan: (college: string, oldCode: string, updated: { code: string; name: string; units?: number; term?: string }) => void;
  onClearAllTranscripts: () => void;
  hasMultipleColleges: boolean | null;
  onSetMultipleColleges: (val: boolean | null) => void;
  motionOn: boolean;
  dir: number;
}

export function FormSteps({
  step, form, onSet,
  pendingTranscripts, onAddPendingFile, onUpdatePendingCollege, onRemovePendingFile,
  scanning, scanError, scanResults, onScan,
  onRemoveCourseFromScan, onAddCourseToScan, onUpdateCourseInScan, onClearAllTranscripts,
  hasMultipleColleges, onSetMultipleColleges,
  motionOn, dir,
}: FormStepsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [consentProcessing, setConsentProcessing] = useState(false);
  const [consentOwnership, setConsentOwnership] = useState(false);
  const consentGiven = consentProcessing && consentOwnership;
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  /** Group courses by term and sort reverse-chronologically. */
  const groupedByTerm = (courses: ScanResult["courses"]) => {
    const groups = new Map<string, typeof courses>();
    const noTerm: typeof courses = [];
    for (const c of courses) {
      if (c.term) {
        const list = groups.get(c.term) ?? [];
        list.push(c);
        groups.set(c.term, list);
      } else {
        noTerm.push(c);
      }
    }
    // Sort terms reverse-chronologically: higher year first, then Fall > Summer > Spring > Winter
    const SEASON_RANK: Record<string, number> = { Fall: 0, Summer: 1, Spring: 2, Winter: 3 };
    const sorted = [...groups.entries()].sort(([a], [b]) => {
      const ay = parseInt(a.match(/\d{4}/)?.[0] ?? "0", 10);
      const by = parseInt(b.match(/\d{4}/)?.[0] ?? "0", 10);
      if (ay !== by) return by - ay;
      const as = SEASON_RANK[a.split(/\s+/)[0]] ?? 99;
      const bs = SEASON_RANK[b.split(/\s+/)[0]] ?? 99;
      return as - bs;
    });
    if (noTerm.length) sorted.push(["Other", noTerm]);
    return sorted;
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        initial={motionOn ? { opacity: 0, x: 12 * dir } : false}
        animate={motionOn ? { opacity: 1, x: 0 } : undefined}
        exit={motionOn ? { opacity: 0, x: -12 * dir } : undefined}
        transition={{ duration: DUR.base, ease: EASE_OUT }}
        className="space-y-5"
      >
        {step === 0 && scanning ? (
          <ParsingMessages visible title="Scanning your transcript..." />
        ) : step === 0 && (
          <fieldset className="space-y-5 border-0 p-0 m-0 min-w-0">
            <legend className="sr-only">{t("pages.onboarding.legend_welcome")}</legend>

            {/* Transcript Upload */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Upload className="h-4 w-4" style={{ color: "#4ECCA3" }} aria-hidden />
                <span className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
                  Upload your transcript
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: "rgba(78,204,163,0.12)", color: "#4ECCA3" }}>
                  Recommended
                </span>
              </div>

              {/* Hidden file input (reused for each "Add Another File" click) */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                aria-label="Upload transcript PDF"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  // Validate MIME type
                  if (f.type && f.type !== "application/pdf") {
                    alert("The selected file is not a PDF. Please upload a PDF transcript.");
                    e.target.value = "";
                    return;
                  }
                  // Check size (20 MB max, 10 MB warning on mobile)
                  if (f.size > 20 * 1024 * 1024) {
                    alert("This file is too large (over 20 MB). Please choose a smaller file.");
                    e.target.value = "";
                    return;
                  }
                  onAddPendingFile(f);
                  e.target.value = "";
                }}
              />

              {/* Consent checkboxes — always shown */}
              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={consentProcessing}
                    onClick={() => setConsentProcessing(p => !p)}
                    className={cn(
                      "mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all",
                      consentProcessing
                        ? "border-[#4ECCA3] bg-[#4ECCA3]"
                        : "border-[rgba(78,204,163,0.3)] bg-transparent",
                    )}
                  >
                    {consentProcessing && <Check className="h-3 w-3" style={{ color: "#050c18" }} strokeWidth={3} />}
                  </button>
                  <label
                    onClick={() => setConsentProcessing(p => !p)}
                    className="text-xs leading-relaxed cursor-pointer select-none"
                    style={{ color: "#cbd5e1" }}
                  >
                    I understand that Kaleon will process my transcript information to generate academic planning recommendations.
                  </label>
                </div>
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={consentOwnership}
                    onClick={() => setConsentOwnership(p => !p)}
                    className={cn(
                      "mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all",
                      consentOwnership
                        ? "border-[#4ECCA3] bg-[#4ECCA3]"
                        : "border-[rgba(78,204,163,0.3)] bg-transparent",
                    )}
                  >
                    {consentOwnership && <Check className="h-3 w-3" style={{ color: "#050c18" }} strokeWidth={3} />}
                  </button>
                  <label
                    onClick={() => setConsentOwnership(p => !p)}
                    className="text-xs leading-relaxed cursor-pointer select-none"
                    style={{ color: "#cbd5e1" }}
                  >
                    I confirm that the transcript I am uploading belongs to me or that I am authorized to provide it.
                  </label>
                </div>
              </div>

              {/* Multi-college question — ask if the transcript might have courses from multiple schools */}
              <div className="mb-3 p-3 rounded-xl" style={{ background: "rgba(78,204,163,0.05)", border: "1px solid rgba(78,204,163,0.15)" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "#cbd5e1" }}>
                  Does this transcript include courses from multiple colleges?
                </p>
                <div className="flex gap-2">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => onSetMultipleColleges(val)}
                      className={cn(
                        "flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all",
                        hasMultipleColleges === val
                          ? "border-transparent text-[#050c18]"
                          : "bg-[rgba(5,12,24,0.5)] border-[rgba(78,204,163,0.2)] text-slate-400 hover:border-[rgba(78,204,163,0.45)]",
                      )}
                      style={hasMultipleColleges === val ? { background: "linear-gradient(135deg, #4ECCA3, #38b2ac)" } : undefined}
                    >
                      {val ? "Yes" : "No"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onSetMultipleColleges(null)}
                    className={cn(
                      "flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all",
                      hasMultipleColleges === null
                        ? "border-transparent text-white"
                        : "bg-[rgba(5,12,24,0.5)] border-[rgba(78,204,163,0.2)] text-slate-400 hover:border-[rgba(78,204,163,0.45)]",
                    )}
                    style={hasMultipleColleges === null ? { background: "rgba(78,204,163,0.15)", border: "1px solid rgba(78,204,163,0.35)" } : undefined}
                  >
                    Not sure
                  </button>
                </div>
              </div>

              {/* ------------------------------------------------- */}
              {/* STAGE A — Empty queue: show upload dashed zone       */}
              {/* ------------------------------------------------- */}
              {pendingTranscripts.length === 0 && scanResults.length === 0 && (
                <button
                  type="button"
                  disabled={!consentGiven}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f && consentGiven) onAddPendingFile(f);
                  }}
                  className={cn(
                    "w-full border-2 border-dashed rounded-2xl p-5 text-center transition-all",
                    consentGiven
                      ? "hover:border-[rgba(78,204,163,0.5)] cursor-pointer"
                      : "opacity-50 cursor-not-allowed",
                  )}
                  style={{ borderColor: "rgba(78,204,163,0.25)", background: "rgba(5,12,24,0.4)" }}
                >
                  <FileText className="h-8 w-8 mx-auto mb-2" style={{ color: "#4ECCA3" }} aria-hidden />
                  <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>Upload your transcript PDF</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>and we'll extract your courses automatically</p>
                  <span
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ border: "1px solid rgba(78,204,163,0.35)", color: consentGiven ? "#4ECCA3" : "#64748b", background: "rgba(78,204,163,0.08)" }}
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden /> Choose PDF File
                  </span>
                </button>
              )}

              {/* ------------------------------------------------- */}
              {/* STAGE B — Files queued, show pending list + Scan   */}
              {/* ------------------------------------------------- */}
              {pendingTranscripts.length > 0 && (
                <div className="space-y-2.5">
                  {pendingTranscripts.map(pt => (
                    <div
                      key={pt.id}
                      className="rounded-xl p-3 flex items-center gap-2"
                      style={{ background: "rgba(5,12,24,0.5)", border: "1px solid rgba(78,204,163,0.2)" }}
                    >
                      <FileText className="h-4 w-4 shrink-0" style={{ color: "#4ECCA3" }} aria-hidden />
                      <span className="text-xs font-medium truncate min-w-0 shrink-0" style={{ color: "#e2e8f0", maxWidth: 120 }}>
                        {pt.file.name}
                      </span>
                      <div className="flex-1 min-w-0">
                        <CollegeAutocomplete
                          value={pt.college}
                          onChange={(val) => onUpdatePendingCollege(pt.id, val)}
                          placeholder="College name…"
                          compact
                        />
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${pt.file.name}`}
                        onClick={() => onRemovePendingFile(pt.id)}
                        className="shrink-0 transition-colors"
                        style={{ color: "#64748b" }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ border: "1px solid rgba(78,204,163,0.3)", color: "#4ECCA3", background: "rgba(78,204,163,0.06)" }}
                    >
                      <Upload className="h-3 w-3" aria-hidden /> Add Another File
                    </button>

                    <button
                      type="button"
                      onClick={onScan}
                      disabled={scanning}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ml-auto border-0 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
                    >
                      {scanning ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Scanning…</>
                      ) : (
                        <>Scan {pendingTranscripts.length} {pendingTranscripts.length === 1 ? "File" : "Files"}</>
                      )}
                    </button>
                  </div>

                  {scanError && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-amber-400">{scanError}</p>
                      <button
                        type="button"
                        onClick={onScan}
                        disabled={scanning}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all self-start"
                        style={{ background: "rgba(78,204,163,0.15)", color: "#4ECCA3", border: "1px solid rgba(78,204,163,0.3)" }}
                      >
                        {scanning ? (
                          <><Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Retrying…</>
                        ) : (
                          <><Sparkles className="h-3 w-3" aria-hidden /> Retry with AI</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------- */}
              {/* STAGE C — Scanned results, grouped by college        */}
              {/* ------------------------------------------------- */}
              {scanResults.length > 0 && (
                <div className="space-y-4">
                  {scanResults.map((sr, si) => (
                    <div
                      key={`${sr.college}-${si}`}
                      className="rounded-xl p-3"
                      style={{ background: "rgba(5,12,24,0.5)", border: "1px solid rgba(78,204,163,0.2)" }}
                    >
                      {/* College header */}
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap className="h-3.5 w-3.5" style={{ color: "#4ECCA3" }} aria-hidden />
                        <span className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
                          {sr.college}
                        </span>
                      </div>

                      {/* Summary stats */}
                      <div className="flex flex-wrap gap-3 mb-1.5 text-xs" style={{ color: "#94a3b8" }}>
                        {sr.latestGpa != null && (
                          <span>
                            <span className="font-semibold" style={{ color: "#4ECCA3" }}>GPA</span>: {sr.latestGpa.toFixed(2)}
                          </span>
                        )}
                        {sr.totalUnits > 0 && (
                          <span>
                            <span className="font-semibold" style={{ color: "#4ECCA3" }}>Total Units</span>: {sr.totalUnits}
                          </span>
                        )}
                        <span>
                          <span className="font-semibold" style={{ color: "#4ECCA3" }}>Courses</span>: {sr.courses.length}
                        </span>
                      </div>

                      {/* Courses grouped by term — collapsible */}
                      {sr.courses.length > 0 ? (
                        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                          {groupedByTerm(sr.courses).map(([term, termCourses]) => {
                            const openKey = `${sr.college}-${term}`;
                            const open = expandedTerms.has(openKey);
                            return (
                              <div key={term}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedTerms(prev => {
                                      const next = new Set(prev);
                                      if (next.has(openKey)) next.delete(openKey);
                                      else next.add(openKey);
                                      return next;
                                    });
                                  }}
                                  className="flex items-center gap-1.5 w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[rgba(78,204,163,0.06)]"
                                  style={{ color: "#94a3b8" }}
                                >
                                  {open
                                    ? <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
                                    : <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                                  }
                                  <span style={{ color: open ? "#e2e8f0" : "#94a3b8" }}>{term}</span>
                                  <span className="ml-auto opacity-50">{termCourses.length} {termCourses.length === 1 ? "course" : "courses"}</span>
                                </button>
                                {open && (
                                  <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                                    {termCourses.map(c => (
                                      <span
                                        key={c.code}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ background: "rgba(78,204,163,0.12)", color: "#4ECCA3", border: "1px solid rgba(78,204,163,0.3)" }}
                                      >
                                        {c.code}
                                        <span className="opacity-80">{c.units ?? "—"}u</span>
                                        <button
                                          type="button"
                                          aria-label={`Remove ${c.code}`}
                                          onClick={() => onRemoveCourseFromScan(sr.college, c.code)}
                                          className="ml-0.5 opacity-70 hover:opacity-100"
                                          style={{ color: "#4ECCA3" }}
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: "#64748b" }}>No courses extracted.</p>
                      )}
                    </div>
                  ))}

                  {/* Clear link */}
                  <button
                    type="button"
                    onClick={onClearAllTranscripts}
                    className="text-xs font-medium underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: "#94a3b8" }}
                  >
                    Clear All & Start Over
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px" style={{ background: "rgba(78,204,163,0.2)" }} />
              <span className="text-[10px] font-bold uppercase tracking-widest pwc-font-mono" style={{ color: "#64748b" }}>
                Or skip & enter manually
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(78,204,163,0.2)" }} />
            </div>

            <p className="text-xs text-center" style={{ color: "#64748b" }}>{t("onboarding.timeNote")}</p>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-4 border-0 p-0 m-0 min-w-0">
            <legend className="sr-only">{t("pages.onboarding.legend_collegeMajor")}</legend>
            <div>
              <label htmlFor="ob-cc" className="block text-sm font-medium mb-1.5" style={{ color: "#cbd5e1" }}>
                {t("onboarding.ccLabel")} <span className="text-red-400">*</span>
              </label>
              <CollegeAutocomplete
                value={form.communityCollege}
                onChange={(val) => onSet("communityCollege", val)}
                placeholder={t("onboarding.ccPlaceholder")}
              />
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>{t("onboarding.ccHelp")}</p>
            </div>
            <div>
              <label htmlFor="ob-major" className="block text-sm font-medium mb-1.5" style={{ color: "#cbd5e1" }}>
                {t("onboarding.majorLabel")} <span className="text-red-400">*</span>
              </label>
              <MajorAutocomplete
                value={form.intendedMajor}
                onChange={(val) => onSet("intendedMajor", val)}
                placeholder={t("onboarding.majorPlaceholder")}
              />
            </div>
            <div>
              <label htmlFor="ob-career" className="block text-sm font-medium mb-1.5" style={{ color: "#cbd5e1" }}>
                {t("onboarding.careerLabel")}{" "}
                <span className="font-normal" style={{ color: "#64748b" }}>{t("onboarding.careerOptional")}</span>
              </label>
              <input
                id="ob-career"
                value={form.careerGoal}
                onChange={e => onSet("careerGoal", e.target.value)}
                placeholder={t("onboarding.careerPlaceholder")}
                className={ONBOARDING_INPUT}
              />
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-4 border-0 p-0 m-0 min-w-0">
            <legend className="sr-only">Review your scan results</legend>

            {/* Review summary per college */}
            {scanResults.map((sr, si) => (
              <ReviewCollegeCard
                key={`${sr.college}-${si}`}
                scanResult={sr}
                form={form}
                onSet={onSet}
                onRemoveCourseFromScan={onRemoveCourseFromScan}
                onAddCourseToScan={onAddCourseToScan}
                onUpdateCourseInScan={onUpdateCourseInScan}
              />
            ))}

            {scanResults.length === 0 && (
              <p className="text-sm text-center" style={{ color: "#64748b" }}>
                No transcript scan results yet. Go back to upload and scan a transcript.
              </p>
            )}
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="space-y-4 border-0 p-0 m-0 min-w-0">
            <legend className="sr-only">{t("pages.onboarding.legend_academic")}</legend>

            {/* Transfer Timeline */}
            <fieldset className="border-0 p-0 m-0 min-w-0">
              <legend className="block text-sm font-medium mb-2" style={{ color: "#cbd5e1" }}>{t("onboarding.transferWhen")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {TRANSFER_TIMELINE_KEYS.map(k => {
                  const selected = form.transferTimeline === k;
                  return (
                    <button type="button" key={k} onClick={() => onSet("transferTimeline", k)}
                      aria-pressed={selected}
                      className={choiceBtn(selected)}
                      style={choiceBtnStyle(selected)}
                    >
                      {t(`onboarding.${k}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="h-px" style={{ background: "rgba(78,204,163,0.15)" }} />

            {/* Financial / Budget section */}
            <fieldset className="border-0 p-0 m-0 min-w-0">
              <legend className="block text-sm font-medium mb-1" style={{ color: "#cbd5e1" }}>
                {t("onboarding.financialSituation")}
              </legend>
              <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: "#64748b" }}>
                <Sparkles className="h-3 w-3" style={{ color: "#4ECCA3" }} />
                This helps us match you with scholarships and financial aid programs you may qualify for.
              </p>
              <div className="space-y-2">
                {FINANCIAL_KEYS.map(k => {
                  const selected = form.financialSituation === k;
                  return (
                    <button type="button" key={k} onClick={() => onSet("financialSituation", k)}
                      aria-pressed={selected}
                      className={cn("w-full", choiceBtn(selected))}
                      style={choiceBtnStyle(selected)}
                    >
                      {t(`onboarding.${k}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="h-px" style={{ background: "rgba(78,204,163,0.15)" }} />

            {/* First-gen question */}
            <fieldset className="border-0 p-0 m-0 min-w-0">
              <legend className="block text-sm font-medium mb-1" style={{ color: "#cbd5e1" }}>
                {t("onboarding.firstGen")}
              </legend>
              <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: "#64748b" }}>
                <Info className="h-3 w-3" style={{ color: "#4ECCA3" }} />
                First-gen students often qualify for additional grants, scholarships, and support programs.
              </p>
              <div className="flex gap-2">
                {[
                  { v: "Yes", label: t("onboarding.yes") },
                  { v: "No", label: t("onboarding.no") },
                  { v: "Not sure", label: t("onboarding.notSure") },
                ].map(({ v, label }) => {
                  const selected = form.isFirstGen === v;
                  return (
                    <button type="button" key={v} onClick={() => onSet("isFirstGen", v)}
                      aria-pressed={selected}
                      className={cn("flex-1", choiceBtn(selected))}
                      style={choiceBtnStyle(selected)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </fieldset>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Inline form to add a course to scan results ─────────────── */
function AddCourseForm({
  onAdd,
  onCancel,
}: {
  onAdd: (course: { code: string; name: string; units?: number; term?: string }) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");
  const [term, setTerm] = useState("");

  const handleSubmit = () => {
    if (!code.trim()) return;
    onAdd({
      code: code.trim().toUpperCase(),
      name: name.trim() || code.trim(),
      units: units ? parseFloat(units) : undefined,
      term: term.trim() || undefined,
    });
    setCode("");
    setName("");
    setUnits("");
    setTerm("");
  };

  return (
    <div
      className="p-2.5 rounded-lg space-y-2"
      style={{ background: "rgba(5,12,24,0.4)", border: "1px solid rgba(78,204,163,0.2)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#4ECCA3" }}>Add a Course</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code (e.g. MATH 101)"
          className="px-2 py-1.5 rounded-lg text-xs"
          style={{ background: "rgba(5,12,24,0.6)", border: "1px solid rgba(78,204,163,0.2)", color: "#e2e8f0" }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Course name"
          className="px-2 py-1.5 rounded-lg text-xs"
          style={{ background: "rgba(5,12,24,0.6)", border: "1px solid rgba(78,204,163,0.2)", color: "#e2e8f0" }}
        />
        <input
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          placeholder="Units (e.g. 3)"
          type="number"
          min="0"
          step="0.5"
          className="px-2 py-1.5 rounded-lg text-xs"
          style={{ background: "rgba(5,12,24,0.6)", border: "1px solid rgba(78,204,163,0.2)", color: "#e2e8f0" }}
        />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term (e.g. Fall 2023)"
          className="px-2 py-1.5 rounded-lg text-xs"
          style={{ background: "rgba(5,12,24,0.6)", border: "1px solid rgba(78,204,163,0.2)", color: "#e2e8f0" }}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 text-[11px] pwc-font-mono uppercase tracking-wider font-bold rounded-lg"
          style={{ border: "1px solid rgba(78,204,163,0.3)", color: "#94a3b8", background: "transparent" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!code.trim()}
          className="flex-1 px-3 py-1.5 text-[11px] pwc-font-mono uppercase tracking-wider font-bold rounded-lg disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
        >
          Add Course
        </button>
      </div>
    </div>
  );
}

/* ─── Inline edit form for a course ──────────────────────────── */
function EditCourseForm({
  course,
  onSave,
  onCancel,
}: {
  course: { code: string; name: string; units?: number; term?: string };
  onSave: (updated: { code: string; name: string; units?: number; term?: string }) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(course.code);
  const [name, setName] = useState(course.name);
  const [units, setUnits] = useState(course.units?.toString() ?? "");
  const [term, setTerm] = useState(course.term ?? "");

  const handleSave = () => {
    if (!code.trim()) return;
    onSave({
      code: code.trim().toUpperCase(),
      name: name.trim() || code.trim(),
      units: units ? parseFloat(units) : undefined,
      term: term.trim() || undefined,
    });
  };

  return (
    <div
      className="p-2 rounded-lg space-y-1.5 mt-1"
      style={{ background: "rgba(5,12,24,0.4)", border: "1px solid rgba(78,204,163,0.2)" }}
    >
      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="px-2 py-1 rounded text-xs"
          style={{ background: "rgba(5,12,24,0.6)", border: "1px solid rgba(78,204,163,0.2)", color: "#e2e8f0" }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-2 py-1 rounded text-xs"
          style={{ background: "rgba(5,12,24,0.6)", border: "1px solid rgba(78,204,163,0.2)", color: "#e2e8f0" }}
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          placeholder="Units"
          type="number"
          min="0"
          step="0.5"
          className="px-2 py-1 rounded text-xs"
          style={{ background: "rgba(5,12,24,0.6)", border: "1px solid rgba(78,204,163,0.2)", color: "#e2e8f0" }}
        />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term"
          className="px-2 py-1 rounded text-xs"
          style={{ background: "rgba(5,12,24,0.6)", border: "1px solid rgba(78,204,163,0.2)", color: "#e2e8f0" }}
        />
      </div>
      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1 text-[10px] pwc-font-mono uppercase tracking-wider font-bold rounded"
          style={{ border: "1px solid rgba(78,204,163,0.3)", color: "#94a3b8", background: "transparent" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!code.trim()}
          className="flex-1 py-1 text-[10px] pwc-font-mono uppercase tracking-wider font-bold rounded disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

/* ─── Review card per college in step 2 ──────────────────────── */
function ReviewCollegeCard({
  scanResult,
  form,
  onSet,
  onRemoveCourseFromScan,
  onAddCourseToScan,
  onUpdateCourseInScan,
}: {
  scanResult: ScanResult;
  form: FormData;
  onSet: (field: keyof FormData, value: string) => void;
  onRemoveCourseFromScan: (college: string, code: string) => void;
  onAddCourseToScan: (college: string, course: { code: string; name: string; units?: number; term?: string }) => void;
  onUpdateCourseInScan: (college: string, oldCode: string, updated: { code: string; name: string; units?: number; term?: string }) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  const sr = scanResult;

  /** Group courses by term and sort reverse-chronologically. */
  const groupedByTerm = (courses: ScanResult["courses"]) => {
    const groups = new Map<string, typeof courses>();
    const noTerm: typeof courses = [];
    for (const c of courses) {
      if (c.term) {
        const list = groups.get(c.term) ?? [];
        list.push(c);
        groups.set(c.term, list);
      } else {
        noTerm.push(c);
      }
    }
    const SEASON_RANK: Record<string, number> = { Fall: 0, Summer: 1, Spring: 2, Winter: 3 };
    const sorted = [...groups.entries()].sort(([a], [b]) => {
      const ay = parseInt(a.match(/\d{4}/)?.[0] ?? "0", 10);
      const by = parseInt(b.match(/\d{4}/)?.[0] ?? "0", 10);
      if (ay !== by) return by - ay;
      const as = SEASON_RANK[a.split(/\s+/)[0]] ?? 99;
      const bs = SEASON_RANK[b.split(/\s+/)[0]] ?? 99;
      return as - bs;
    });
    if (noTerm.length) sorted.push(["Other", noTerm]);
    return sorted;
  };

  const toggleTerm = (key: string) => {
    setExpandedTerms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "rgba(5,12,24,0.5)", border: "1px solid rgba(78,204,163,0.2)" }}
    >
      {/* College & Major header with inline editing */}
      <SchoolMajorSection
        college={form.communityCollege || sr.college}
        intendedMajor={form.intendedMajor}
        onSetCollege={(val) => onSet("communityCollege", val)}
        onSetMajor={(val) => onSet("intendedMajor", val)}
      />

      {/* Summary stats */}
      <div className="flex flex-wrap gap-3 my-2 text-xs" style={{ color: "#94a3b8" }}>
        {sr.latestGpa != null && (
          <span>
            <span className="font-semibold" style={{ color: "#4ECCA3" }}>GPA</span>: {sr.latestGpa.toFixed(2)}
          </span>
        )}
        {sr.totalUnits > 0 && (
          <span>
            <span className="font-semibold" style={{ color: "#4ECCA3" }}>Total Units</span>: {sr.totalUnits}
          </span>
        )}
        <span>
          <span className="font-semibold" style={{ color: "#4ECCA3" }}>Courses</span>: {sr.courses.length}
        </span>
        {sr.detectedMajor && (
          <span>
            <span className="font-semibold" style={{ color: "#4ECCA3" }}>Detected Major</span>: {sr.detectedMajor}
          </span>
        )}
      </div>

      {/* Courses grouped by term — collapsible */}
      {sr.courses.length > 0 ? (
        <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
          {groupedByTerm(sr.courses).map(([term, termCourses]) => {
            const openKey = `${sr.college}-${term}`;
            const open = expandedTerms.has(openKey);
            return (
              <div key={term}>
                <button
                  type="button"
                  onClick={() => toggleTerm(openKey)}
                  className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-[rgba(78,204,163,0.06)]"
                  style={{ color: "#94a3b8" }}
                >
                  {open
                    ? <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
                    : <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                  }
                  <span style={{ color: open ? "#e2e8f0" : "#94a3b8" }}>{term}</span>
                  <span className="ml-auto opacity-50">{termCourses.length} {termCourses.length === 1 ? "course" : "courses"}</span>
                </button>
                {open && (
                  <div className="flex flex-wrap gap-1.5 px-2 pb-1">
                    {termCourses.map(c => (
                      <div key={c.code} className="flex flex-col">
                        {editingCourse === c.code ? (
                          <EditCourseForm
                            course={c}
                            onSave={(updated) => {
                              onUpdateCourseInScan(sr.college, c.code, updated);
                              setEditingCourse(null);
                            }}
                            onCancel={() => setEditingCourse(null)}
                          />
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: "rgba(78,204,163,0.12)", color: "#4ECCA3", border: "1px solid rgba(78,204,163,0.3)" }}
                          >
                            {c.code}
                            <span className="opacity-80">{c.units ?? "—"}u</span>
                            <button
                              type="button"
                              aria-label={`Edit ${c.code}`}
                              onClick={() => setEditingCourse(c.code)}
                              className="ml-0.5 opacity-60 hover:opacity-100"
                              style={{ color: "#4ECCA3" }}
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${c.code}`}
                              onClick={() => onRemoveCourseFromScan(sr.college, c.code)}
                              className="opacity-60 hover:opacity-100"
                              style={{ color: "#4ECCA3" }}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs" style={{ color: "#64748b" }}>No courses extracted.</p>
      )}

      {/* Add course button / form */}
      {showAddForm ? (
        <div className="mt-2">
          <AddCourseForm
            onAdd={(course) => {
              onAddCourseToScan(sr.college, course);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded text-[11px] font-medium transition-all"
          style={{ color: "#4ECCA3", border: "1px solid rgba(78,204,163,0.25)", background: "rgba(78,204,163,0.06)" }}
        >
          <Plus className="h-3 w-3" aria-hidden /> Add Course
        </button>
      )}
    </div>
  );
}

/* ─── Editable school & major section ────────────────────────── */
function SchoolMajorSection({
  college,
  intendedMajor,
  onSetCollege,
  onSetMajor,
}: {
  college: string;
  intendedMajor: string;
  onSetCollege: (val: string) => void;
  onSetMajor: (val: string) => void;
}) {
  const [editField, setEditField] = useState<"college" | "major" | null>(null);

  // Determine the displayed college name (use the user-selected one if available)
  const displayCollege = college || "Not set";
  const displayMajor = intendedMajor || "Not set";

  return (
    <div className="space-y-1.5 mb-2">
      {/* College row */}
      <div className="flex items-center gap-2">
        <GraduationCap className="h-3.5 w-3.5 shrink-0" style={{ color: "#4ECCA3" }} aria-hidden />
        <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>School:</span>
        {editField === "college" ? (
          <div className="flex-1">
            <CollegeAutocomplete
              value={college}
              onChange={(val) => { onSetCollege(val); setEditField(null); }}
              placeholder="Enter your college..."
              compact
            />
          </div>
        ) : (
          <>
            <span className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>{displayCollege}</span>
            <button
              type="button"
              onClick={() => setEditField("college")}
              className="opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Edit college"
            >
              <Pencil className="h-3 w-3" style={{ color: "#4ECCA3" }} />
            </button>
          </>
        )}
      </div>

      {/* Major row */}
      <div className="flex items-center gap-2">
        <GraduationCap className="h-3.5 w-3.5 shrink-0" style={{ color: "#4ECCA3", opacity: 0.7 }} aria-hidden />
        <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>Major:</span>
        {editField === "major" ? (
          <div className="flex-1">
            <MajorAutocomplete
              value={intendedMajor}
              onChange={(val) => { onSetMajor(val); setEditField(null); }}
              placeholder="Enter your major..."
              className="text-xs"
            />
          </div>
        ) : (
          <>
            <span className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>{displayMajor}</span>
            <button
              type="button"
              onClick={() => setEditField("major")}
              className="opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Edit major"
            >
              <Pencil className="h-3 w-3" style={{ color: "#4ECCA3" }} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
