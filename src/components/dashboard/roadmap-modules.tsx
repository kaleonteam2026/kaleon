import { useLocation } from "wouter";
import { motion, type Variants } from "framer-motion";
import { ChevronRight, FileText, TrendingUp } from "lucide-react";
import { t } from "@/lib/copy";
import type { LucideIcon } from "lucide-react";

interface RoadmapItem {
  title: string;
  icon: LucideIcon;
  status: string;
  metric: string;
  href: string;
}

const STATUS_LABEL: Record<string, string> = {
  Active: "Active",
  "Action Needed": "Action Needed",
  "Not Started": "Not Started",
  "Pathway Active": "Pathway Active",
};

interface RoadmapModulesProps {
  items: readonly RoadmapItem[];
  profileId: number;
  motionOn: boolean;
  itemVariants?: Variants;
  containerVariants?: Variants;
}

export function RoadmapModules({ items, profileId, motionOn: dashMotionOn, itemVariants, containerVariants }: RoadmapModulesProps) {
  const [, navigate] = useLocation();
  return (
    <>
      <div className="dash-card overflow-hidden flex-grow flex flex-col">
        <div className="dash-card-header">
          <h2 className="font-bold uppercase tracking-wider text-xs flex items-center gap-2" style={{ color: "#4ECCA3" }}>
            <FileText size={14} /> {t("dashboard.ccSuccessModules")}
          </h2>
        </div>
        <motion.div
          className="flex-grow flex flex-col"
          initial={dashMotionOn ? "hidden" : false}
          whileInView={dashMotionOn ? "show" : undefined}
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
          {items.map((item) => (
            <motion.button
              key={item.title}
              onClick={() => navigate(item.href)}
              variants={itemVariants}
              className="dash-module-row group"
            >
              <div
                className="h-8 w-8 rounded flex items-center justify-center mr-3 shrink-0 transition-all"
                style={{ background: "rgba(78,204,163,0.08)", border: "1px solid rgba(78,204,163,0.2)", color: "#4ECCA3" }}
              >
                <item.icon size={14} />
              </div>
              <div className="flex-grow min-w-0">
                <div className="text-sm font-medium" style={{ color: "#cbd5e1" }}>{item.title}</div>
                <div className="text-xs pwc-font-mono flex items-center gap-1" style={{ color: "#475569" }}>
                  <span style={{
                    color: item.status === "Active" ? "#4ECCA3"
                      : item.status === "Action Needed" ? "#f59e0b"
                      : "#475569",
                  }}>●</span>
                  {STATUS_LABEL[item.status] ?? item.status}
                </div>
              </div>
              <div className="text-xs pwc-font-mono text-right ml-2 flex-shrink-0 flex items-center" style={{ color: "#475569" }}>
                {item.metric}
                <ChevronRight size={14} className="inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#4ECCA3" }} />
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <div className="flex gap-3 p-4" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 10 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" style={{ color: "#fbbf24", opacity: 0.7, width: 16, height: 16 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <p className="text-xs leading-relaxed" style={{ color: "#78716c" }}>
          <strong className="pwc-font-mono uppercase text-[10px] tracking-wider block mb-1" style={{ color: "#a78bfa", opacity: 0.8 }}>{t("dashboard.systemDisclaimer")}</strong>
          {t("dashboard.disclaimerBody")}
        </p>
      </div>

      <div className="hidden lg:block">
        <button
          onClick={() => navigate(`/progress/${profileId}`)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all pwc-font-mono"
          style={{ border: "1px solid rgba(78,204,163,0.3)", borderRadius: 8, color: "#4ECCA3", background: "transparent" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(78,204,163,0.08)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <TrendingUp size={14} /> {t("dashboard.viewProgress")}
        </button>
      </div>
    </>
  );
}
