import { useAuth } from "@/contexts/auth-context";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import Nav from "@/components/nav";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  ChevronRight,
  Compass,
  FileText,
  Info,
  LineChart,
  Map,
  Percent,
  Plus,
  Settings,
  Target,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";

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

const FONT_STYLES = `
  .pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; }
  .pwc-font-sans { font-family: 'Inter', sans-serif; }
`;

function readinessAccent(score: number) {
  if (score >= 80) return { stroke: "#10b981", chip: "bg-emerald-500", label: "On Track" };
  if (score >= 60) return { stroke: "#10b981", chip: "bg-emerald-500", label: "On Track" };
  if (score >= 40) return { stroke: "#f59e0b", chip: "bg-amber-500", label: "Needs Focus" };
  return { stroke: "#ef4444", chip: "bg-red-500", label: "At Risk" };
}

function estimatedTransferTerm(totalUnits: number): string {
  const remaining = Math.max(0, 60 - totalUnits);
  const semestersLeft = Math.ceil(remaining / 15);
  const now = new Date();
  const monthsAhead = semestersLeft * 5;
  const target = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  const month = target.getMonth();
  const term = month >= 6 && month <= 11 ? "Fall" : month >= 0 && month <= 4 ? "Spring" : "Summer";
  return `${term} ${target.getFullYear()}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const reducedMotion = useReducedMotion();
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

  const roadmapItems = useMemo(() => {
    if (!profile) return [];
    return [
      {
        title: "My Profile", icon: User,
        status: (summary?.profileCompletionPercent ?? 0) >= 75 ? "Active" : "Action Needed",
        metric: `${summary?.profileCompletionPercent ?? 0}%`,
        href: `/profile/${profile.id}`,
      },
      {
        title: "My Courses", icon: BookOpen,
        status: (summary?.totalCourses ?? 0) > 0 ? "Active" : "Not Started",
        metric: summary?.totalCourses ? `${summary.totalCourses} Logged` : "0 Logged",
        href: `/courses/${profile.id}`,
      },
      {
        title: "Transfer Targets", icon: Target,
        status: summary?.chosenTransferSchool ? "Active" : summary?.topMatchUniversity ? "Action Needed" : "Not Started",
        metric: summary?.chosenTransferSchool
          ? `Chosen: ${summary.chosenTransferSchool.split(",")[0].slice(0, 18)}`
          : summary?.topMatchUniversity ? "Pick Primary" : "Explore",
        href: `/matches/${profile.id}`,
      },
      {
        title: "AI Pathways", icon: Map,
        status: (summary?.savedPathwaysCount ?? 0) > 0 ? "Active" : "Action Needed",
        metric: `${summary?.savedPathwaysCount ?? 0} Saved`,
        href: `/pathways/${profile.id}`,
      },
      {
        title: "Scholarships", icon: Percent,
        status: "Not Started",
        metric: "Explore",
        href: `/scholarships/${profile.id}`,
      },
      {
        title: "My Progress", icon: LineChart,
        status: "Active",
        metric: "On Track",
        href: `/progress/${profile.id}`,
      },
      {
        title: "Internship Finder", icon: Briefcase,
        status: "Not Started",
        metric: "Explore",
        href: `/internships/${profile.id}`,
      },
    ];
  }, [profile, summary]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f4f4f5]">
        <Nav profileId={undefined} />
        <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 px-4 md:px-8 max-w-3xl mx-auto focus:outline-none">
          <div className="py-16 text-center">
            <Map className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Let's get started</h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto text-sm">
              Create your student profile to unlock personalized transfer planning, AI pathways, internship matching, and scholarship recommendations.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/onboarding")} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />Quick Setup (2 min)
              </Button>
              <Button variant="outline" onClick={() => navigate("/profile")} className="border-slate-300">
                Manual Setup
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const transferTerm = estimatedTransferTerm(breakdown?.totalUnits ?? 0);
  const greeting = user?.firstName ?? profile.fullName?.split(" ")[0] ?? "Student";

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900 pwc-font-sans selection:bg-slate-300">
      <style dangerouslySetInnerHTML={{ __html: FONT_STYLES }} />
      <Nav profileId={profile.id} />

      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none">
        <div className="max-w-[1280px] mx-auto p-4 md:p-6 grid grid-cols-12 gap-4 md:gap-6">

          {/* Header */}
          <header className="col-span-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b-2 border-slate-900 pb-4 mb-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 uppercase">Mission Control</h1>
              <p className="text-base md:text-lg text-slate-600 mt-1">Welcome back, {greeting} — System ready.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right flex flex-col items-end">
                <span className="text-xs pwc-font-mono text-slate-600 uppercase">Est. Transfer Date</span>
                <span className="pwc-font-mono font-bold">{transferTerm}</span>
              </div>
              <button
                onClick={() => navigate(`/profile/${profile.id}`)}
                className="h-10 w-10 bg-slate-900 rounded flex items-center justify-center text-white hover:bg-slate-700 transition-colors"
                aria-label="Open profile"
              >
                <User size={20} />
              </button>
            </div>
          </header>

          {/* Left: Profile + Urgent Actions */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 md:gap-6">
            <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-5">
              <div className="flex items-center justify-between mb-4 border-b-2 border-slate-100 pb-3">
                <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                  <Settings size={16} /> User Profile
                </h2>
                <button
                  onClick={() => navigate(`/profile/${profile.id}`)}
                  className="text-xs pwc-font-mono underline hover:text-slate-600"
                >Edit</button>
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs pwc-font-mono text-slate-600 mb-1">Institution</div>
                  <div className="font-medium">{profile.communityCollege ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs pwc-font-mono text-slate-600 mb-1">Target Major</div>
                  <div className="font-medium">{profile.intendedMajor ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs pwc-font-mono text-slate-600 mb-1">Career Goal</div>
                  <div className="font-medium">{profile.careerGoal ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs pwc-font-mono text-slate-600 mb-1 flex items-center gap-1.5">
                    Chosen School
                    <span className="pwc-font-mono text-[9px] bg-slate-900 text-white px-1 py-0.5 tracking-widest">PRIMARY</span>
                  </div>
                  <div className="font-medium flex items-center gap-2">
                    {summary?.chosenTransferSchool ?? (
                      <span className="text-slate-600 italic text-sm">Pick a primary on Pathway</span>
                    )}
                    {summary?.chosenTransferScore != null && (
                      <span className="bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded pwc-font-mono">
                        {summary.chosenTransferScore}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs pwc-font-mono text-slate-600 mb-1 flex items-center gap-1.5">
                    Top Match
                    <span className="pwc-font-mono text-[9px] bg-emerald-600 text-white px-1 py-0.5 tracking-widest">SAFETY</span>
                  </div>
                  <div className="font-medium flex items-center gap-2">
                    {summary?.topMatchUniversity ?? "Generate pathways"}
                    {summary?.topMatchScore != null && (
                      <span className="bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded pwc-font-mono">
                        {summary.topMatchScore}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-5 flex-grow">
              <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2 mb-4">
                <Zap size={16} /> Urgent Actions
              </h2>
              <div className="space-y-3">
                {(summary?.nextActions ?? []).length === 0 ? (
                  <p className="text-sm text-slate-600 italic">No urgent actions — keep going!</p>
                ) : (
                  summary!.nextActions.map((action, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded"
                    >
                      <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                      <span className="text-sm font-medium text-red-900 leading-tight">{action}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Center: Readiness Radar + Stat Tiles */}
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 md:gap-6">
            <div className="bg-slate-900 text-white p-5 md:p-6 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold uppercase tracking-wider text-sm text-slate-300 flex items-center gap-2">
                  <Compass size={16} /> Readiness Radar
                </h2>
                <div className={`${accent.chip} text-slate-900 pwc-font-mono text-xs px-2 py-1 font-bold uppercase`}>
                  {summary?.readinessLabel ?? accent.label}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 mb-6">
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="45" fill="none"
                      stroke={accent.stroke} strokeWidth="10"
                      strokeDasharray={dashOffset}
                      className={reducedMotion ? "" : "transition-all duration-1000 ease-out"}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl pwc-font-mono font-bold leading-none">{score}</span>
                    <span className="text-xs text-slate-300 uppercase tracking-widest mt-1">Score</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4 w-full">
                  {[
                    { label: "Profile", val: breakdown?.profile ?? 0, max: 20 },
                    { label: "GPA", val: breakdown?.gpa ?? 0, max: 25 },
                    { label: "Units", val: breakdown?.units ?? 0, max: 25 },
                    { label: "Pathway", val: breakdown?.pathway ?? 0, max: 15 },
                    { label: "Guidebook", val: breakdown?.guidebook ?? 0, max: 5 },
                    { label: "Progress", val: breakdown?.progress ?? 0, max: 10 },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 uppercase tracking-wider">{item.label}</span>
                        <span className="pwc-font-mono text-slate-300">{item.val}/{item.max}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-300"
                          style={{ width: `${(item.val / item.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-2">
                <span className="text-xs text-slate-300 pwc-font-mono">TOTAL TRANSFERABLE UNITS</span>
                <div className="flex items-center gap-2">
                  <span className="pwc-font-mono font-bold text-lg">{breakdown?.totalUnits ?? 0}</span>
                  <span className="text-slate-300">/</span>
                  <span className="pwc-font-mono text-slate-300">60 Required</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <button
                onClick={() => navigate(`/courses/${profile.id}`)}
                className="bg-white border-2 border-slate-900 p-4 text-left shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-transform"
              >
                <div className="text-xs pwc-font-mono text-slate-600 uppercase mb-2">Est. GPA</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl pwc-font-mono font-bold">{summary?.estimatedGpa?.toFixed(2) ?? "—"}</span>
                  {profile.currentGpa != null && (
                    <span className="text-xs text-slate-600">Current: {profile.currentGpa}</span>
                  )}
                </div>
              </button>

              <button
                onClick={() => navigate(`/courses/${profile.id}`)}
                className="bg-white border-2 border-slate-900 p-4 text-left shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-transform"
              >
                <div className="text-xs pwc-font-mono text-slate-600 uppercase mb-2">Courses Logged</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl pwc-font-mono font-bold">{summary?.totalCourses ?? 0}</span>
                  <span className="text-xs text-slate-600">
                    {summary?.completedCourses ?? 0} Done, {summary?.inProgressCourses ?? 0} IP
                  </span>
                </div>
              </button>

              <button
                onClick={() => navigate(`/profile/${profile.id}`)}
                className="bg-white border-2 border-slate-900 p-4 text-left shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-transform"
              >
                <div className="text-xs pwc-font-mono text-slate-600 uppercase mb-2">Profile Complete</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl pwc-font-mono font-bold">{summary?.profileCompletionPercent ?? 0}%</span>
                </div>
              </button>

              <button
                onClick={() => navigate(`/pathways/${profile.id}`)}
                className="bg-blue-50 border-2 border-blue-900 p-4 text-left shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-transform"
              >
                <div className="text-xs pwc-font-mono text-blue-800 uppercase mb-2">AI Pathways</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl pwc-font-mono font-bold text-blue-900">{summary?.savedPathwaysCount ?? 0}</span>
                  <span className="text-xs text-blue-700">Saved</span>
                </div>
              </button>
            </div>
          </div>

          {/* Right: Roadmap + Disclaimer */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 md:gap-6">
            <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-0 overflow-hidden flex-grow flex flex-col">
              <div className="p-4 border-b-2 border-slate-900 bg-slate-50">
                <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                  <FileText size={16} /> CC Success Modules
                </h2>
              </div>
              <div className="flex-grow flex flex-col">
                {roadmapItems.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => navigate(item.href)}
                    className="flex items-center p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors group text-left"
                  >
                    <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center mr-3 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <item.icon size={14} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs pwc-font-mono text-slate-600 flex items-center gap-1">
                        <span className={
                          item.status === "Active" ? "text-green-600" :
                          item.status === "Action Needed" ? "text-amber-600" : "text-slate-600"
                        }>●</span>
                        {item.status}
                      </div>
                    </div>
                    <div className="text-xs pwc-font-mono text-slate-600 text-right ml-2 flex-shrink-0">
                      {item.metric}
                      <ChevronRight size={14} className="inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-200 border border-slate-300 p-4 rounded text-xs text-slate-600 flex gap-3">
              <Info size={16} className="shrink-0 text-slate-600" />
              <p className="leading-relaxed">
                <strong className="pwc-font-mono uppercase text-[10px] tracking-wider block mb-1">System Disclaimer</strong>
                Scores and GPA estimates are AI-generated based on current inputs and historic transfer data. Always verify requirements directly with counselors or ASSIST.org.
              </p>
            </div>

            <div className="hidden lg:block">
              <button
                onClick={() => navigate(`/progress/${profile.id}`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-slate-900 bg-white text-sm font-bold uppercase tracking-wider hover:bg-slate-900 hover:text-white transition-colors"
              >
                <TrendingUp size={14} /> View Progress
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
