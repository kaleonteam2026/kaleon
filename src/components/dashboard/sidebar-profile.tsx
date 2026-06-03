import { useLocation } from "wouter";
import { motion, type Variants, type TargetAndTransition, type VariantLabels }from "framer-motion";
import { Settings, Zap, AlertCircle } from "lucide-react";
import { t } from "@/lib/copy";
import { fadeUp, DUR } from "@/lib/motion";
import type { DashboardSummary, StudentProfile } from "@/types/profile";

interface SidebarProfileProps {
  profile: StudentProfile;
  summary: DashboardSummary | null;
  motionOn: boolean;
  lift: VariantLabels | TargetAndTransition;
  itemVariants?: Variants;
  containerVariants?: Variants;
}

export function SidebarProfile({ profile, summary, motionOn: dashMotionOn, lift: dashLift, itemVariants, containerVariants }: SidebarProfileProps) {
  const [, navigate] = useLocation();
  return (
    <>
      <div className="dash-card">
        <div className="dash-card-header">
          <h2 className="font-bold uppercase tracking-wider text-xs flex items-center gap-2" style={{ color: "#4ECCA3" }}>
            <Settings size={14} /> {t("dashboard.userProfile")}
          </h2>
          <button
            onClick={() => navigate(`/profile/${profile.id}`)}
            className="text-xs pwc-font-mono transition-colors"
            style={{ color: "#4ECCA3", opacity: 0.7 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
          >{t("dashboard.edit")}</button>
        </div>
        <div className="space-y-4 text-sm p-4">
          <div>
            <div className="text-xs pwc-font-mono mb-1 uppercase" style={{ color: "#475569" }}>{t("dashboard.institution")}</div>
            <div className="font-medium" style={{ color: "#cbd5e1" }}>{profile.communityCollege ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs pwc-font-mono mb-1 uppercase" style={{ color: "#475569" }}>{t("dashboard.targetMajor")}</div>
            <div className="font-medium" style={{ color: "#cbd5e1" }}>{profile.intendedMajor ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs pwc-font-mono mb-1 uppercase" style={{ color: "#475569" }}>{t("dashboard.careerGoal")}</div>
            <div className="font-medium" style={{ color: "#cbd5e1" }}>{profile.careerGoal ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs pwc-font-mono mb-1 uppercase flex items-center gap-1.5" style={{ color: "#475569" }}>
              {t("dashboard.chosenSchool")}
              <span className="pwc-font-mono text-[9px] px-1 py-0.5 tracking-widest" style={{ background: "#4ECCA3", color: "#050c18", borderRadius: 3 }}>{t("dashboard.primary")}</span>
            </div>
            <div className="font-medium flex items-center gap-2">
              {summary?.chosenTransferSchool ? (
                <span style={{ color: "#cbd5e1" }}>{summary.chosenTransferSchool}</span>
              ) : (
                <span className="italic text-sm" style={{ color: "#475569" }}>{t("dashboard.pickPrimary")}</span>
              )}
              {summary?.chosenTransferScore != null && (
                <span className="text-xs px-1.5 py-0.5 rounded pwc-font-mono" style={{ background: "rgba(78,204,163,0.15)", color: "#4ECCA3", border: "1px solid rgba(78,204,163,0.3)" }}>
                  {summary.chosenTransferScore}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs pwc-font-mono mb-1 uppercase flex items-center gap-1.5" style={{ color: "#475569" }}>
              {t("dashboard.topMatch")}
              <span className="pwc-font-mono text-[9px] px-1 py-0.5 tracking-widest" style={{ background: "#10b981", color: "#fff", borderRadius: 3 }}>{t("dashboard.safety")}</span>
            </div>
            <div className="font-medium flex items-center gap-2">
              <span style={{ color: "#cbd5e1" }}>{summary?.topMatchUniversity ?? t("dashboard.generatePathways")}</span>
              {summary?.topMatchScore != null && (
                <span className="text-xs px-1.5 py-0.5 rounded pwc-font-mono" style={{ background: "rgba(78,204,163,0.15)", color: "#4ECCA3", border: "1px solid rgba(78,204,163,0.3)" }}>
                  {summary.topMatchScore}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-card flex flex-col flex-grow">
        <div className="dash-card-header">
          <h2 className="font-bold uppercase tracking-wider text-xs flex items-center gap-2" style={{ color: "#f59e0b" }}>
            <Zap size={14} /> {t("dashboard.urgentActions")}
          </h2>
        </div>
        <div className="p-4 flex-grow">
          {(summary?.nextActions ?? []).length === 0 ? (
            <p className="text-sm italic" style={{ color: "#475569" }}>{t("dashboard.noUrgent")}</p>
          ) : (
            <motion.div
              className="space-y-3"
              initial={dashMotionOn ? "hidden" : false}
              whileInView={dashMotionOn ? "show" : undefined}
              viewport={{ once: true, margin: "-50px" }}
              variants={containerVariants}
            >
              {summary!.nextActions.map((action, i) => (
                <motion.div
                  key={i}
                  variants={dashMotionOn ? fadeUp(6, DUR.base) : undefined}
                  whileHover={dashMotionOn ? dashLift : undefined}
                  className="flex items-start gap-3 p-3"
                  style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8 }}
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: "#ef4444" }} />
                  <span className="text-sm font-medium leading-tight" style={{ color: "#fca5a5" }}>{action}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
