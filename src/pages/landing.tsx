import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import {
  GraduationCap, Target, BookOpen, Award, ArrowRight,
  TrendingUp, Search, Building2, Users, Compass,
} from "lucide-react";
import {
  useMotionEnabled,
  fadeUp,
  fadeIn,
  stamp,
  staggerContainer,
  arrowShimmer,
  ctaShadowPulse,
  EASE_OUT,
  DUR,
} from "@/lib/motion";
import { KALEON_LOGO_SRC } from "@/lib/brand";
import { CopyTrans } from "@/components/copy-trans";
import { t } from "@/lib/copy";

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, navigate] = useLocation();
  const motionOn = useMotionEnabled();
  const [scrolled, setScrolled] = useState(false);
  const [ctaHover, setCtaHover] = useState(false);
  const dirSign = 1;

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => {
    const next = v > 24;
    if (next !== scrolled) setScrolled(next);
  });

  const startOnboarding = () => {
    if (AUTH_BYPASS || isAuthenticated) {
      navigate("/onboarding");
      return;
    }
    navigate("/auth?mode=signup&returnTo=/onboarding");
  };

  // With auth bypass, stay on landing so local UI changes are visible at /.
  useEffect(() => {
    if (!isLoading && isAuthenticated && !AUTH_BYPASS) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

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

    ensure(`meta[property="og:locale"]`, { property: "og:locale" }).content = "en_US";
  }, []);

  const revealProps = motionOn
    ? { initial: "hidden" as const, whileInView: "show" as const, viewport: { once: true, margin: "-10% 0px" } }
    : {};
  const mountProps = motionOn
    ? { initial: "hidden" as const, animate: "show" as const }
    : {};

  return (
    <div
      className="min-h-screen pwc-font-sans"
      style={{ background: "linear-gradient(160deg, #050c18 0%, #0a1628 50%, #061020 100%)", color: "#e2e8f0" }}
    >

      {/* Ambient glow blobs */}
      <div style={{ position: "fixed", top: "-10%", right: "5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(78,204,163,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "5%", left: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,178,172,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <header
        className={`sticky top-0 z-50 px-6 md:px-12 flex items-center justify-between transition-all duration-200 ease-out ${
          scrolled && motionOn ? "h-12" : "h-14"
        }`}
        style={{
          background: "rgba(5,12,24,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(78,204,163,0.12)",
        }}
      >
        <div className="flex items-center gap-2 font-bold text-lg uppercase tracking-tight">
          <img
            src={KALEON_LOGO_SRC}
            alt="Logo"
            style={{ width: 30, height: 30, borderRadius: 6, objectFit: "contain" }}
          />
          <span style={{ color: "#f8fafc" }}>{t("brand.name")}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={login}
            className="kaleon-btn-primary px-4 py-1.5 text-xs pwc-font-mono uppercase tracking-wider font-bold"
            style={{ borderRadius: 6 }}
          >
            {t("common.signIn")}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-16 pb-20 max-w-6xl mx-auto relative" style={{ zIndex: 1 }}>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-12">
          <div className="flex-1 max-w-xl">
            <motion.div
              {...mountProps}
              variants={fadeUp(-6, DUR.med)}
              className="kaleon-badge inline-flex items-center gap-2 px-3 py-1.5 mb-8 pwc-font-mono text-xs uppercase tracking-wider font-bold"
              style={{ borderRadius: 20 }}
            >
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              <span>{t("landing.badge")}</span>
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.05] uppercase" style={{ color: "#f8fafc" }}>
              Transfers Made<br />
              <motion.span
                {...mountProps}
                variants={stamp}
                className="inline-block px-3 origin-left"
                style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18", textShadow: "0 0 30px rgba(78,204,163,0.4)" }}
              >
                Easy.
              </motion.span>
            </h1>

            <motion.p
              initial={motionOn ? { y: 4 } : false}
              animate={motionOn ? { y: 0 } : undefined}
              transition={motionOn ? { duration: DUR.slow, ease: EASE_OUT, delay: 0.08 } : undefined}
              className="text-lg md:text-xl mb-8 max-w-2xl leading-relaxed"
              style={{ color: "#94a3b8" }}
            >
              <CopyTrans i18nKey="landing.heroSubtitle" components={{ strong: <strong style={{ color: "#4ECCA3" }} /> }} />
            </motion.p>

            <motion.div
              initial={motionOn ? { y: 2 } : false}
              animate={motionOn ? { y: 0 } : undefined}
              transition={motionOn ? { duration: DUR.med, ease: EASE_OUT, delay: 0.12 } : undefined}
              className="flex flex-col sm:flex-row gap-4 items-start"
            >
              <button
                onClick={startOnboarding}
                onMouseEnter={() => setCtaHover(true)}
                onMouseLeave={() => setCtaHover(false)}
                className="kaleon-btn-primary px-6 py-3 text-sm pwc-font-mono uppercase tracking-wider font-bold flex items-center gap-2"
                style={{ borderRadius: 8 }}
              >
                {t("landing.heroCta")}
                <motion.span
                  animate={motionOn && !ctaHover ? { x: [0, 3 * dirSign, 0] } : false}
                  transition={motionOn && !ctaHover ? arrowShimmer : undefined}
                  className="inline-flex"
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              </button>
              <p className="text-xs pwc-font-mono uppercase tracking-wider self-center" style={{ color: "#4ECCA3", opacity: 0.6 }}>
                {t("landing.heroNote")}
              </p>
            </motion.div>

            {/* Stats */}
            <div className="flex gap-8 mt-10">
              {[["10k+", t("landing.statStudents", { defaultValue: "Students" })], ["95%", t("landing.statSuccess", { defaultValue: "Match Rate" })], ["200+", t("landing.statColleges", { defaultValue: "Colleges" })]].map(([n, l]) => (
                <div key={l}>
                  <div className="text-xl font-extrabold" style={{ color: "#4ECCA3" }}>{n}</div>
                  <div className="text-xs pwc-font-mono uppercase tracking-wider mt-1" style={{ color: "#475569" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Orbital graphic */}
          <div className="hidden md:flex flex-1 items-center justify-center" style={{ minHeight: 320 }}>
            <div style={{ position: "relative", width: 320, height: 320 }}>
              {/* Orbit rings (static circles) */}
              {[140, 220, 300].map((size, i) => (
                <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: size, height: size, marginTop: -size / 2, marginLeft: -size / 2, borderRadius: "50%", border: `1px solid rgba(78,204,163,${0.1 - i * 0.025})` }} />
              ))}
              {/* Center core */}
              <div style={{ position: "absolute", top: "50%", left: "50%", width: 80, height: 80, marginTop: -40, marginLeft: -40, borderRadius: "50%", boxShadow: "0 0 40px rgba(78,204,163,0.5)", overflow: "hidden" }}>
                <img src={KALEON_LOGO_SRC} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              {/* Orbiting dots */}
              <div className="orbit-ring-1" style={{ position: "absolute", top: "50%", left: "50%", marginTop: -5, marginLeft: -5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ECCA3", boxShadow: "0 0 12px #4ECCA3" }} />
              </div>
              <div className="orbit-ring-2" style={{ position: "absolute", top: "50%", left: "50%", marginTop: -6, marginLeft: -6 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#38b2ac", boxShadow: "0 0 12px #38b2ac" }} />
              </div>
              <div className="orbit-ring-3" style={{ position: "absolute", top: "50%", left: "50%", marginTop: -4, marginLeft: -4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ECCA3", opacity: 0.7, boxShadow: "0 0 8px #4ECCA3" }} />
              </div>
              {/* Floating particles */}
              {[[-90, -60, "1s"], [100, -50, "2.5s"], [-80, 90, "0.5s"], [95, 85, "3.5s"]].map(([x, y, delay], i) => (
                <div key={i} className="float-particle" style={{ position: "absolute", top: "50%", left: "50%", width: 5, height: 5, borderRadius: "50%", background: "#4ECCA3", marginLeft: Number(x), marginTop: Number(y), animationDelay: String(delay) }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-16 relative" style={{ zIndex: 1, borderTop: "1px solid rgba(78,204,163,0.1)", borderBottom: "1px solid rgba(78,204,163,0.1)" }}>
        <div className="max-w-6xl mx-auto">
          <motion.div {...revealProps} variants={fadeUp(8, DUR.med)} className="mb-12">
            <p className="text-xs pwc-font-mono uppercase tracking-widest font-bold mb-2" style={{ color: "#4ECCA3", opacity: 0.7 }}>
              {t("landing.modulesEyebrow")}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold uppercase" style={{ color: "#f8fafc" }}>
              {t("landing.modulesTitle")}
            </h2>
          </motion.div>
          <motion.div
            {...revealProps}
            variants={staggerContainer(0.06)}
            className="grid md:grid-cols-3 gap-5"
          >
            {[
              { icon: Building2, title: t("landing.featureCcProgramsTitle"), description: t("landing.featureCcProgramsDesc") },
              { icon: Target, title: t("landing.featurePathwaysTitle"), description: t("landing.featurePathwaysDesc") },
              { icon: Search, title: t("landing.featureInternshipsTitle"), description: t("landing.featureInternshipsDesc") },
              { icon: Award, title: t("landing.featureScholarshipsTitle"), description: t("landing.featureScholarshipsDesc") },
              { icon: TrendingUp, title: t("landing.featureProgressTitle"), description: t("landing.featureProgressDesc") },
              { icon: GraduationCap, title: t("landing.featureLikelihoodTitle"), description: t("landing.featureLikelihoodDesc") },
              { icon: BookOpen, title: t("landing.featureCoursesTitle"), description: t("landing.featureCoursesDesc") },
              { icon: Compass, title: t("landing.featureRoadmapTitle"), description: t("landing.featureRoadmapDesc") },
              { icon: Users, title: t("landing.featureGuidebookTitle"), description: t("landing.featureGuidebookDesc") },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp(12, DUR.med)}
                initial="rest"
                whileHover={
                  motionOn
                    ? { x: -1 * dirSign, y: -2 }
                    : undefined
                }
                animate="rest"
                transition={{ duration: 0.12, ease: EASE_OUT }}
                className="kaleon-card p-5 group"
                style={{ borderRadius: 12 }}
              >
                <motion.div
                  variants={motionOn ? { rest: { scale: 1 }, hover: { scale: 1.06 } } : undefined}
                  transition={{ duration: 0.09, ease: EASE_OUT }}
                  className="inline-block transition-transform duration-[90ms] ease-out group-hover:scale-[1.06]"
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(78,204,163,0.1)", border: "1px solid rgba(78,204,163,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <feature.icon className="h-5 w-5" style={{ color: "#4ECCA3" }} aria-hidden="true" />
                  </div>
                </motion.div>
                <h3 className="font-bold uppercase tracking-tight text-base mb-1.5" style={{ color: "#f1f5f9" }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-16 max-w-3xl mx-auto relative" style={{ zIndex: 1 }}>
        <motion.div {...revealProps} variants={fadeUp(8, DUR.med)} className="mb-10">
          <p className="text-xs pwc-font-mono uppercase tracking-widest font-bold mb-2" style={{ color: "#4ECCA3", opacity: 0.7 }}>{t("landing.howItWorksEyebrow")}</p>
          <h2 className="text-3xl md:text-4xl font-bold uppercase" style={{ color: "#f8fafc" }}>{t("landing.howItWorksTitle")}</h2>
        </motion.div>
        <motion.div {...revealProps} variants={staggerContainer(0.07)} className="space-y-3">
          {[
            { step: "01", title: t("landing.step1Title"), desc: t("landing.step1Desc") },
            { step: "02", title: t("landing.step2Title"), desc: t("landing.step2Desc") },
            { step: "03", title: t("landing.step3Title"), desc: t("landing.step3Desc") },
            { step: "04", title: t("landing.step4Title"), desc: t("landing.step4Desc") },
            { step: "05", title: t("landing.step5Title"), desc: t("landing.step5Desc") },
          ].map((item) => (
            <motion.div
              key={item.step}
              variants={{
                hidden: { opacity: 0, x: -8 * dirSign },
                show: { opacity: 1, x: 0, transition: { duration: DUR.med, ease: EASE_OUT } },
              }}
              className="kaleon-step flex gap-4 p-4"
              style={{ borderRadius: 10 }}
            >
              <motion.div
                initial={motionOn ? { color: "#1e3a5f" } : false}
                whileInView={motionOn ? { color: "#4ECCA3" } : undefined}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.15 }}
                className="pwc-font-mono font-bold text-2xl leading-none"
              >
                {item.step}
              </motion.div>
              <div className="flex-1 pt-0.5">
                <h3 className="font-bold uppercase text-sm tracking-tight" style={{ color: "#f1f5f9" }}>{item.title}</h3>
                <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#64748b" }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Disclaimer */}
      <section className="px-6 md:px-12 py-8 max-w-3xl mx-auto relative" style={{ zIndex: 1 }}>
        <motion.div
          {...revealProps}
          variants={fadeUp(6, DUR.base)}
          className="p-4"
          style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10 }}
        >
          <p className="text-xs pwc-font-mono uppercase tracking-widest font-bold mb-1" style={{ color: "#fbbf24" }}>{t("landing.disclaimerEyebrow")}</p>
          <p className="text-sm leading-relaxed" style={{ color: "#92400e", filter: "brightness(2.5)" }}>
            {t("landing.disclaimerBody")}
          </p>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20 relative" style={{ zIndex: 1, borderTop: "1px solid rgba(78,204,163,0.12)" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(78,204,163,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="max-w-3xl mx-auto text-center relative">
          <motion.h2
            {...revealProps}
            variants={stamp}
            className="text-3xl md:text-5xl font-extrabold uppercase mb-4 tracking-tight inline-block origin-center"
            style={{ color: "#f8fafc" }}
          >
            {t("landing.ctaTitle")}
          </motion.h2>
          <motion.p
            {...revealProps}
            variants={fadeIn(DUR.med)}
            className="mb-8 text-base md:text-lg"
            style={{ color: "#94a3b8" }}
          >
            {t("landing.ctaBody")}
          </motion.p>
          <motion.button
            {...revealProps}
            variants={fadeUp(4, DUR.med)}
            onClick={startOnboarding}
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => setCtaHover(false)}
            animate={
              motionOn && !ctaHover
                ? { boxShadow: ["0 0 20px rgba(78,204,163,0.3)", "0 0 40px rgba(78,204,163,0.6)"] }
                : false
            }
            transition={motionOn && !ctaHover ? ctaShadowPulse : undefined}
            className="kaleon-btn-primary px-6 py-3 text-sm pwc-font-mono uppercase tracking-wider font-bold inline-flex items-center gap-2"
            style={{ borderRadius: 8, ...(!motionOn || ctaHover ? { boxShadow: "0 0 20px rgba(78,204,163,0.3)" } : {}) }}
          >
            {t("landing.heroCta")}
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 text-center text-xs" style={{ borderTop: "1px solid rgba(78,204,163,0.1)", color: "#475569" }}>
        <p className="pwc-font-mono uppercase tracking-wider mb-2">{t("landing.footerLine1")}</p>
        <p style={{ color: "#334155" }}>{t("landing.footerLine2")}</p>
        <motion.div
          {...revealProps}
          variants={staggerContainer(0.04)}
          className="flex flex-wrap justify-center gap-3 mt-3 pwc-font-mono uppercase"
          style={{ color: "#334155" }}
        >
          {["Santa Monica", "De Anza", "Foothill", "Mt. SAC", "Pasadena City", "LACC", "Diablo Valley"].map(c => (
            <motion.span key={c} variants={fadeUp(5, DUR.fast)} style={{ color: "#4ECCA3", opacity: 0.4 }}>
              {c}
            </motion.span>
          ))}
        </motion.div>
        <div className="mt-4">
          <a href="/transfer" className="pwc-font-mono uppercase tracking-wider underline" style={{ color: "#4ECCA3", opacity: 0.5 }}>
            {t("landing.footerGuides")}
          </a>
        </div>
      </footer>
    </div>
  );
}
