import { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUp, useMotionEnabled, DUR } from "@/lib/motion";

interface PageMotionProps {
  children: ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
}

// Reusable post-header animation wrapper. Wrap the content area of a page
// (everything below the LCP H1) so the brutalist fadeUp vocabulary applies
// uniformly across every page. Honors prefers-reduced-motion automatically.
export function PageMotion({
  children,
  className,
  distance = 8,
  duration = DUR.base,
}: PageMotionProps) {
  const enabled = useMotionEnabled();
  if (!enabled) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={fadeUp(distance, duration)}
    >
      {children}
    </motion.div>
  );
}
