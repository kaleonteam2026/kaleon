import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Map, GraduationCap, Target, ArrowRight, ArrowLeft,
  BookOpen, CheckCircle2, User, Loader2,
} from "lucide-react";

const TRANSFER_TIMELINES = [
  "Fall 2025", "Spring 2026", "Fall 2026", "Spring 2027",
  "Fall 2027", "Spring 2028", "Fall 2028", "Undecided",
];

const GPA_RANGES = ["4.0", "3.7–3.9", "3.3–3.6", "3.0–3.2", "2.7–2.9", "2.4–2.6", "Below 2.4", "Not sure"];

const FINANCIAL_OPTIONS = [
  "Federal Pell Grant eligible (FAFSA)", "California Dream Act eligible (no DACA/FAFSA)",
  "AB 540 eligible", "Middle-income (no Pell)", "Full pay", "Not sure",
];

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

const STEPS = [
  { title: "Welcome to DYP", subtitle: "Let's personalize your transfer journey", icon: Map },
  { title: "Your College & Major", subtitle: "Tell us where you are and where you want to go", icon: GraduationCap },
  { title: "Academic Standing", subtitle: "Help us match you to the right opportunities", icon: BookOpen },
  { title: "Your Background", subtitle: "A few more details to personalize your experience", icon: User },
];

export default function Onboarding() {
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
        fullName: form.fullName || user.firstName || "Student",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <Map className="h-6 w-6 text-indigo-600" />
          <span className="text-xl font-bold text-slate-900 uppercase tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>DYP</span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Step {step + 1} of {STEPS.length}</span>
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
          <div className="px-8 py-6 space-y-5">
            {step === 0 && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: GraduationCap, label: "Transfer Planning", desc: "UC & CSU matching" },
                    { icon: BookOpen, label: "AI Pathways", desc: "Personalized roadmaps" },
                    { icon: Target, label: "Scholarships", desc: "Money for college" },
                  ].map(f => (
                    <div key={f.label} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-center">
                      <f.icon className="h-5 w-5 text-indigo-600 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-800">{f.label}</p>
                      <p className="text-[10px] text-slate-500">{f.desc}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Your name</label>
                  <input
                    value={form.fullName}
                    onChange={e => set("fullName", e.target.value)}
                    placeholder="Full name"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-xs text-slate-400 text-center">Takes about 2 minutes · Your data stays private</p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Your California Community College <span className="text-red-500">*</span></label>
                  <input
                    value={form.communityCollege}
                    onChange={e => set("communityCollege", e.target.value)}
                    placeholder="e.g. De Anza College, City College of SF, Santa Monica College..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Type the name of your California CC</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Intended major <span className="text-red-500">*</span></label>
                  <input
                    value={form.intendedMajor}
                    onChange={e => set("intendedMajor", e.target.value)}
                    placeholder="e.g. Computer Science, Business, Psychology, Biology..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Career goal <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    value={form.careerGoal}
                    onChange={e => set("careerGoal", e.target.value)}
                    placeholder="e.g. Software engineer, nurse, environmental scientist..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Current GPA <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {GPA_RANGES.map(g => (
                      <button key={g} onClick={() => set("currentGpa", g)}
                        className={cn("text-sm px-3 py-2.5 rounded-xl border text-left font-medium transition-all",
                          form.currentGpa === g ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                        )}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">When do you plan to transfer?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSFER_TIMELINES.map(t => (
                      <button key={t} onClick={() => set("transferTimeline", t)}
                        className={cn("text-sm px-3 py-2.5 rounded-xl border text-left font-medium transition-all",
                          form.transferTimeline === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                        )}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Financial situation</label>
                  <div className="space-y-2">
                    {FINANCIAL_OPTIONS.map(f => (
                      <button key={f} onClick={() => set("financialSituation", f)}
                        className={cn("w-full text-sm px-3 py-2.5 rounded-xl border text-left font-medium transition-all",
                          form.financialSituation === f ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                        )}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Are you a first-generation college student?</label>
                  <div className="flex gap-2">
                    {["Yes", "No", "Not sure"].map(v => (
                      <button key={v} onClick={() => set("isFirstGen", v)}
                        className={cn("flex-1 text-sm px-3 py-2.5 rounded-xl border font-medium transition-all",
                          form.isFirstGen === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                        )}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="px-8 pb-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="text-slate-600">
                <ArrowLeft className="h-4 w-4 mr-1" />Back
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
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => void submit()}
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 ml-auto"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating profile…</>
                  : <><CheckCircle2 className="h-4 w-4 mr-2" />Start My Journey</>
                }
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          You can update all of this in your profile at any time.
        </p>
      </div>
    </div>
  );
}
