import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import LanguageSwitcher from "@/components/language-switcher";
import {
  GraduationCap, Target, BookOpen, Award, ArrowRight,
  TrendingUp, Search, Building2, Users, Map, Compass,
} from "lucide-react";

const FONT_STYLES = `
  .pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; }
  .pwc-font-sans { font-family: 'Inter', sans-serif; }
`;

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Reactive SEO: title / description / og:locale follow current language.
  useEffect(() => {
    const title = t("landing.seoTitle");
    const desc = t("landing.seoDescription");
    document.title = title;

    const ensure = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
        document.head.appendChild(el);
      }
      return el;
    };

    ensure(`meta[name="description"]`, { name: "description" }).content = desc;
    ensure(`meta[property="og:title"]`, { property: "og:title" }).content = title;
    ensure(`meta[property="og:description"]`, { property: "og:description" }).content = desc;

    const localeMap: Record<string, string> = {
      en: "en_US", es: "es_MX", zh: "zh_CN", vi: "vi_VN", tl: "tl_PH", ko: "ko_KR",
    };
    const lang = (i18n.language?.split("-")[0] ?? "en");
    ensure(`meta[property="og:locale"]`, { property: "og:locale" }).content = localeMap[lang] ?? "en_US";
  }, [t, i18n.language]);

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900 pwc-font-sans">
      <style dangerouslySetInnerHTML={{ __html: FONT_STYLES }} />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b-2 border-slate-900 px-6 md:px-12 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg uppercase tracking-tight">
          <div className="h-7 w-7 bg-slate-900 text-white flex items-center justify-center pwc-font-mono font-bold text-sm">D</div>
          <span>{t("brand.name")}</span>
          <span className="hidden md:inline pwc-font-mono text-[10px] text-slate-500 normal-case tracking-widest font-medium">{t("brand.tagline")}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={login}
            className="border-2 border-slate-900 bg-slate-900 text-white px-4 py-1.5 text-xs pwc-font-mono uppercase tracking-wider font-bold hover:bg-slate-700 transition-colors"
          >
            {t("common.signIn")}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-16 pb-20 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] px-3 py-1.5 mb-8">
          <GraduationCap className="h-4 w-4" />
          <span className="text-xs pwc-font-mono uppercase tracking-wider font-bold">{t("landing.badge")}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[0.95] uppercase">
          {t("landing.heroTitle1")}<br />
          <span className="bg-slate-900 text-white px-3 inline-block">{t("landing.heroTitle2")}</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-700 mb-8 max-w-2xl leading-relaxed">
          <Trans i18nKey="landing.heroSubtitle" components={{ strong: <strong /> }} />
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <button
            onClick={login}
            className="border-2 border-slate-900 bg-slate-900 text-white px-6 py-3 text-sm pwc-font-mono uppercase tracking-wider font-bold hover:bg-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-2"
          >
            {t("landing.heroCta")}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-xs pwc-font-mono uppercase tracking-wider text-slate-500 self-center">
            {t("landing.heroNote")}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-16 bg-white border-y-2 border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <p className="text-xs pwc-font-mono uppercase tracking-widest text-slate-500 font-bold mb-2">{t("landing.modulesEyebrow")}</p>
            <h2 className="text-3xl md:text-4xl font-bold uppercase">
              {t("landing.modulesTitle")}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Building2, title: "CC Programs", description: "EOPS, Phi Theta Kappa, Umoja, Puente, MESA, TRIO, Transfer Center, and 20+ programs at YOUR community college." },
              { icon: Target, title: "AI Pathways", description: "Claude AI generates 3 personalized transfer reports — stretch, match, safety — with GPA targets and deadlines." },
              { icon: Search, title: "Internship Finder", description: "AI-matched internships from DOE, NASA, NIH, CA state agencies, and nonprofits — verified for CC students." },
              { icon: Award, title: "40+ Scholarships", description: "Cal Grants, Jack Kent Cooke, Dream.US, EOPS scholarships, community foundation awards. Live deadline checks." },
              { icon: TrendingUp, title: "Progress Tracker", description: "Log GPA milestones, certifications, leadership roles. Get instant AI feedback on transfer readiness." },
              { icon: GraduationCap, title: "Transfer Likelihood", description: "AI scores your fit with 25+ UC/CSU/private California universities. Personalized acceptance reports." },
              { icon: BookOpen, title: "Course Tracking", description: "Log completed and in-progress courses. Track GPA, identify articulation gaps, see what's left for transfer." },
              { icon: Compass, title: "Academic Roadmap", description: "AI semester-by-semester plan with ASSIST.org articulation, transfer deadlines, impacted-major advice." },
              { icon: Users, title: "Student Guidebook", description: "Complete AI guidebook with application timelines, essay tips, financial aid strategy, scholarship checklist." },
            ].map((feature) => (
              <div key={feature.title} className="bg-white border-2 border-slate-900 p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <feature.icon className="h-7 w-7 mb-3 text-slate-900" />
                <h3 className="font-bold uppercase tracking-tight text-base mb-1.5">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="text-xs pwc-font-mono uppercase tracking-widest text-slate-500 font-bold mb-2">// Process</p>
          <h2 className="text-3xl md:text-4xl font-bold uppercase">How It Works</h2>
        </div>
        <div className="space-y-3">
          {[
            { step: "01", title: "Create your student profile", desc: "GPA, major, career goal, financial situation, your specific community college." },
            { step: "02", title: "Discover CC campus programs", desc: "AI surfaces EOPS, honors, equity cohorts, tutoring centers, and major clubs at your own college." },
            { step: "03", title: "Find internships matched to you", desc: "Personalized list of federal, state, and nonprofit internships verified for CC student eligibility." },
            { step: "04", title: "Generate AI transfer pathways", desc: "Claude AI creates 3 reports with UC/CSU compatibility scores and semester action plans." },
            { step: "05", title: "Track your progress", desc: "Log milestones, get AI feedback, build a complete transfer readiness timeline." },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 bg-white border-2 border-slate-900 p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <div className="pwc-font-mono font-bold text-2xl text-slate-900 leading-none">{item.step}</div>
              <div className="flex-1 pt-0.5">
                <h3 className="font-bold uppercase text-sm tracking-tight">{item.title}</h3>
                <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="px-6 md:px-12 py-8 max-w-3xl mx-auto">
        <div className="bg-amber-100 border-2 border-amber-700 p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
          <p className="text-xs pwc-font-mono uppercase tracking-widest text-amber-900 font-bold mb-1">// Important Disclaimer</p>
          <p className="text-sm text-amber-900 leading-relaxed">
            DYP is an AI-powered planning tool, not an official academic advisor. All recommendations, GPA targets, and program info are AI-generated estimates. Always verify with your community college counselor and each institution's official resources.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20 bg-slate-900 text-white border-y-2 border-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold uppercase mb-4 tracking-tight">
            {t("landing.ctaTitle")}
          </h2>
          <p className="text-slate-300 mb-8 text-base md:text-lg">
            {t("landing.ctaBody")}
          </p>
          <button
            onClick={login}
            className="border-2 border-white bg-white text-slate-900 px-6 py-3 text-sm pwc-font-mono uppercase tracking-wider font-bold hover:bg-slate-100 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.4)] inline-flex items-center gap-2"
          >
            {t("landing.heroCta")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 text-center text-slate-500 text-xs">
        <p className="pwc-font-mono uppercase tracking-wider mb-2">// DYP — DO YOUR PATH</p>
        <p>Not affiliated with UC, CSU, or any California institution. Data shown is AI-generated. Verify all information with official sources.</p>
        <div className="flex flex-wrap justify-center gap-3 mt-3 text-slate-400 pwc-font-mono uppercase">
          {["Santa Monica", "De Anza", "Foothill", "Mt. SAC", "Pasadena City", "LACC", "Diablo Valley"].map(c => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <div className="mt-4">
          <a href="/transfer" className="pwc-font-mono uppercase tracking-wider text-slate-600 underline">
            // Browse CC → UC/CSU transfer guides
          </a>
        </div>
        <span className="hidden"><Map /></span>
      </footer>
    </div>
  );
}
