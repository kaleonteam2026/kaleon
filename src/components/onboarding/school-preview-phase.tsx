import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { KALEON_LOGO_SRC } from "@/lib/brand";

// ─── Types ──────────────────────────────────────────────────────────

interface SchoolPreview {
  university: string;
  pathwayType: "least_compatible" | "moderately_compatible" | "most_compatible";
  compatibilityScore: number;
}

interface SchoolPreviewPhaseProps {
  pathways: SchoolPreview[];
  profileId: number;
}

// ─── Type display helpers ────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  least_compatible:      { label: "Reach School",  color: "#fb7185", bg: "rgba(251,113,133,0.1)",  border: "rgba(251,113,133,0.25)" },
  moderately_compatible: { label: "Match School",  color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.25)" },
  most_compatible:       { label: "Safety School", color: "#4ECCA3", bg: "rgba(78,204,163,0.1)",   border: "rgba(78,204,163,0.25)" },
};

// ─── Cubic bezier as const tuple to satisfy framer-motion's Easing type ──
const CUSTOM_EASE = [0.16, 1, 0.3, 1] as const;

// ─── Component ───────────────────────────────────────────────────────

export function SchoolPreviewPhase({ pathways, profileId }: SchoolPreviewPhaseProps) {
  const [, navigate] = useLocation();

  // Phase: "title" → "subtitle" → "actions"
  const [phase, setPhase] = useState<"title" | "subtitle" | "actions">("title");
  const [showCards, setShowCards] = useState(false);

  useEffect(() => {
    // Title stays for 4s, then fade to subtitle
    const t1 = setTimeout(() => setPhase("subtitle"), 4500);
    // Subtitle shows, then after it settles show actions
    const t2 = setTimeout(() => setPhase("actions"), 6500);
    // Cards start appearing after a short initial delay
    const t3 = setTimeout(() => setShowCards(true), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: "#070d1a" }}>
      {/* Logo */}
      <motion.img
        key="logo"
        src={KALEON_LOGO_SRC}
        alt="Kaleon"
        style={{ width: 52, height: 52, borderRadius: 10, objectFit: "contain" }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: CUSTOM_EASE }}
      />

      {/* Title / subtitle area */}
      <div className="h-20 flex items-center justify-center mt-6 mb-2">
        <AnimatePresence mode="wait">
          {phase === "title" && (
            <motion.h1
              key="chosen-title"
              className="text-2xl md:text-3xl font-bold text-white text-center leading-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.8, ease: CUSTOM_EASE }}
              style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}
            >
              These schools have been chosen for you
            </motion.h1>
          )}
          {(phase === "subtitle" || phase === "actions") && (
            <motion.p
              key="change-later"
              className="text-lg md:text-xl text-center leading-tight"
              style={{ color: "#94a3b8" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: CUSTOM_EASE }}
            >
              you can change these later on
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* School cards */}
      {showCards && (
        <div className="w-full max-w-md space-y-4 mt-2">
          {pathways.map((pw, i) => {
            const cfg = TYPE_CONFIG[pw.pathwayType] ?? TYPE_CONFIG.moderately_compatible;
            return (
              <motion.div
                key={`${pw.university}-${i}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.35, duration: 0.6, ease: CUSTOM_EASE }}
                className="p-5 rounded-xl flex items-center justify-between"
                style={{
                  background: "rgba(13,26,46,0.85)",
                  border: `1px solid ${cfg.border}`,
                }}
              >
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <span className="font-bold text-base text-white truncate">
                    {pw.university}
                  </span>
                  <span
                    className="text-[10px] pwc-font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full inline-block w-fit"
                    style={{
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <span className="text-2xl pwc-font-mono font-bold" style={{ color: cfg.color }}>
                    {pw.compatibilityScore}
                  </span>
                  <span className="text-[10px] pwc-font-mono block" style={{ color: "#64748b" }}>
                    score
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <AnimatePresence>
        {phase === "actions" && (
          <motion.div
            key="actions"
            className="mt-10 flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: CUSTOM_EASE }}
          >
            <button
              onClick={() => navigate(`/courses/${profileId}`)}
              className="px-10 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
            >
              Go to My Courses <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate(`/pathways/${profileId}`)}
              className="text-sm underline underline-offset-4 transition-opacity hover:opacity-80"
              style={{ color: "#4ECCA3" }}
            >
              See Full Details
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
