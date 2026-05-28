import { useEffect, useState } from "react";
import { useReducedMotion, type Transition, type Variants } from "framer-motion";

export const EASE_STAMP: [number, number, number, number] = [0.2, 0.8, 0.2, 1];
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DUR = {
  fast: 0.18,
  base: 0.22,
  med: 0.28,
  slow: 0.32,
  stamp: 0.22,
} as const;

export function useMotionEnabled(): boolean {
  const reduced = useReducedMotion();
  return !reduced;
}

export function fadeUp(distance: number = 8, duration: number = DUR.med): Variants {
  return {
    hidden: { opacity: 0, y: distance },
    show: { opacity: 1, y: 0, transition: { duration, ease: EASE_OUT } },
  };
}

export function fadeIn(duration: number = DUR.med): Variants {
  return {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration, ease: EASE_OUT } },
  };
}

export const stamp: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: DUR.stamp, ease: EASE_STAMP },
  },
};

export function staggerContainer(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

export const arrowShimmer: Transition = {
  duration: 1.6,
  repeat: Infinity,
  ease: "easeInOut",
};

export const ctaShadowPulse: Transition = {
  duration: 2.4,
  repeat: Infinity,
  ease: "easeInOut",
  repeatType: "mirror",
};

// RTL-safe x-direction sign. Returns -1 in RTL, 1 in LTR.
// Reads document.dir / <html dir> and updates on locale changes.
export function useDirSign(): 1 | -1 {
  const [sign, setSign] = useState<1 | -1>(() => {
    if (typeof document === "undefined") return 1;
    return document.documentElement.dir === "rtl" ? -1 : 1;
  });
  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setSign(document.documentElement.dir === "rtl" ? -1 : 1);
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["dir", "lang"] });
    return () => obs.disconnect();
  }, []);
  return sign;
}

// Brutalist hover lift: shifts toward top-leading and grows the offset shadow.
// Pass dirSign from useDirSign() for RTL-correct horizontal direction.
export function hoverLift(dirSign: 1 | -1 = 1) {
  return {
    x: -1 * dirSign,
    y: -1,
    boxShadow: "6px 6px 0 0 rgba(15,23,42,1)",
    transition: { duration: DUR.fast, ease: EASE_OUT },
  };
}
