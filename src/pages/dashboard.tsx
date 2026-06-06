import { useAuth } from "@/contexts/auth-context";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AppPageLayout } from "@/components/app-page-layout";
import { PageLoadingState } from "@/components/page-loading-state";
import { fadeUp, useBrutalistMotion, DUR } from "@/lib/motion";
import { getProfileForUser, getCoursesForProfile, computeDashboardSummary } from "@/lib/supabase-profiles";
import { displayName } from "@/lib/display-name";
import { getDevDashboardSummary, getDevProfiles, isAuthBypass } from "@/lib/dev-profile";
import {
  BookOpen, Compass, LineChart, Map, Percent, Target, User,
} from "lucide-react";
import { t } from "@/lib/copy";
import type { DashboardSummary, StudentProfile } from "@/types/profile";

import { DashboardEmpty } from "@/components/dashboard/dashboard-empty";
import { PathHeroCard } from "@/components/dashboard/path-hero-card";
import { SidebarProfile } from "@/components/dashboard/sidebar-profile";
import { RoadmapModules } from "@/components/dashboard/roadmap-modules";
import { SemesterProgress } from "@/components/dashboard/semester-progress";

function readinessAccent(score: number) {
  if (score >= 60) return { stroke: "#4ECCA3", labelKey: "pages.progress.onTrack", color: "#4ECCA3" };
  if (score >= 40) return { stroke: "#f59e0b", labelKey: "pages.progress.needsFocus", color: "#f59e0b" };
  return { stroke: "#ef4444", labelKey: "pages.progress.atRisk", color: "#ef4444" };
}

function estimatedTransferTerm(totalUnits: number): string {
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
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const {
    enabled: dashMotionOn,
    lift: dashLift,
    itemVariants,
    containerVariants,
  } = useBrutalistMotion();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    if (isAuthBypass()) {
      const profiles = getDevProfiles();
      if (profiles.length > 0) {
        const p = profiles[0];
        setProfile(p);
        setSummary(getDevDashboardSummary(p));
      }
      setLoading(false);
      return;
    }

    // Real Supabase path: fetch profile + courses directly
    const loadData = async () => {
      try {
        const prof = await getProfileForUser(user.id);
        if (prof) {
          setProfile(prof);
          const courses = await getCoursesForProfile(prof.id);
          setSummary(computeDashboardSummary(prof, courses));
        }
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.id]);

  const breakdown = summary?.readinessBreakdown;
  const score = summary?.readinessScore ?? 0;
  const accent = readinessAccent(score);
  const dashOffset = useMemo(() => `${(score / 100) * 283} 283`, [score]);

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
    ] as const;
  }, [profile, summary, t]);

  if (loading) {
    return <PageLoadingState variant="dark" />;
  }

  if (!profile) {
    return <DashboardEmpty user={user} isAuthenticated={isAuthenticated} />;
  }

  const transferTerm = estimatedTransferTerm(breakdown?.totalUnits ?? 0);
  const greeting = displayName(user, profile.fullName, t("common.student"));
  const totalUnits = breakdown?.totalUnits ?? 0;
  const targetSchool = summary?.chosenTransferSchool ?? summary?.topMatchUniversity;

  return (
    <AppPageLayout variant="dark" profileId={profile.id} maxWidth="wide" bareContent>
      <div className="grid grid-cols-12 gap-4 md:gap-6">

        {/* Path Hero Card */}
        {targetSchool && (
          <PathHeroCard
            targetSchool={targetSchool}
            intendedMajor={profile.intendedMajor}
            communityCollege={profile.communityCollege}
            transferTerm={transferTerm}
            totalUnits={totalUnits}
          />
        )}

        {/* Header */}
        <header className="col-span-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 pb-4 mb-2 pt-1" style={{ borderBottom: "1px solid rgba(78,204,163,0.2)" }}>
          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight uppercase leading-tight" style={{ color: "#f8fafc" }}>{t("dashboard.missionControl")}</h1>
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
          <SidebarProfile
            profile={profile}
            summary={summary}
            motionOn={dashMotionOn}
            lift={dashLift}
            itemVariants={itemVariants}
            containerVariants={containerVariants}
          />
        </div>

        {/* Center: Readiness Ring + Stats */}
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
                    className={dashMotionOn ? "transition-all duration-1000 ease-out" : ""}
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
            variants={containerVariants}
          >
            <motion.button
              onClick={() => navigate(`/courses/${profile.id}`)}
              variants={dashMotionOn ? fadeUp(6, DUR.base) : undefined}
              {...(dashMotionOn ? { whileHover: dashLift } : {})}
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
              {...(dashMotionOn ? { whileHover: dashLift } : {})}
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
              {...(dashMotionOn ? { whileHover: dashLift } : {})}
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
              {...(dashMotionOn ? { whileHover: dashLift } : {})}
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
          <RoadmapModules
            items={roadmapItems}
            profileId={profile.id}
            motionOn={dashMotionOn}
            itemVariants={itemVariants}
            containerVariants={containerVariants}
          />
          <SemesterProgress profileId={profile.id} />
        </div>

      </div>
    </AppPageLayout>
  );
}
