import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User, BookOpen, GraduationCap, Target, Award, Map,
  ArrowRight, ChevronRight, AlertTriangle, Plus, TrendingUp
} from "lucide-react";

interface Profile {
  id: number;
  fullName?: string;
  communityCollege?: string;
  intendedMajor?: string;
  careerGoal?: string;
  currentGpa?: number;
  completionPercent?: number;
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
      <main className="pt-14 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="py-8 border-b border-slate-200">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Your AI-powered transfer planning dashboard
          </p>
        </div>

        {!profile ? (
          /* No profile yet */
          <div className="py-16 text-center">
            <Map className="h-16 w-16 text-indigo-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Let's get started</h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm">
              Create your student profile to unlock personalized university matches, AI pathways, and scholarship recommendations.
            </p>
            <Button
              onClick={() => navigate("/profile")}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your Profile
            </Button>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  icon: User,
                  label: "Profile Complete",
                  value: `${summary?.profileCompletionPercent ?? 0}%`,
                  color: "text-indigo-600",
                  href: `/profile/${profile.id}`,
                },
                {
                  icon: BookOpen,
                  label: "Courses Logged",
                  value: summary?.totalCourses ?? 0,
                  color: "text-emerald-600",
                  href: `/courses/${profile.id}`,
                },
                {
                  icon: GraduationCap,
                  label: "Estimated GPA",
                  value: summary?.estimatedGpa ? summary.estimatedGpa.toFixed(2) : "—",
                  color: "text-amber-600",
                  href: `/courses/${profile.id}`,
                },
                {
                  icon: Target,
                  label: "AI Pathways",
                  value: summary?.savedPathwaysCount ?? 0,
                  color: "text-rose-600",
                  href: `/pathways/${profile.id}`,
                },
              ].map((stat) => (
                <button
                  key={stat.label}
                  onClick={() => navigate(stat.href)}
                  className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <stat.icon className={`h-5 w-5 mb-2 ${stat.color}`} />
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
                </button>
              ))}
            </div>

            {/* Main content */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Quick actions */}
              <div className="md:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Your Transfer Journey</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      {
                        icon: User,
                        label: "My Profile",
                        desc: profile.intendedMajor ?? "Complete your student profile",
                        href: `/profile/${profile.id}`,
                        done: (summary?.profileCompletionPercent ?? 0) > 50,
                      },
                      {
                        icon: BookOpen,
                        label: "My Courses",
                        desc: summary?.totalCourses ? `${summary.completedCourses} completed, ${summary.inProgressCourses} in progress` : "Add your courses",
                        href: `/courses/${profile.id}`,
                        done: (summary?.totalCourses ?? 0) > 0,
                      },
                      {
                        icon: GraduationCap,
                        label: "University Matches",
                        desc: summary?.topMatchUniversity ? `Top match: ${summary.topMatchUniversity} (${summary.topMatchScore}%)` : "See your university rankings",
                        href: `/matches/${profile.id}`,
                        done: false,
                      },
                      {
                        icon: Target,
                        label: "AI Pathways",
                        desc: summary?.savedPathwaysCount ? `${summary.savedPathwaysCount} pathways generated` : "Generate your AI pathway reports",
                        href: `/pathways/${profile.id}`,
                        done: (summary?.savedPathwaysCount ?? 0) > 0,
                      },
                      {
                        icon: Award,
                        label: "Scholarships & Opportunities",
                        desc: "40+ scholarships and internship programs",
                        href: `/scholarships/${profile.id}`,
                        done: false,
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => navigate(item.href)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left"
                      >
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

              {/* Next actions + profile info */}
              <div className="space-y-4">
                {/* Profile card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Your Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-500">Name:</span>{" "}
                      <span className="font-medium">{profile.fullName ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">College:</span>{" "}
                      <span className="font-medium">{profile.communityCollege ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Major:</span>{" "}
                      <span className="font-medium">{profile.intendedMajor ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">GPA:</span>{" "}
                      <span className="font-medium">{profile.currentGpa ?? "—"}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/profile/${profile.id}`)}
                      className="w-full mt-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      Edit Profile
                    </Button>
                  </CardContent>
                </Card>

                {/* Next actions */}
                {summary?.nextActions && summary.nextActions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Next Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summary.nextActions.map((action, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-700">
                            <span className="text-indigo-500 font-bold flex-shrink-0">{i + 1}.</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    All recommendations are AI-generated estimates. Verify requirements with your CC counselor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
