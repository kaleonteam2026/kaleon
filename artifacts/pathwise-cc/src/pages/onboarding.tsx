import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Map, GraduationCap, Target, ArrowRight, ArrowLeft,
  BookOpen, CheckCircle2, User, Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMotionEnabled, useDirSign, DUR, EASE_OUT } from "@/lib/motion";

const TRANSFER_TIMELINE_KEYS = [
  "timelineFall2025", "timelineSpring2026", "timelineFall2026", "timelineSpring2027",
  "timelineFall2027", "timelineSpring2028", "timelineFall2028", "timelineUndecided",
] as const;

const TRANSFER_TIMELINE_VALUES: Record<string, string> = {
  timelineFall2025: "Fall 2025", timelineSpring2026: "Spring 2026", timelineFall2026: "Fall 2026",
  timelineSpring2027: "Spring 2027", timelineFall2027: "Fall 2027", timelineSpring2028: "Spring 2028",
  timelineFall2028: "Fall 2028", timelineUndecided: "Undecided",
};

const GPA_RANGE_KEYS = ["4.0", "3.7–3.9", "3.3–3.6", "3.0–3.2", "2.7–2.9", "2.4–2.6", "gpaBelow", "gpaNotSure"] as const;
const GPA_RANGE_LABELS: Record<string, string> = {
  "4.0": "4.0", "3.7–3.9": "3.7–3.9", "3.3–3.6": "3.3–3.6", "3.0–3.2": "3.0–3.2",
  "2.7–2.9": "2.7–2.9", "2.4–2.6": "2.4–2.6", gpaBelow: "Below 2.4", gpaNotSure: "Not sure",
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
  currentGpa: string;
  transferTimeline: string;
  financialSituation: string;
  isFirstGen: string;
}

const STEP_ICONS = [Map, GraduationCap, BookOpen, User];

export default function Onboarding() {
  const { t } = useTranslation();
  const STEPS = [
    { title: t("onboarding.step1Title"), subtitle: t("onboarding.step1Subtitle"), icon: STEP_ICONS[0] },
    { title: t("onboarding.step2Title"), subtitle: t("onboarding.step2Subtitle"), icon: STEP_ICONS[1] },
    { title: t("onboarding.step3Title"), subtitle: t("onboarding.step3Subtitle"), icon: STEP_ICONS[2] },
    { title: t("onboarding.step4Title"), subtitle: t("onboarding.step4Subtitle"), icon: STEP_ICONS[3] },
  ];
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.firstName ?? ""),
    communityCollege: "",
    intendedMajor: "",
    careerGoal: "",
    currentGpa: "",
    transferTimeline: "",
    financialSituation: "",
    isFirstGen: "",
  });

  const set = (k: keyof FormData, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const canProceed = () => {
    if (step === 1) return form.communityCollege.trim().length > 0 && form.intendedMajor.trim().length > 0;
    if (step === 2) return form.currentGpa.length > 0;
    return true;
  };

  const submit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const gpaMap: Record<string, number> = { "4.0": 4.0, "3.7–3.9": 3.8, "3.3–3.6": 3.5, "3.0–3.2": 3.1, "2.7–2.9": 2.8, "2.4–2.6": 2.5, "Below 2.4": 2.2, "Not sure": 0 };
      const payload = {
        userId: user.id,
        fullName: form.fullName || user.firstName || t("common.student"),
        communityCollege: form.communityCollege,
        intendedMajor: form.intendedMajor,
        careerGoal: form.careerGoal,
        currentGpa: gpaMap[form.currentGpa] ?? 0,
        transferTimeline: form.transferTimeline,
        financialSituation: form.financialSituation,
        isFirstGen: form.isFirstGen,
        completionPercent: 60,
      };
      const r = await fetch("/api/profiles", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to create profile");
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  const progress = ((step) / (STEPS.length - 1)) * 100;
  const StepIcon = STEPS[step].icon;
  const motionOn = useMotionEnabled();
  const dir = useDirSign();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <Map className="h-6 w-6 text-indigo-600" />
          <span className="text-xl font-bold text-slate-900 uppercase tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>Kaleon</span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{t("onboarding.stepOf", { current: step + 1, total: STEPS.length })}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-1">
              <StepIcon className="h-5 w-5 text-indigo-200" />
              <h1 className="text-xl font-bold">{STEPS[step].title}</h1>
            </div>
            <p className="text-indigo-200 text-sm">{STEPS[step].subtitle}</p>
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
                    <div key={f.label} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-center">
                      <f.icon className="h-5 w-5 text-indigo-600 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-800">{f.label}</p>
                      <p className="text-[10px] text-slate-500">{f.desc}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <label htmlFor="ob-fullname" className="block text-sm font-medium text-slate-700 mb-1.5">{t("onboarding.yourName")}</label>
                  <input
                    id="ob-fullname"
                    value={form.fullName}
                    onChange={e => set("fullName", e.target.value)}
                    placeholder={t("onboarding.fullNamePlaceholder")}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-xs text-slate-400 text-center">{t("onboarding.timeNote")}</p>
              </fieldset>
            )}

            {step === 1 && (
              <fieldset className="space-y-4 border-0 p-0 m-0 min-w-0">
                <legend className="sr-only">{t("pages.onboarding.legend_collegeMajor")}</legend>
                <div>
                  <label htmlFor="ob-cc" className="block text-sm font-medium text-slate-700 mb-1.5">{t("onboarding.ccLabel")} <span className="text-red-500">*</span></label>
                  <input
                    id="ob-cc"
                    value={form.communityCollege}
                    onChange={e => set("communityCollege", e.target.value)}
                    placeholder={t("onboarding.ccPlaceholder")}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">{t("onboarding.ccHelp")}</p>
                </div>
                <div>
                  <label htmlFor="ob-major" className="block text-sm font-medium text-slate-700 mb-1.5">{t("onboarding.majorLabel")} <span className="text-red-500">*</span></label>
                  <input
                    id="ob-major"
                    value={form.intendedMajor}
                    onChange={e => set("intendedMajor", e.target.value)}
                    placeholder={t("onboarding.majorPlaceholder")}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="ob-career" className="block text-sm font-medium text-slate-700 mb-1.5">{t("onboarding.careerLabel")} <span className="text-slate-400 font-normal">{t("onboarding.careerOptional")}</span></label>
                  <input
                    id="ob-career"
                    value={form.careerGoal}
                    onChange={e => set("careerGoal", e.target.value)}
                    placeholder={t("onboarding.careerPlaceholder")}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </fieldset>
            )}

            {step === 2 && (
              <fieldset className="space-y-4 border-0 p-0 m-0 min-w-0">
                <legend className="sr-only">{t("pages.onboarding.legend_academic")}</legend>
                <fieldset className="border-0 p-0 m-0 min-w-0">
                  <legend className="block text-sm font-medium text-slate-700 mb-2">{t("onboarding.currentGpa")} <span className="text-red-500">*</span></legend>
                  <div className="grid grid-cols-2 gap-2">
                    {GPA_RANGE_KEYS.map(k => {
                      const value = GPA_RANGE_LABELS[k];
                      const label = (k === "gpaBelow" || k === "gpaNotSure") ? t(`onboarding.${k}`) : k;
                      return (
                        <button type="button" key={k} onClick={() => set("currentGpa", value)}
                          aria-pressed={form.currentGpa === value}
                          className={cn("text-sm px-3 py-2.5 rounded-xl border text-left font-medium transition-all",
                            form.currentGpa === value ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                          )}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset className="border-0 p-0 m-0 min-w-0">
                  <legend className="block text-sm font-medium text-slate-700 mb-2">{t("onboarding.transferWhen")}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSFER_TIMELINE_KEYS.map(k => {
                      const value = TRANSFER_TIMELINE_VALUES[k];
                      return (
                        <button type="button" key={k} onClick={() => set("transferTimeline", value)}
                          aria-pressed={form.transferTimeline === value}
                          className={cn("text-sm px-3 py-2.5 rounded-xl border text-left font-medium transition-all",
                            form.transferTimeline === value ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                          )}>
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
                  <legend className="block text-sm font-medium text-slate-700 mb-2">{t("onboarding.financialSituation")}</legend>
                  <div className="space-y-2">
                    {FINANCIAL_KEYS.map(k => {
                      const value = FINANCIAL_VALUES[k];
                      return (
                        <button type="button" key={k} onClick={() => set("financialSituation", value)}
                          aria-pressed={form.financialSituation === value}
                          className={cn("w-full text-sm px-3 py-2.5 rounded-xl border text-left font-medium transition-all",
                            form.financialSituation === value ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                          )}>
                          {t(`onboarding.${k}`)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset className="border-0 p-0 m-0 min-w-0">
                  <legend className="block text-sm font-medium text-slate-700 mb-2">{t("onboarding.firstGen")}</legend>
                  <div className="flex gap-2">
                    {[
                      { v: "Yes", label: t("onboarding.yes") },
                      { v: "No", label: t("onboarding.no") },
                      { v: "Not sure", label: t("onboarding.notSure") },
                    ].map(({ v, label }) => (
                      <button type="button" key={v} onClick={() => set("isFirstGen", v)}
                        aria-pressed={form.isFirstGen === v}
                        className={cn("flex-1 text-sm px-3 py-2.5 rounded-xl border font-medium transition-all",
                          form.isFirstGen === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </fieldset>
            )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer buttons */}
          <div className="px-8 pb-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="text-slate-600">
                <ArrowLeft className="h-4 w-4 mr-1" />{t("onboarding.back")}
              </Button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="bg-indigo-600 hover:bg-indigo-700 ml-auto"
              >
                {t("onboarding.continue")} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => void submit()}
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 ml-auto"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("onboarding.creating")}</>
                  : <><CheckCircle2 className="h-4 w-4 mr-2" />{t("onboarding.startJourney")}</>
                }
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          {t("onboarding.updateLater")}
        </p>
      </div>
    </div>
  );
}
