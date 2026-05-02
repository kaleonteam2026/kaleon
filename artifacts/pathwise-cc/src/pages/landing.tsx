import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  Map, GraduationCap, Target, BookOpen, Award, ArrowRight,
  TrendingUp, Search, Building2, Users,
} from "lucide-react";

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Map className="h-6 w-6 text-indigo-300" />
          <span>Pathwise CC</span>
        </div>
        <Button
          onClick={login}
          variant="outline"
          className="border-indigo-400 text-indigo-100 hover:bg-indigo-800 bg-transparent"
        >
          Sign in
        </Button>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-16 pb-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-indigo-800/60 border border-indigo-600 rounded-full px-4 py-1.5 text-sm text-indigo-200 mb-6">
          <GraduationCap className="h-4 w-4" />
          Built for California Community College Students
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Your All-in-One
          <span className="text-indigo-300 block">CC Success Platform</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Pathwise CC helps you thrive at your community college — track progress, find internships,
          plan your transfer, and discover scholarships. Everything in one place, powered by AI.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={login}
            size="lg"
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-base px-8 py-3 h-auto"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Free to use. Powered by Replit Auth. No credit card required.
        </p>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-16 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-white">
            Everything a CC student needs to succeed
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: "My CC Programs",
                description: "Discover EOPS, Phi Theta Kappa, Umoja, Puente, MESA, TRIO, Transfer Center, and 20+ other programs specific to your own community college.",
                color: "text-indigo-400",
              },
              {
                icon: Target,
                title: "AI Transfer Pathways",
                description: "Claude AI generates 3 detailed pathway reports — least, moderate, and most compatible — with GPA targets, next steps, and deadlines.",
                color: "text-emerald-400",
              },
              {
                icon: Search,
                title: "Internship Finder",
                description: "AI-matched internships from DOE, NASA, NIH, CA state agencies, and nonprofits — all verified to accept current community college students.",
                color: "text-amber-400",
              },
              {
                icon: Award,
                title: "40+ Scholarships",
                description: "Curated scholarships for California CC students: Cal Grants, Jack Kent Cooke, Dream.US, EOPS scholarships, and community foundation awards.",
                color: "text-rose-400",
              },
              {
                icon: TrendingUp,
                title: "Progress Tracker",
                description: "Log GPA milestones, certifications, leadership roles, and setbacks. Get instant AI feedback on your transfer readiness at every step.",
                color: "text-sky-400",
              },
              {
                icon: GraduationCap,
                title: "Transfer Likelihood",
                description: "AI scores your compatibility with 25+ UC/CSU/private California universities and generates personalized acceptance likelihood reports.",
                color: "text-violet-400",
              },
              {
                icon: BookOpen,
                title: "Course Tracking",
                description: "Log completed and in-progress courses. Track your GPA, identify articulation gaps, and see what's left for transfer readiness.",
                color: "text-teal-400",
              },
              {
                icon: Map,
                title: "Academic Roadmap",
                description: "AI-generated semester-by-semester plan with ASSIST.org articulation guidance, transfer deadlines, and impacted major advice.",
                color: "text-orange-400",
              },
              {
                icon: Users,
                title: "Student Guidebook",
                description: "A complete AI-written transfer guidebook with application timelines, essay tips, financial aid strategy, and a scholarship checklist.",
                color: "text-pink-400",
              },
            ].map((feature) => (
              <div key={feature.title} className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
                <feature.icon className={`h-8 w-8 mb-3 ${feature.color}`} />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="space-y-6">
            {[
              { step: "1", title: "Create your student profile", desc: "Enter your GPA, major, career goal, financial situation, and your specific community college." },
              { step: "2", title: "Discover your CC campus programs", desc: "AI surfaces EOPS, honors programs, equity cohorts, tutoring centers, and major-specific clubs at your own college." },
              { step: "3", title: "Find internships matched to you", desc: "Get a personalized list of federal, state, and nonprofit internships verified for CC student eligibility." },
              { step: "4", title: "Generate AI transfer pathways", desc: "Claude AI creates 3 detailed pathway reports with UC/CSU compatibility scores and semester action plans." },
              { step: "5", title: "Track your progress", desc: "Log milestones, get AI feedback on each entry, and build a complete transfer readiness timeline." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="text-slate-400 text-sm mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="px-6 md:px-12 py-8 bg-slate-950/60">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4 text-sm text-amber-200">
            <strong>Important disclaimer:</strong> Pathwise CC is an AI-powered planning tool, not an official academic advisor.
            All recommendations, GPA targets, and program information are AI-generated estimates.
            Always verify requirements with your community college counselor and each institution's official resources.
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to take control of your CC journey?</h2>
        <p className="text-slate-300 mb-8">Built exclusively for California's 2.1 million community college students.</p>
        <Button
          onClick={login}
          size="lg"
          className="bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-3 h-auto text-base"
        >
          Get Started Free
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-6 border-t border-slate-800 text-center text-slate-500 text-xs">
        <p>Pathwise CC — Not affiliated with UC, CSU, or any California institution. Data shown is AI-generated. Verify all information with official sources.</p>
        <div className="flex flex-wrap justify-center gap-2 mt-2 text-slate-600">
          {["Santa Monica College", "De Anza", "Foothill", "Mt. SAC", "Pasadena City College", "LACC", "Diablo Valley"].map(c => (
            <span key={c}>{c}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
