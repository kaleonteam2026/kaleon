import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { KALEON_LOGO_SRC } from "@/lib/brand";

export function ReadyPhase() {
  const [, navigate] = useLocation();
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
