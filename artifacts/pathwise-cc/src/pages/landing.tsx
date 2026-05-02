import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Map, GraduationCap, Target, BookOpen, Award, ArrowRight, CheckCircle } from "lucide-react";

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
          Your AI-Powered
          <span className="text-indigo-300 block">Transfer Advisor</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Pathwise CC analyzes your GPA, courses, goals, and finances to generate personalized
          transfer pathways, scholarship matches, and a step-by-step guidebook — all powered by AI.
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
            Everything you need to transfer successfully
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: GraduationCap,
                title: "25+ University Database",
                description: "UC and CSU campuses with compatibility scoring based on your major, GPA, location, and career goals.",
                color: "text-indigo-400",
              },
              {
                icon: Target,
                title: "AI Pathway Reports",
                description: "Claude AI generates 3 detailed pathway reports — least, moderate, and most compatible — with next steps.",
                color: "text-emerald-400",
              },
              {
                icon: BookOpen,
                title: "Personalized Guidebook",
                description: "A complete Markdown guidebook with semester plans, deadlines, resume tips, and scholarship checklist.",
                color: "text-amber-400",
              },
              {
                icon: Award,
                title: "40+ Scholarships",
                description: "Curated scholarships for California CC students including Cal Grants, Jack Kent Cooke, and more.",
                color: "text-rose-400",
              },
              {
                icon: BookOpen,
                title: "Course Tracking",
                description: "Log your completed and in-progress courses. Get a GPA summary and articulation guidance.",
                color: "text-sky-400",
              },
              {
                icon: Map,
                title: "Opportunity Finder",
                description: "40+ internships, research programs, honors societies, and career prep resources matched to your profile.",
                color: "text-violet-400",
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
              { step: "1", title: "Create your student profile", desc: "Enter your GPA, major, career goal, financial situation, and geographic preferences." },
              { step: "2", title: "Add your courses", desc: "Log completed and in-progress courses to track GPA and identify transfer-readiness." },
              { step: "3", title: "See your university matches", desc: "Our scoring engine ranks 25+ UC/CSU/private universities by compatibility." },
              { step: "4", title: "Generate AI pathways", desc: "Claude AI creates 3 detailed pathway reports with action plans and scholarship matches." },
              { step: "5", title: "Download your guidebook", desc: "Get a complete transfer roadmap with semester plans, deadlines, and resume tips." },
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
            All recommendations, GPA targets, and scholarship information are estimates and may not reflect current requirements.
            Always verify requirements with your community college counselor and each university's official transfer admissions page.
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to find your pathway?</h2>
        <p className="text-slate-300 mb-8">Join thousands of California CC students planning their transfer journey.</p>
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
        <p>Pathwise CC — Not affiliated with UC, CSU, or any California institution. Data shown is estimated. Verify all information with official sources.</p>
        <div className="flex justify-center gap-2 mt-2 text-slate-600">
          {["UCLA", "UC Berkeley", "UCSD", "Cal State LA", "SJSU", "CSULB", "SFSU"].map(u => (
            <span key={u}>{u}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}
