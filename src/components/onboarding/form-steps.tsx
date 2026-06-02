import { useRef } from "react";
import { FileText, Upload, X, Loader2, Info, Sparkles } from "lucide-react";
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
import type { FormData } from "./onboarding-types";
import type { ExtractedCourse } from "@/lib/parse-transcript";

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
  onTranscriptUpload: (file: File) => Promise<void>;
  transcriptFileName: string | null;
  transcriptParsing: boolean;
  transcriptError: string | null;
  extractedCourses: ExtractedCourse[];
  extractedLatestGpa: number | null;
  extractedTotalUnits: number;
  onRemoveCourse: (code: string) => void;
  onClearTranscript: () => void;
  motionOn: boolean;
  dir: number;
}

export function FormSteps({
  step, form, onSet, onTranscriptUpload,
  transcriptFileName, transcriptParsing, transcriptError,
  extractedCourses, extractedLatestGpa, extractedTotalUnits,
  onRemoveCourse, onClearTranscript,
  motionOn, dir,
}: FormStepsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="sr-only"
                aria-label="Upload transcript PDF"
                onChange={e => { const f = e.target.files?.[0]; if (f) void onTranscriptUpload(f); }}
              />

              {!transcriptFileName ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void onTranscriptUpload(f); }}
                  className="w-full border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer hover:border-[rgba(78,204,163,0.5)]"
                  style={{ borderColor: "rgba(78,204,163,0.25)", background: "rgba(5,12,24,0.4)" }}
                >
                  <FileText className="h-8 w-8 mx-auto mb-2" style={{ color: "#4ECCA3" }} aria-hidden />
                  <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>Upload your transcript PDF</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>and we'll extract your courses automatically</p>
                  <span
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ border: "1px solid rgba(78,204,163,0.35)", color: "#4ECCA3", background: "rgba(78,204,163,0.08)" }}
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden /> Choose PDF File
                  </span>
                </button>
              ) : (
                <div
                  className="rounded-xl p-3"
                  style={{ background: "rgba(5,12,24,0.5)", border: "1px solid rgba(78,204,163,0.2)" }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0" style={{ color: "#4ECCA3" }} aria-hidden />
                      <span className="text-xs font-medium truncate" style={{ color: "#e2e8f0" }}>{transcriptFileName}</span>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove transcript"
                      onClick={onClearTranscript}
                      className="shrink-0 transition-colors"
                      style={{ color: "#64748b" }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {transcriptParsing && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#4ECCA3" }}>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Extracting courses…
                    </div>
                  )}

                  {transcriptError && (
                    <p className="text-xs text-amber-400">{transcriptError}</p>
                  )}

                  {extractedCourses.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-3 mb-2 text-xs" style={{ color: "#94a3b8" }}>
                        {extractedLatestGpa != null && (
                          <span>
                            <span className="font-semibold" style={{ color: "#4ECCA3" }}>GPA</span>: {extractedLatestGpa.toFixed(2)}
                          </span>
                        )}
                        {extractedTotalUnits > 0 && (
                          <span>
                            <span className="font-semibold" style={{ color: "#4ECCA3" }}>Total Units</span>: {extractedTotalUnits}
                          </span>
                        )}
                        <span>
                          <span className="font-semibold" style={{ color: "#4ECCA3" }}>Courses</span>: {extractedCourses.length}
                        </span>
                      </div>
                      <p className="text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
                        Tap × to remove any course
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {extractedCourses.map(c => (
                          <span
                            key={c.code}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: "rgba(78,204,163,0.12)", color: "#4ECCA3", border: "1px solid rgba(78,204,163,0.3)" }}
                          >
                            {c.code}
                            {c.term && <span className="opacity-60">{c.term}</span>}
                            <span className="opacity-80">{c.units ?? "—"}u</span>
                            <button
                              type="button"
                              aria-label={`Remove ${c.code}`}
                              onClick={() => onRemoveCourse(c.code)}
                              className="ml-0.5 opacity-70 hover:opacity-100"
                              style={{ color: "#4ECCA3" }}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
              <input
                id="ob-major"
                value={form.intendedMajor}
                onChange={e => onSet("intendedMajor", e.target.value)}
                placeholder={t("onboarding.majorPlaceholder")}
                className={ONBOARDING_INPUT}
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
