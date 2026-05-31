import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Target, ArrowRight, ArrowLeft,
  BookOpen, CheckCircle2, User, Loader2, FileText, Upload, X,
} from "lucide-react";
import { parseTranscriptPDF, type ExtractedCourse } from "@/lib/parse-transcript";
import { appendDevCourses } from "@/lib/dev-courses";
import { DEV_PROFILE_ID, isAuthBypass, saveDevProfile } from "@/lib/dev-profile";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import { useMotionEnabled, useDirSign, DUR, EASE_OUT } from "@/lib/motion";
import { KALEON_LOGO_SRC } from "@/lib/brand";
import { t } from "@/lib/copy";

const TRANSFER_TIMELINE_KEYS = [
  "timelineFall2025", "timelineSpring2026", "timelineFall2026", "timelineSpring2027",
  "timelineFall2027", "timelineSpring2028", "timelineFall2028", "timelineUndecided",
] as const;

const TRANSFER_TIMELINE_VALUES: Record<string, string> = {
  timelineFall2025: "Fall 2025", timelineSpring2026: "Spring 2026", timelineFall2026: "Fall 2026",
  timelineSpring2027: "Spring 2027", timelineFall2027: "Fall 2027", timelineSpring2028: "Spring 2028",
  timelineFall2028: "Fall 2028", timelineUndecided: "Undecided",
};

const FINANCIAL_KEYS = ["finPell", "finDream", "finAb540", "finMiddle", "finFullPay", "finNotSure"] as const;
const FINANCIAL_VALUES: Record<string, string> = {
  finPell: "Federal Pell Grant eligible (FAFSA)",
  finDream: "California Dream Act eligible (no DACA/FAFSA)",
  finAb540: "AB 540 eligible", finMiddle: "Middle-income (no Pell)",
  finFullPay: "Full pay", finNotSure: "Not sure",
};

interface FormData {
  fullName: string;
  communityCollege: string;
  intendedMajor: string;
  careerGoal: string;
  transferTimeline: string;
  financialSituation: string;
  isFirstGen: string;
}

const STEP_ICONS = [GraduationCap, BookOpen, User] as const;

function KaleonMark({ size, className }: { size: number; className?: string }) {
  return (
    <img
      src={KALEON_LOGO_SRC}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      aria-hidden
    />
  );
}

const FONT_STYLES = `
  .pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; }
  .pwc-font-sans { font-family: 'Inter', sans-serif; }
`;

const ONBOARDING_PAGE_BG = {
  background: "var(--app-page-bg)",
  color: "var(--app-text)",
} as const;

const ONBOARDING_CARD = {
  background: "var(--app-card-bg)",
  border: "1px solid var(--app-border-strong)",
  borderRadius: 16,
} as const;

const ONBOARDING_INPUT =
  "w-full px-4 py-2.5 rounded-xl text-sm text-[var(--app-input-text)] placeholder:text-[var(--app-input-placeholder)] bg-[var(--app-input-bg)] border border-[var(--app-border-strong)] focus:outline-none focus:ring-2 focus:ring-[#4ECCA3]/40 focus:border-[#4ECCA3]";

const choiceBtn = (selected: boolean) =>
  cn(
    "text-sm px-3 py-2.5 rounded-xl border text-left font-medium transition-all",
    selected
      ? "border-transparent text-[#050c18]"
      : "bg-[rgba(5,12,24,0.5)] border-[rgba(78,204,163,0.2)] text-slate-300 hover:border-[rgba(78,204,163,0.45)]",
  );

const choiceBtnStyle = (selected: boolean) =>
  selected ? { background: "linear-gradient(135deg, #4ECCA3, #38b2ac)" } : undefined;

export default function Onboarding() {
  const STEPS: {
    title: string;
    subtitle: string;
    icon: (typeof STEP_ICONS)[number] | null;
  }[] = [
    { title: t("onboarding.step1Title"), subtitle: t("onboarding.step1Subtitle"), icon: null },
    { title: t("onboarding.step2Title"), subtitle: t("onboarding.step2Subtitle"), icon: STEP_ICONS[0] },
    { title: t("onboarding.step3Title"), subtitle: t("onboarding.step3Subtitle"), icon: STEP_ICONS[1] },
    { title: t("onboarding.step4Title"), subtitle: t("onboarding.step4Subtitle"), icon: STEP_ICONS[2] },
  ];
  const { user, updateProfileName } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"form" | "calculating" | "ready">("form");
  const [extractedCourses, setExtractedCourses] = useState<ExtractedCourse[]>([]);
  const [extractedLatestGpa, setExtractedLatestGpa] = useState<number | null>(null);
  const [extractedTotalUnits, setExtractedTotalUnits] = useState(0);
  const [transcriptParsing, setTranscriptParsing] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [transcriptFileName, setTranscriptFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormData>({
    fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.firstName ?? ""),
    communityCollege: "",
    intendedMajor: "",
    careerGoal: "",
    transferTimeline: "",
    financialSituation: "",
    isFirstGen: "",
  });

  const set = (k: keyof FormData, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleTranscriptUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setTranscriptError("Please upload a PDF file.");
      return;
    }
    setTranscriptFileName(file.name);
    setTranscriptParsing(true);
    setTranscriptError(null);
    setExtractedCourses([]);
    setExtractedLatestGpa(null);
    setExtractedTotalUnits(0);
    try {
      const result = await parseTranscriptPDF(file);
      if (result.courses.length === 0) {
        setTranscriptError("No course codes found. This may be a scanned PDF — you can add courses manually later.");
      } else {
        setExtractedCourses(result.courses);
        setExtractedLatestGpa(result.latestGpa ?? null);
        setExtractedTotalUnits(result.totalUnits);
      }
    } catch {
      setTranscriptError("Could not read this PDF. Try a different file or add courses manually later.");
    } finally {
      setTranscriptParsing(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return form.communityCollege.trim().length > 0 && form.intendedMajor.trim().length > 0;
    return true;
  };

  const submit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const payload = {
        userId: user.id,
        fullName: form.fullName || user.firstName || t("common.student"),
        communityCollege: form.communityCollege,
        intendedMajor: form.intendedMajor,
        careerGoal: form.careerGoal,
        currentGpa: extractedLatestGpa ?? 0,
        transferTimeline: form.transferTimeline,
        financialSituation: form.financialSituation,
        isFirstGen: form.isFirstGen,
        completionPercent: 60,
      };

      if (isAuthBypass()) {
        saveDevProfile({
          fullName: payload.fullName,
          communityCollege: payload.communityCollege,
          intendedMajor: payload.intendedMajor,
          careerGoal: payload.careerGoal,
          currentGpa: payload.currentGpa,
          transferTimeline: payload.transferTimeline,
          financialSituation: payload.financialSituation,
          isFirstGen: payload.isFirstGen,
          completionPercent: payload.completionPercent,
        });
        if (extractedCourses.length > 0) {
          appendDevCourses(DEV_PROFILE_ID, extractedCourses.map(c => ({
            courseCode: c.code,
            courseName: c.name,
            units: c.units,
            term: c.term,
            status: "completed",
          })));
        }
        setPhase("calculating");
        setTimeout(() => setPhase("ready"), 2800);
        return;
      }

      const r = await fetch("/api/profiles", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to create profile");
      const created = (await r.json()) as { id: number };

      if (isSupabaseConfigured && !isAuthBypass() && !user.firstName?.trim()) {
        const first = (form.fullName || payload.fullName).trim().split(/\s+/)[0];
        if (first) await updateProfileName(first);
      }

      if (extractedCourses.length > 0 && created?.id) {
        await fetch(`/api/profiles/${created.id}/courses/bulk`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latestGpa: extractedLatestGpa ?? undefined,
            courses: extractedCourses.map(c => ({
              courseCode: c.code,
              courseName: c.name,
              units: c.units,
              term: c.term,
              status: "completed",
            })),
          }),
        });
      }
      setPhase("calculating");
      setTimeout(() => setPhase("ready"), 2800);
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;
  const StepIcon = STEPS[step].icon;
  const motionOn = useMotionEnabled();
  const dir = useDirSign();

  if (phase === "calculating") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#070d1a" }}>
        <img src={KALEON_LOGO_SRC} alt="Kaleon" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "contain" }} />
        <div className="mt-8 mb-2" style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(78,204,163,0.2)", borderTopColor: "#4ECCA3", animation: "spin 0.9s linear infinite" }} />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        <h1 className="mt-4 text-2xl font-bold text-white text-center">Calculating your transfer path...</h1>
        <p className="mt-2 text-sm text-center max-w-xs" style={{ color: "#64748b" }}>This usually takes a few seconds, feel free to leave the page and come back in a bit!</p>
        <div className="mt-8 w-full max-w-sm rounded-2xl p-6" style={{ background: "rgba(13,26,46,0.9)", border: "1px solid rgba(78,204,163,0.2)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ fontFamily: "JetBrains Mono, monospace", color: "#4ECCA3" }}>Loved by Transfer Students</p>
          <p className="text-3xl mb-1" style={{ color: "#4ECCA3", fontFamily: "Georgia, serif", lineHeight: 1 }}>"</p>
          <p className="font-bold -mt-1 text-white">"Took me 2 minutes to get a plan that would've taken me 3 appointments to figure out."</p>
          <div className="flex items-center gap-3 mt-5">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "rgba(78,204,163,0.15)", color: "#4ECCA3" }}>M</div>
            <div>
              <p className="text-sm font-bold text-white">Maria Hernandez</p>
              <p className="text-xs" style={{ color: "#64748b" }}>Student @ East Los Angeles College</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: "#070d1a" }}>
        <img src={KALEON_LOGO_SRC} alt="Kaleon" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "contain" }} />
        <h1 className="mt-6 text-3xl font-bold text-white text-center leading-tight">Your Transfer Plan<br />is Ready.</h1>
        <p className="mt-2 text-sm" style={{ color: "#64748b" }}>We've computed your transfer path.</p>
        <div className="mt-8 w-full max-w-sm space-y-3">
          {[
            { title: "One Wrong Class Can Ruin Everything", body: "Classes that don't transfer can prevent you from being admitted." },
            { title: "Save Money", body: "Save hundreds by avoiding private counselors and wasted tuition." },
          ].map(card => (
            <div key={card.title} className="p-4 rounded-xl" style={{ background: "rgba(13,26,46,0.85)", border: "1px solid rgba(78,204,163,0.18)" }}>
              <p className="font-bold text-sm text-white">{card.title}</p>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>{card.body}</p>
            </div>
          ))}
          <div className="p-4 rounded-xl text-center" style={{ background: "rgba(78,204,163,0.07)", border: "1px solid rgba(78,204,163,0.2)" }}>
            <p className="font-bold text-sm text-white">70% of students take 3+ years to transfer.</p>
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Students who use Kaleon are more likely to transfer on-time.</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-8 px-10 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
        >
          Go To Dashboard <ArrowRight size={16} />
        </button>
        <p className="mt-3 text-xs" style={{ color: "#475569" }}>Join students who secured their transfer plan this week</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pwc-font-sans flex items-center justify-center px-4 py-12"
      style={ONBOARDING_PAGE_BG}
    >
      <style dangerouslySetInnerHTML={{ __html: FONT_STYLES }} />
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <KaleonMark size={28} />
          <span className="text-xl font-bold uppercase tracking-tight" style={{ color: "#f8fafc" }}>
            Kaleon
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-1.5 pwc-font-mono uppercase tracking-wider" style={{ color: "#64748b" }}>
            <span>{t("onboarding.stepOf", { current: step + 1, total: STEPS.length })}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(78,204,163,0.12)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #4ECCA3, #38b2ac)" }}
            />
          </div>
        </div>

        <div className="overflow-hidden shadow-xl" style={ONBOARDING_CARD}>
          {/* Header */}
          <div
            className="px-8 py-6"
            style={{ borderBottom: "1px solid rgba(78,204,163,0.2)", background: "rgba(78,204,163,0.06)" }}
          >
            <div className="flex items-center gap-3 mb-1">
              {step === 0 ? (
                <KaleonMark size={22} />
              ) : (
                StepIcon && <StepIcon className="h-5 w-5" style={{ color: "#4ECCA3" }} aria-hidden />
              )}
              <h1 className="text-xl font-bold uppercase tracking-tight" style={{ color: "#f8fafc" }}>
                {STEPS[step].title}
              </h1>
            </div>
            <p className="text-sm" style={{ color: "#94a3b8" }}>{STEPS[step].subtitle}</p>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-5 relative overflow-hidden">
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
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: GraduationCap, label: t("onboarding.transferPlanning"), desc: t("onboarding.transferPlanningDesc") },
                    { icon: BookOpen, label: t("onboarding.aiPathways"), desc: t("onboarding.aiPathwaysDesc") },
                    { icon: Target, label: t("onboarding.scholarships"), desc: t("onboarding.scholarshipsDesc") },
                  ].map(f => (
                    <div
                      key={f.label}
                      className="rounded-2xl p-3 text-center"
                      style={{ background: "rgba(78,204,163,0.06)", border: "1px solid rgba(78,204,163,0.18)" }}
                    >
                      <f.icon className="h-5 w-5 mx-auto mb-1.5" style={{ color: "#4ECCA3" }} aria-hidden />
                      <p className="text-xs font-bold" style={{ color: "#f1f5f9" }}>{f.label}</p>
                      <p className="text-[10px]" style={{ color: "#64748b" }}>{f.desc}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => null}
                  className="w-full text-sm px-4 py-3 rounded-xl border text-left font-medium transition-all bg-[rgba(5,12,24,0.5)] border-[rgba(78,204,163,0.2)] text-slate-300 hover:border-[rgba(78,204,163,0.45)]"
                >
                  <span className="block font-semibold" style={{ color: "#f1f5f9" }}>
                    {t("onboarding.manualSetup")}
                  </span>
                  <span className="block text-xs mt-0.5" style={{ color: "#64748b" }}>
                    {t("onboarding.manualSetupDesc")}
                  </span>
                </button>
                {/* Transcript Upload */}
                <div>
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px" style={{ background: "rgba(78,204,163,0.2)" }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest pwc-font-mono" style={{ color: "#64748b" }}>
                      or upload transcript
                    </span>
                    <div className="flex-1 h-px" style={{ background: "rgba(78,204,163,0.2)" }} />
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="sr-only"
                    aria-label="Upload transcript PDF"
                    onChange={e => { const f = e.target.files?.[0]; if (f) void handleTranscriptUpload(f); }}
                  />

                  {!transcriptFileName ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleTranscriptUpload(f); }}
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
                          onClick={() => { setTranscriptFileName(null); setExtractedCourses([]); setExtractedLatestGpa(null); setExtractedTotalUnits(0); setTranscriptError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
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
                          {(extractedLatestGpa != null || extractedTotalUnits > 0) && (
                            <div className="flex flex-wrap gap-3 mb-2 text-xs" style={{ color: "#94a3b8" }}>
                              {extractedLatestGpa != null && (
                                <span>Latest GPA: <strong style={{ color: "#4ECCA3" }}>{extractedLatestGpa.toFixed(2)}</strong></span>
                              )}
                              {extractedTotalUnits > 0 && (
                                <span>Units: <strong style={{ color: "#4ECCA3" }}>{extractedTotalUnits}</strong></span>
                              )}
                            </div>
                          )}
                          <p className="text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>
                            {extractedCourses.length} course{extractedCourses.length !== 1 ? "s" : ""} found — tap × to remove any
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
                                {c.units && <span className="opacity-60">{c.units}u</span>}
                                <button
                                  type="button"
                                  aria-label={`Remove ${c.code}`}
                                  onClick={() => setExtractedCourses(prev => prev.filter(x => x.code !== c.code))}
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
                  <input
                    id="ob-cc"
                    value={form.communityCollege}
                    onChange={e => set("communityCollege", e.target.value)}
                    placeholder={t("onboarding.ccPlaceholder")}
                    className={ONBOARDING_INPUT}
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
                    onChange={e => set("intendedMajor", e.target.value)}
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
                    onChange={e => set("careerGoal", e.target.value)}
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
                      const value = TRANSFER_TIMELINE_VALUES[k];
                      const selected = form.transferTimeline === value;
                      return (
                        <button type="button" key={k} onClick={() => set("transferTimeline", value)}
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
                <fieldset className="border-0 p-0 m-0 min-w-0">
                  <legend className="block text-sm font-medium mb-2" style={{ color: "#cbd5e1" }}>{t("onboarding.financialSituation")}</legend>
                  <div className="space-y-2">
                    {FINANCIAL_KEYS.map(k => {
                      const value = FINANCIAL_VALUES[k];
                      const selected = form.financialSituation === value;
                      return (
                        <button type="button" key={k} onClick={() => set("financialSituation", value)}
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
                <fieldset className="border-0 p-0 m-0 min-w-0">
                  <legend className="block text-sm font-medium mb-2" style={{ color: "#cbd5e1" }}>{t("onboarding.firstGen")}</legend>
                  <div className="flex gap-2">
                    {[
                      { v: "Yes", label: t("onboarding.yes") },
                      { v: "No", label: t("onboarding.no") },
                      { v: "Not sure", label: t("onboarding.notSure") },
                    ].map(({ v, label }) => {
                      const selected = form.isFirstGen === v;
                      return (
                      <button type="button" key={v} onClick={() => set("isFirstGen", v)}
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
          </div>

          {/* Footer buttons */}
          <div
            className="px-8 pb-8 flex items-end justify-between gap-3"
            style={{ borderTop: "1px solid rgba(78,204,163,0.15)" }}
          >
            {step > 0 ? (
              <Button
                variant="ghost"
                onClick={() => setStep(s => s - 1)}
                className="hover:bg-[rgba(78,204,163,0.08)]"
                style={{ color: "#94a3b8" }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />{t("onboarding.back")}
              </Button>
            ) : (
              <div className="h-10" />
            )}

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="ml-auto border-0 hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
              >
                {t("onboarding.continue")} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => void submit()}
                disabled={submitting}
                className="ml-auto border-0 hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("onboarding.creating")}</>
                  : <><CheckCircle2 className="h-4 w-4 mr-2" />{t("onboarding.startJourney")}</>
                }
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs mt-6 pwc-font-mono" style={{ color: "#475569" }}>
          {t("onboarding.updateLater")}
        </p>
      </div>
    </div>
  );
}
