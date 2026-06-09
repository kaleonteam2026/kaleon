import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { useEffect, useMemo } from "react";
import { GraduationCap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Footer from "@/components/footer";
import { fadeUp, staggerContainer, useMotionEnabled, DUR } from "@/lib/motion";

const FONT_STYLES = `
  .pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; }
  .pwc-font-sans { font-family: 'Inter', sans-serif; }
`;

export type PersonaSlug = "first-gen" | "ab540" | "returning";

interface PersonaContent {
  badge: string;
  headline: React.ReactNode;
  subhead: string;
  bullets: string[];
  bg: "slate" | "amber" | "off-white";
  defaultUtmCampaign: string;
}

const PERSONAS: Record<PersonaSlug, PersonaContent> = {
  "first-gen": {
    badge: "First-Gen CC Students",
    headline: (
      <>
        First in your<br />
        <span className="bg-slate-900 text-white px-3 inline-block">family?</span>{" "}
        <span className="block mt-2">Same.</span>
      </>
    ),
    subhead:
      "Kaleon is the AI transfer counselor your high school never had. Build the CC → UCLA / UC / CSU plan in minutes — courses, scholarships, and deadlines, mapped for you.",
    bullets: [
      "From CC to UCLA in 24 months — pathway mapped by AI",
      "EOPS, TRIO, Puente, MESA programs at YOUR college",
      "40+ scholarships filtered for first-gen students",
    ],
    bg: "slate",
    defaultUtmCampaign: "first-gen-launch",
  },
  ab540: {
    badge: "AB540 / Dream Act Students",
    headline: (
      <>
        AB540 transfer.<br />
        <span className="bg-slate-900 text-white px-3 inline-block">Mapped.</span>
      </>
    ),
    subhead:
      "Kaleon shows you every program, Cal Grant / Dream Act scholarship, and UC / CSU pathway — with real eligibility and real deadlines. No paywall.",
    bullets: [
      "AB540, Dream Act, CADAA, Cal Grant — sorted",
      "40+ scholarships filtered for AB540 eligibility",
      "Transfer pathway with deadlines and GPA targets",
    ],
    bg: "amber",
    defaultUtmCampaign: "ab540-launch",
  },
  returning: {
    badge: "Returning Adult Students",
    headline: (
      <>
        Going back at 30?<br />
        <span className="bg-slate-900 text-white px-3 inline-block">Go back smart.</span>
      </>
    ),
    subhead:
      "Working parent + 12 units = future you. Kaleon plans your transfer around shifts, kids, and night classes — track GPA, scholarships, and the CC → 4-year path on your schedule.",
    bullets: [
      "Semester plans built around shifts and night classes",
      "Scholarships for working parents and adult learners",
      "Track GPA, certifications, and transfer readiness",
    ],
    bg: "off-white",
    defaultUtmCampaign: "returning-launch",
  },
};

interface WelcomeProps {
  persona: PersonaSlug;
}

export default function Welcome({ persona }: WelcomeProps) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, navigate] = useLocation();
  const content = PERSONAS[persona];
  const motionOn = useMotionEnabled();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/profiles");
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Forward UTM params + persona through to the API login route so they get
  // persisted on the user record at signup.
  const loginHref = useMemo(() => {
    const incoming = new URLSearchParams(window.location.search);
    const params = new URLSearchParams();
    params.set("returnTo", "/");
    params.set("persona", persona);
    params.set(
      "utm_source",
      incoming.get("utm_source") ?? "paid-social",
    );
    params.set("utm_medium", incoming.get("utm_medium") ?? "cpc");
    params.set(
      "utm_campaign",
      incoming.get("utm_campaign") ?? content.defaultUtmCampaign,
    );
    const utmContent = incoming.get("utm_content");
    if (utmContent) params.set("utm_content", utmContent);
    return `/api/login?${params.toString()}`;
  }, [persona, content.defaultUtmCampaign]);

  const handleLogin = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (import.meta.env.VITE_AUTH_BYPASS === "true") {
      login();
      return;
    }
    window.location.href = loginHref;
  };

  const headerLogin = () => {
    if (import.meta.env.VITE_AUTH_BYPASS === "true") {
      login();
      return;
    }
    window.location.href = loginHref;
  };

  const bgClass =
    content.bg === "slate"
      ? "bg-slate-900 text-white"
      : content.bg === "amber"
        ? "bg-amber-100 text-slate-900"
        : "bg-[#f4f4f5] text-slate-900";
  const isDark = content.bg === "slate";

  return (
    <div className={`min-h-screen pwc-font-sans ${bgClass}`}>
      <style dangerouslySetInnerHTML={{ __html: FONT_STYLES }} />

      <header
        className={`sticky top-0 z-50 px-6 md:px-12 h-14 flex items-center justify-between border-b-2 ${
          isDark ? "bg-slate-900 border-white/20 text-white" : "bg-white border-slate-900"
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-lg uppercase tracking-tight">
          <div
            className={`h-7 w-7 flex items-center justify-center pwc-font-mono font-bold text-sm ${
              isDark ? "bg-white text-slate-900" : "bg-slate-900 text-white"
            }`}
          >
            D
          </div>
          <span>Kaleon</span>
          <span
            className={`hidden md:inline pwc-font-mono text-[10px] normal-case tracking-widest font-medium ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            // Kaleon
          </span>
        </div>
        <button
          onClick={headerLogin}
          data-testid="button-header-signin"
          className={`border-2 px-4 py-1.5 text-xs pwc-font-mono uppercase tracking-wider font-bold transition-colors ${
            isDark
              ? "border-white bg-white text-slate-900 hover:bg-slate-200"
              : "border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
          }`}
        >
          Sign In
        </button>
      </header>

      <section className="px-6 md:px-12 pt-16 pb-20 max-w-4xl mx-auto">
        <div
          className={`inline-flex items-center gap-2 border-2 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] px-3 py-1.5 mb-8 ${
            isDark
              ? "bg-amber-100 border-amber-300 text-slate-900"
              : "bg-white border-slate-900"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span className="text-xs pwc-font-mono uppercase tracking-wider font-bold">
            For {content.badge}
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[0.95] uppercase">
          {content.headline}
        </h1>

        <motion.p
          initial={motionOn ? { opacity: 0, y: 8 } : false}
          animate={motionOn ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: DUR.base, ease: [0.16, 1, 0.3, 1] }}
          className={`text-lg md:text-xl mb-8 max-w-2xl leading-relaxed ${
            isDark ? "text-slate-300" : "text-slate-700"
          }`}
        >
          {content.subhead}
        </motion.p>

        <motion.ul
          className="space-y-3 mb-10 max-w-2xl"
          initial={motionOn ? "hidden" : false}
          animate={motionOn ? "show" : undefined}
          variants={motionOn ? staggerContainer(0.06) : undefined}
        >
          {content.bullets.map((b) => (
            <motion.li
              key={b}
              variants={motionOn ? fadeUp(8, DUR.base) : undefined}
              className={`border-2 p-3 pwc-font-mono text-xs uppercase tracking-wider font-bold shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] ${
                isDark
                  ? "bg-slate-800 border-white/30 text-white"
                  : "bg-white border-slate-900 text-slate-900"
              }`}
            >
              // {b}
            </motion.li>
          ))}
        </motion.ul>

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <a
            href={loginHref}
            onClick={handleLogin}
            data-testid="button-cta-signup"
            className={`border-2 px-6 py-3 text-sm pwc-font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
              isDark
                ? "border-white bg-white text-slate-900 hover:bg-slate-200 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.4)]"
                : "border-slate-900 bg-slate-900 text-white hover:bg-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
            }`}
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </a>
          <p
            className={`text-xs pwc-font-mono uppercase tracking-wider self-center ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            // Free · No Credit Card
          </p>
        </div>
      </section>

      <Footer variant="public" />
    </div>
  );
}
