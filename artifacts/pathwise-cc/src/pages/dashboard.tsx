import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  User, BookOpen, GraduationCap, Target, Award, Map,
  ArrowRight, ChevronRight, AlertTriangle, Plus, TrendingUp, Search,
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
  nextActions: string[];
  readinessScore: number;
  readinessLabel: string;
  readinessBreakdown: ReadinessBreakdown;
}

// ─── Readiness Gauge ──────────────────────────────────────────────────────────
function ReadinessGauge({ score, label, breakdown }: {
  score: number; label: string; breakdown: ReadinessBreakdown;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#6366f1" : score >= 40 ? "#f59e0b" : "#ef4444";
  const bgLabel = score >= 80 ? "bg-emerald-50 border-emerald-200" : score >= 60 ? "bg-indigo-50 border-indigo-200" : score >= 40 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  const textColor = score >= 80 ? "text-emerald-700" : score >= 60 ? "text-indigo-700" : score >= 40 ? "text-amber-700" : "text-red-700";

  const components = [
    { label: "Profile", max: 20, val: breakdown.profile },
    { label: "GPA", max: 25, val: breakdown.gpa },
    { label: `Units (${breakdown.totalUnits}/60)`, max: 25, val: breakdown.units },
    { label: "Pathway", max: 15, val: breakdown.pathway },
    { label: "Guidebook", max: 5, val: breakdown.guidebook },
    { label: "Progress", max: 10, val: breakdown.progress },
  ];

  return (
    <div className={cn("bg-white border rounded-2xl p-5 shadow-sm", bgLabel)}>
      <div className="flex items-center gap-6 flex-wrap">
        {/* Ring */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle
              cx="64" cy="64" r={radius} fill="none"
              stroke={color} strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 64 64)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
            <text x="64" y="60" textAnchor="middle" fontSize="26" fontWeight="800" fill={color}>{score}</text>
            <text x="64" y="76" textAnchor="middle" fontSize="11" fill="#64748b">out of 100</text>
          </svg>
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", bgLabel, textColor)}>{label}</span>
        </div>
        {/* Breakdown bars */}
        <div className="flex-1 min-w-[180px] space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Score Breakdown</p>
          {components.map(c => (
            <div key={c.label} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-28 truncate">{c.label}</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(c.val / c.max) * 100}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 w-10 text-right">{c.val}/{c.max}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav profileId={profile?.id} />
      <main className="pt-14 pb-20 md:pb-8 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto">
        <div className="py-8 border-b border-slate-200">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Your AI-powered community college success hub</p>
        </div>

        {!profile ? (
          <div className="py-16 text-center">
            <Map className="h-16 w-16 text-indigo-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Let's get started</h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm">
              Create your student profile to unlock personalized transfer planning, AI pathways, internship matching, and scholarship recommendations.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/onboarding")} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />Quick Setup (2 min)
              </Button>
              <Button variant="outline" onClick={() => navigate("/profile")} className="border-slate-300">
                Manual Setup
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {/* Readiness Score */}
            {summary && summary.readinessScore !== undefined && (
              <ReadinessGauge
                score={summary.readinessScore}
                label={summary.readinessLabel}
                breakdown={summary.readinessBreakdown}
              />
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: User, label: "Profile Complete", value: `${summary?.profileCompletionPercent ?? 0}%`, color: "text-indigo-600", href: `/profile/${profile.id}` },
                { icon: BookOpen, label: "Courses Logged", value: summary?.totalCourses ?? 0, color: "text-emerald-600", href: `/courses/${profile.id}` },
                { icon: GraduationCap, label: "Estimated GPA", value: summary?.estimatedGpa ? summary.estimatedGpa.toFixed(2) : "—", color: "text-amber-600", href: `/courses/${profile.id}` },
                { icon: Target, label: "AI Pathways", value: summary?.savedPathwaysCount ?? 0, color: "text-rose-600", href: `/pathways/${profile.id}` },
              ].map((stat) => (
                <button key={stat.label} onClick={() => navigate(stat.href)}
                  className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all">
                  <stat.icon className={`h-5 w-5 mb-2 ${stat.color}`} />
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Journey steps */}
              <div className="md:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Your CC Success Roadmap</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { icon: User, label: "My Profile", desc: profile.intendedMajor ? `${profile.intendedMajor} at ${profile.communityCollege ?? "your CC"}` : "Complete your student profile", href: `/profile/${profile.id}`, done: (summary?.profileCompletionPercent ?? 0) > 50 },
                      { icon: BookOpen, label: "My Courses", desc: summary?.totalCourses ? `${summary.completedCourses} completed, ${summary.inProgressCourses} in progress` : "Add your CC courses", href: `/courses/${profile.id}`, done: (summary?.totalCourses ?? 0) > 0 },
                      { icon: GraduationCap, label: "Transfer Targets", desc: summary?.topMatchUniversity ? `Top match: ${summary.topMatchUniversity} (${summary.topMatchScore}% compatible)` : "See which UC/CSU schools fit your profile", href: `/matches/${profile.id}`, done: false },
                      { icon: Target, label: "AI Transfer Pathways", desc: summary?.savedPathwaysCount ? `${summary.savedPathwaysCount} pathways generated` : "Generate detailed AI pathway reports", href: `/pathways/${profile.id}`, done: (summary?.savedPathwaysCount ?? 0) > 0 },
                      { icon: Award, label: "Scholarships & CC Programs", desc: "Scholarships + on-campus programs at your community college", href: `/scholarships/${profile.id}`, done: false },
                      { icon: TrendingUp, label: "My Progress", desc: "Log milestones and get AI feedback on your transfer readiness", href: `/progress/${profile.id}`, done: false },
                      { icon: Search, label: "Internship Finder", desc: "Federal, CA state, and research internships matched to your profile", href: `/internships/${profile.id}`, done: false },
                    ].map((item) => (
                      <button key={item.label} onClick={() => navigate(item.href)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? "bg-emerald-100" : "bg-slate-100"}`}>
                          <item.icon className={`h-4 w-4 ${item.done ? "text-emerald-600" : "text-slate-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800">{item.label}</div>
                          <div className="text-xs text-slate-500 truncate">{item.desc}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Right sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {[
                      { label: "Name", val: profile.fullName },
                      { label: "College", val: profile.communityCollege },
                      { label: "Major", val: profile.intendedMajor },
                      { label: "GPA", val: profile.currentGpa?.toString() },
                    ].map(({ label, val }) => (
                      <div key={label}><span className="text-slate-500">{label}:</span> <span className="font-medium">{val ?? "—"}</span></div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${profile.id}`)}
                      className="w-full mt-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                      Edit Profile
                    </Button>
                  </CardContent>
                </Card>

                {summary?.nextActions && summary.nextActions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />Next Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summary.nextActions.map((action, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-700">
                            <span className="text-indigo-500 font-bold flex-shrink-0">{i + 1}.</span>{action}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">All AI recommendations are estimates. Verify with your CC counselor and official sources.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
