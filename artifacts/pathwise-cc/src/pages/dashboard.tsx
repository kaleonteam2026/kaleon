import { useAuth } from "@/contexts/auth-context";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Nav from "@/components/nav";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { fadeUp, staggerContainer, useMotionEnabled, useDirSign, hoverLift, DUR } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import {
  AlertCircle, BookOpen, Briefcase, ChevronRight, Compass,
  FileText, Info, LineChart, Map, Percent, Plus, Settings,
  Target, TrendingUp, User, Zap,
} from "lucide-react";

const FONT_STYLES = `
  .pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; }
  .pwc-font-sans { font-family: 'Inter', sans-serif; }
  .dash-card {
    background: rgba(13,26,46,0.8);
    border: 1px solid rgba(78,204,163,0.15);
    border-radius: 12px;
  }
  .dash-card-header {
    border-bottom: 1px solid rgba(78,204,163,0.1);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dash-stat-card {
    background: rgba(13,26,46,0.8);
    border: 1px solid rgba(78,204,163,0.15);
    border-radius: 10px;
    padding: 16px;
    text-align: left;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
    width: 100%;
  }
  .dash-stat-card:hover {
    border-color: rgba(78,204,163,0.35);
    box-shadow: 0 0 20px rgba(78,204,163,0.08);
  }
  .dash-module-row {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(78,204,163,0.06);
    cursor: pointer;
    transition: background 0.15s ease;
    text-align: left;
    width: 100%;
  }
  .dash-module-row:last-child { border-bottom: none; }
  .dash-module-row:hover { background: rgba(78,204,163,0.05); }
  .bar-fill { background: linear-gradient(90deg, #4ECCA3, #38b2ac); border-radius: 4px; height: 100%; transition: width 0.8s ease; }
`;

interface Profile {
  id: number;
  fullName?: string;
  communityCollege?: string;
  intendedMajor?: string;
  careerGoal?: string;
  currentGpa?: number;
}

interface ReadinessBreakdown {
  profile: number; gpa: number; units: number;
  pathway: number; guidebook: number; progress: number; totalUnits: number;
}

interface DashboardSummary {
  profileCompletionPercent: number;
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  estimatedGpa: number | null;
  savedPathwaysCount: number;
  guidebooksCount: number;
  topMatchUniversity: string | null;
  topMatchScore: number | null;
  chosenTransferSchool: string | null;
  chosenTransferScore: number | null;
  nextActions: string[];
  readinessScore: number;
  readinessLabel: string;
  readinessBreakdown: ReadinessBreakdown;
}

function readinessAccent(score: number) {
  if (score >= 60) return { stroke: "#4ECCA3", labelKey: "pages.progress.onTrack", color: "#4ECCA3" };
  if (score >= 40) return { stroke: "#f59e0b", labelKey: "pages.progress.needsFocus", color: "#f59e0b" };
  return { stroke: "#ef4444", labelKey: "pages.progress.atRisk", color: "#ef4444" };
}

function estimatedTransferTerm(totalUnits: number, t: (k: string) => string): string {
  const remaining = Math.max(0, 60 - totalUnits);
  const semestersLeft = Math.ceil(remaining / 15);
  const now = new Date();
  const monthsAhead = semestersLeft * 5;
  const target = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  const month = target.getMonth();
  const seasonKey = month >= 6 && month <= 11 ? "common.season_fall" : month >= 0 && month <= 4 ? "common.season_spring" : "common.season_summer";
  return `${t(seasonKey)} ${target.getFullYear()}`;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const reducedMotion = useReducedMotion();
  const dashMotionOn = useMotionEnabled();
  const dashDir = useDirSign();
  const dashLift = hoverLift(dashDir);
  const motionEnabled = useMotionEnabled();
  const itemVariants = useMemo(() => fadeUp(8, 0.22), []);
  const containerVariants = useMemo(() => staggerContainer(0.06), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/profiles/user/${user.id}`, { credentials: "include" })
      .then(r => r.json())
      .then((profiles: Profile[]) => {
        if (profiles.length > 0) {
          const p = profiles[0];
          setProfile(p);
          return fetch(`/api/dashboard-summary/${p.id}`, { credentials: "include" })
            .then(r => r.json())
            .then((s: DashboardSummary) => setSummary(s));
        }
        return undefined;
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const breakdown = summary?.readinessBreakdown;
  const score = summary?.readinessScore ?? 0;
  const accent = readinessAccent(score);
  const dashOffset = useMemo(() => `${(score / 100) * 283} 283`, [score]);

  const STATUS_LABEL = {
    Active: t("dashboard.active"),
    "Action Needed": t("dashboard.actionNeeded"),
    "Not Started": t("dashboard.notStarted"),
    "Pathway Active": t("dashboard.pathwayActive"),
  } as const;

  const roadmapItems = useMemo(() => {
    if (!profile) return [];
    return [
      {
        title: t("dashboard.myProfile"), icon: User,
        status: (summary?.profileCompletionPercent ?? 0) >= 75 ? "Active" : "Action Needed",
        metric: `${summary?.profileCompletionPercent ?? 0}%`,
        href: `/profile/${profile.id}`,
      },
      {
        title: t("dashboard.myCourses"), icon: BookOpen,
        status: (summary?.totalCourses ?? 0) > 0 ? "Active" : "Not Started",
        metric: summary?.totalCourses ? `${summary.totalCourses}` : "0",
        href: `/courses/${profile.id}`,
      },
      {
        title: t("dashboard.transferTargets"), icon: Target,
        status: summary?.chosenTransferSchool ? "Active" : summary?.topMatchUniversity ? "Action Needed" : "Not Started",
        metric: summary?.chosenTransferSchool
          ? summary.chosenTransferSchool.split(",")[0].slice(0, 18)
          : summary?.topMatchUniversity ? t("dashboard.pickPrimary") : t("dashboard.explore"),
        href: `/matches/${profile.id}`,
      },
      {
        title: t("dashboard.aiPathways"), icon: Map,
        status: (summary?.savedPathwaysCount ?? 0) > 0 ? "Active" : "Action Needed",
        metric: `${summary?.savedPathwaysCount ?? 0} ${t("dashboard.saved")}`,
        href: `/pathways/${profile.id}`,
      },
      {
        title: t("nav.scholarships"), icon: Percent,
        status: "Not Started",
        metric: t("dashboard.explore"),
        href: `/scholarships/${profile.id}`,
      },
      {
        title: t("dashboard.myProgress"), icon: LineChart,
        status: "Active",
        metric: t("dashboard.active"),
        href: `/progress/${profile.id}`,
      },
      {
        title: t("dashboard.internshipFinder"), icon: Briefcase,
        status: "Not Started",
        metric: t("dashboard.explore"),
        href: `/internships/${profile.id}`,
      },
    ] as const;
  }, [profile, summary, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#070d1a" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: "rgba(78,204,163,0.3)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #050c18 0%, #0a1628 100%)" }}>
        <Nav profileId={undefined} />
        <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 px-4 md:px-8 max-w-3xl mx-auto focus:outline-none">
          <div className="py-16 text-center">
            <Map className="h-16 w-16 mx-auto mb-4" style={{ color: "rgba(78,204,163,0.3)" }} />
            <h2 className="text-xl font-semibold mb-2" style={{ color: "#f1f5f9" }}>{t("dashboard.letsGetStarted")}</h2>
            <p className="mb-6 max-w-md mx-auto text-sm" style={{ color: "#64748b" }}>
              {t("dashboard.letsGetStartedBody")}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => navigate("/onboarding")}
                style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18", border: "none", borderRadius: 8 }}
              >
                <Plus className="h-4 w-4 mr-2" />{t("dashboard.quickSetup")}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/profile")}
                style={{ borderColor: "rgba(78,204,163,0.3)", color: "#4ECCA3", background: "transparent", borderRadius: 8 }}
              >
                {t("dashboard.manualSetup")}
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const transferTerm = estimatedTransferTerm(breakdown?.totalUnits ?? 0, t);
  const greeting = user?.firstName ?? profile.fullName?.split(" ")[0] ?? t("common.student");

  return (
    <div className="min-h-screen pwc-font-sans" style={{ background: "linear-gradient(160deg, #050c18 0%, #070d1a 100%)", color: "#e2e8f0" }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_STYLES }} />
      <Nav profileId={profile.id} />

      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none">
        <div className="max-w-[1280px] mx-auto p-4 md:p-6 grid grid-cols-12 gap-4 md:gap-6">

          {/* Header */}
          <header className="col-span-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 pb-4 mb-2" style={{ borderBottom: "1px solid rgba(78,204,163,0.2)" }}>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight uppercase" style={{ color: "#f8fafc" }}>{t("dashboard.missionControl")}</h1>
              <p className="text-base md:text-lg mt-1" style={{ color: "#64748b" }}>{t("dashboard.welcomeBack", { name: greeting })}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right flex flex-col items-end">
                <span className="text-xs pwc-font-mono uppercase" style={{ color: "#64748b" }}>{t("dashboard.estTransferDate")}</span>
                <span className="pwc-font-mono font-bold" style={{ color: "#4ECCA3" }}>{transferTerm}</span>
              </div>
              <button
                onClick={() => navigate(`/profile/${profile.id}`)}
                className="h-10 w-10 rounded flex items-center justify-center transition-all"
                aria-label={t("dashboard.openProfile")}
                style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18" }}
              >
                <User size={20} />
              </button>
            </div>
          </header>

          {/* Left: Profile + Urgent Actions */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 md:gap-6">
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
                    variants={dashMotionOn ? staggerContainer(0.06) : undefined}
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
          </div>

          {/* Center: Readiness Ring + Stat Tiles */}
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 md:gap-6">
            <div className="dash-card p-5 md:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold uppercase tracking-wider text-xs flex items-center gap-2" style={{ color: "#94a3b8" }}>
                  <Compass size={14} /> {t("dashboard.readinessRadar")}
                </h2>
                <div className="pwc-font-mono text-xs px-2 py-1 font-bold uppercase" style={{ background: "rgba(78,204,163,0.12)", color: accent.color, border: `1px solid ${accent.color}33`, borderRadius: 6 }}>
                  {summary?.readinessLabel ?? t(accent.labelKey)}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 mb-6">
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(78,204,163,0.08)" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="45" fill="none"
                      stroke={accent.stroke} strokeWidth="10"
                      strokeDasharray={dashOffset}
                      className={reducedMotion ? "" : "transition-all duration-1000 ease-out"}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl pwc-font-mono font-bold leading-none" style={{ color: "#f8fafc" }}>{score}</span>
                    <span className="text-xs uppercase tracking-widest mt-1" style={{ color: "#4ECCA3", opacity: 0.7 }}>{t("dashboard.score")}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4 w-full">
                  {[
                    { labelKey: "dashboard.breakdown_profile", val: breakdown?.profile ?? 0, max: 20 },
                    { labelKey: "dashboard.breakdown_gpa", val: breakdown?.gpa ?? 0, max: 25 },
                    { labelKey: "dashboard.breakdown_units", val: breakdown?.units ?? 0, max: 25 },
                    { labelKey: "dashboard.breakdown_pathway", val: breakdown?.pathway ?? 0, max: 15 },
                    { labelKey: "dashboard.breakdown_guidebook", val: breakdown?.guidebook ?? 0, max: 5 },
                    { labelKey: "dashboard.breakdown_progress", val: breakdown?.progress ?? 0, max: 10 },
                  ].map(item => (
                    <div key={item.labelKey} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="uppercase tracking-wider" style={{ color: "#94a3b8" }}>{t(item.labelKey)}</span>
                        <span className="pwc-font-mono" style={{ color: "#4ECCA3" }}>{item.val}/{item.max}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(78,204,163,0.08)" }}>
                        <div className="bar-fill" style={{ width: `${(item.val / item.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 mt-2" style={{ borderTop: "1px solid rgba(78,204,163,0.1)" }}>
                <span className="text-xs pwc-font-mono" style={{ color: "#64748b" }}>{t("dashboard.totalUnits")}</span>
                <div className="flex items-center gap-2">
                  <span className="pwc-font-mono font-bold text-lg" style={{ color: "#4ECCA3" }}>{breakdown?.totalUnits ?? 0}</span>
                  <span style={{ color: "#334155" }}>/</span>
                  <span className="pwc-font-mono" style={{ color: "#475569" }}>{t("dashboard.unitsRequired")}</span>
                </div>
              </div>
            </div>

            <motion.div
              className="grid grid-cols-2 gap-4 md:gap-6"
              initial={dashMotionOn ? "hidden" : false}
              whileInView={dashMotionOn ? "show" : undefined}
              viewport={{ once: true, margin: "-50px" }}
              variants={dashMotionOn ? staggerContainer(0.06) : undefined}
            >
              <motion.button
                onClick={() => navigate(`/courses/${profile.id}`)}
                variants={dashMotionOn ? fadeUp(6, DUR.base) : undefined}
                whileHover={dashMotionOn ? dashLift : undefined}
                className="dash-stat-card"
              >
                <div className="text-xs pwc-font-mono uppercase mb-2" style={{ color: "#475569" }}>{t("dashboard.estGpa")}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl pwc-font-mono font-bold" style={{ color: "#4ECCA3" }}>{summary?.estimatedGpa?.toFixed(2) ?? "—"}</span>
                  {profile.currentGpa != null && (
                    <span className="text-xs" style={{ color: "#475569" }}>{t("dashboard.current")}: {profile.currentGpa}</span>
                  )}
                </div>
              </motion.button>

              <motion.button
                onClick={() => navigate(`/courses/${profile.id}`)}
                variants={dashMotionOn ? fadeUp(6, DUR.base) : undefined}
                whileHover={dashMotionOn ? dashLift : undefined}
                className="dash-stat-card"
              >
                <div className="text-xs pwc-font-mono uppercase mb-2" style={{ color: "#475569" }}>{t("dashboard.coursesLogged")}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl pwc-font-mono font-bold" style={{ color: "#4ECCA3" }}>{summary?.totalCourses ?? 0}</span>
                  <span className="text-xs" style={{ color: "#475569" }}>
                    {t("dashboard.doneIp", { done: summary?.completedCourses ?? 0, ip: summary?.inProgressCourses ?? 0 })}
                  </span>
                </div>
              </motion.button>

              <motion.button
                onClick={() => navigate(`/profile/${profile.id}`)}
                variants={dashMotionOn ? fadeUp(6, DUR.base) : undefined}
                whileHover={dashMotionOn ? dashLift : undefined}
                className="dash-stat-card"
              >
                <div className="text-xs pwc-font-mono uppercase mb-2" style={{ color: "#475569" }}>{t("dashboard.profileComplete")}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl pwc-font-mono font-bold" style={{ color: "#4ECCA3" }}>{summary?.profileCompletionPercent ?? 0}%</span>
                </div>
              </motion.button>

              <motion.button
                onClick={() => navigate(`/pathways/${profile.id}`)}
                variants={dashMotionOn ? fadeUp(6, DUR.base) : undefined}
                whileHover={dashMotionOn ? dashLift : undefined}
                className="dash-stat-card"
                style={{ border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.06)" }}
              >
                <div className="text-xs pwc-font-mono uppercase mb-2" style={{ color: "#818cf8" }}>{t("dashboard.aiPathways")}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl pwc-font-mono font-bold" style={{ color: "#a5b4fc" }}>{summary?.savedPathwaysCount ?? 0}</span>
                  <span className="text-xs" style={{ color: "#6366f1" }}>{t("dashboard.saved")}</span>
                </div>
              </motion.button>
            </motion.div>
          </div>

          {/* Right: Modules + Disclaimer */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 md:gap-6">
            <div className="dash-card overflow-hidden flex-grow flex flex-col">
              <div className="dash-card-header">
                <h2 className="font-bold uppercase tracking-wider text-xs flex items-center gap-2" style={{ color: "#4ECCA3" }}>
                  <FileText size={14} /> {t("dashboard.ccSuccessModules")}
                </h2>
              </div>
              <motion.div
                className="flex-grow flex flex-col"
                initial={motionEnabled ? "hidden" : false}
                whileInView={motionEnabled ? "show" : undefined}
                viewport={{ once: true, margin: "-50px" }}
                variants={containerVariants}
              >
                {roadmapItems.map((item) => (
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
                        {STATUS_LABEL[item.status as keyof typeof STATUS_LABEL] ?? item.status}
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
              <Info size={16} className="shrink-0 mt-0.5" style={{ color: "#fbbf24", opacity: 0.7 }} />
              <p className="text-xs leading-relaxed" style={{ color: "#78716c" }}>
                <strong className="pwc-font-mono uppercase text-[10px] tracking-wider block mb-1" style={{ color: "#a78bfa", opacity: 0.8 }}>{t("dashboard.systemDisclaimer")}</strong>
                {t("dashboard.disclaimerBody")}
              </p>
            </div>

            <div className="hidden lg:block">
              <button
                onClick={() => navigate(`/progress/${profile.id}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all pwc-font-mono"
                style={{ border: "1px solid rgba(78,204,163,0.3)", borderRadius: 8, color: "#4ECCA3", background: "transparent" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(78,204,163,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <TrendingUp size={14} /> {t("dashboard.viewProgress")}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
