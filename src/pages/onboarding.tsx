import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GraduationCap, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { parseTranscriptPDF, type ExtractedCourse } from "@/lib/parse-transcript";
import { appendDevCourses } from "@/lib/dev-courses";
import { DEV_PROFILE_ID, isAuthBypass, saveDevProfile } from "@/lib/dev-profile";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useMotionEnabled, useDirSign, DUR, EASE_OUT } from "@/lib/motion";
import { KALEON_LOGO_SRC } from "@/lib/brand";
import { t } from "@/lib/copy";

import { IntroPhase } from "@/components/onboarding/intro-phase";
import { CalculatingPhase } from "@/components/onboarding/calculating-phase";
import { ReadyPhase } from "@/components/onboarding/ready-phase";
import { FormSteps } from "@/components/onboarding/form-steps";
import {
  ONBOARDING_PAGE_BG, ONBOARDING_CARD, STEP_ICONS, INTRO_DURATION_MS,
} from "@/components/onboarding/onboarding-constants";
import type { FormData } from "@/components/onboarding/onboarding-types";

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
  const [phase, setPhase] = useState<"intro" | "form" | "calculating" | "ready">("intro");
  const [extractedCourses, setExtractedCourses] = useState<ExtractedCourse[]>([]);
  const [extractedLatestGpa, setExtractedLatestGpa] = useState<number | null>(null);
  const [extractedTotalUnits, setExtractedTotalUnits] = useState(0);
  const [transcriptParsing, setTranscriptParsing] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [transcriptFileName, setTranscriptFileName] = useState<string | null>(null);
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

  useEffect(() => {
    if (phase !== "intro") return;
    const id = window.setTimeout(() => setPhase("form"), INTRO_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

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

  if (phase === "intro") return <IntroPhase />;
  if (phase === "calculating") return <CalculatingPhase />;
  if (phase === "ready") return <ReadyPhase />;

  return (
    <div className="min-h-screen pwc-font-sans flex items-center justify-center px-4 py-12" style={ONBOARDING_PAGE_BG}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <img src={KALEON_LOGO_SRC} alt="" width={28} height={28} className="shrink-0 object-contain" aria-hidden />
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
          <div className="px-8 py-6" style={{ borderBottom: "1px solid rgba(78,204,163,0.2)", background: "rgba(78,204,163,0.06)" }}>
            <div className="flex items-center gap-3 mb-1">
              {step === 0 ? (
                <img src={KALEON_LOGO_SRC} alt="" width={22} height={22} className="shrink-0 object-contain" aria-hidden />
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
            <FormSteps
              step={step}
              form={form}
              onSet={set}
              onTranscriptUpload={handleTranscriptUpload}
              transcriptFileName={transcriptFileName}
              transcriptParsing={transcriptParsing}
              transcriptError={transcriptError}
              extractedCourses={extractedCourses}
              extractedLatestGpa={extractedLatestGpa}
              extractedTotalUnits={extractedTotalUnits}
              onRemoveCourse={(code) => setExtractedCourses(prev => prev.filter(x => x.code !== code))}
              onClearTranscript={() => {
                setTranscriptFileName(null);
                setExtractedCourses([]);
                setExtractedLatestGpa(null);
                setExtractedTotalUnits(0);
                setTranscriptError(null);
              }}
              motionOn={motionOn}
              dir={dir}
            />
          </div>

          {/* Footer buttons */}
          <div className="px-8 pb-8 flex items-end justify-between gap-3" style={{ borderTop: "1px solid rgba(78,204,163,0.15)" }}>
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="hover:bg-[rgba(78,204,163,0.08)]" style={{ color: "#94a3b8" }}>
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
