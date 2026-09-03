import { useLocation } from "wouter";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { KALEON_LOGO_SRC } from "@/lib/brand";

interface ReadyPhaseProps {
  profileId: number;
}

export function ReadyPhase({ profileId }: ReadyPhaseProps) {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: "#0f172a" }}>
      <img src={KALEON_LOGO_SRC} alt="Kaleon" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "contain" }} />
      <h1 className="mt-6 text-3xl font-bold text-white text-center leading-tight">You're All Set!</h1>
      <p className="mt-2 text-sm" style={{ color: "#cbd5e1" }}>Now let's build your transfer plan together.</p>
      <div className="mt-8 w-full max-w-sm space-y-4">
        <div className="pl-4" style={{ borderLeft: "2px solid rgba(78,204,163,0.3)" }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4" style={{ color: "#4ECCA3" }} aria-hidden />
            <p className="font-bold text-sm text-white">Great First Step</p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>
            Your courses and information are saved. Next, we'll analyze your credits and generate personalized pathways matched to your goals.
          </p>
        </div>
        <div className="pl-4" style={{ borderLeft: "2px solid rgba(78,204,163,0.3)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4" style={{ color: "#4ECCA3" }} aria-hidden />
            <p className="font-bold text-sm text-white">Personalized Pathways Ahead</p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>
            AI will match you to UC/CSU programs based on your courses, GPA, and goals — showing you exactly what's needed for each option.
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate(`/courses/${profileId}`)}
        className="mt-8 px-10 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
      >
        Go to My Courses <ArrowRight size={16} />
      </button>
      <p className="mt-4 text-xs text-center max-w-xs leading-relaxed" style={{ color: "var(--app-text-muted)" }}>
        Head to your courses dashboard to analyze your credits and see which UC/CSU programs fit you best.
      </p>
    </div>
  );
}
