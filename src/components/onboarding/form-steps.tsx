import { useRef, useState } from "react";
import { FileText, Upload, X, Loader2, Info, Sparkles, Check, GraduationCap, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";
import { AnimatePresence, motion } from "framer-motion";
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
  onClearAllTranscripts: () => void;
  motionOn: boolean;
  dir: number;
}

export function FormSteps({
  step, form, onSet,
  pendingTranscripts, onAddPendingFile, onUpdatePendingCollege, onRemovePendingFile,
  scanning, scanError, scanResults, onScan,
  onRemoveCourseFromScan, onClearAllTranscripts,
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
        {step === 0 && (
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
                accept=".pdf"
                className="sr-only"
                aria-label="Upload transcript PDF"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) onAddPendingFile(f);
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
                    <p className="text-xs text-amber-400">{scanError}</p>
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
            <legend className="sr-only">{t("pages.onboarding.legend_academic")}</legend>
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
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="space-y-4 border-0 p-0 m-0 min-w-0">
            <legend className="sr-only">{t("pages.onboarding.legend_background")}</legend>

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
