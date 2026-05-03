import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import LanguageSwitcher from "@/components/language-switcher";
import {
  GraduationCap, Target, BookOpen, Award, ArrowRight,
  TrendingUp, Search, Building2, Users, Map, Compass,
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

const FONT_STYLES = `
  .pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; }
  .pwc-font-sans { font-family: 'Inter', sans-serif; }
`;

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const motionOn = useMotionEnabled();
  const [scrolled, setScrolled] = useState(false);
  const [ctaHover, setCtaHover] = useState(false);
  const isRtl = i18n.dir() === "rtl";
  const dirSign = isRtl ? -1 : 1;

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => {
    const next = v > 24;
    if (next !== scrolled) setScrolled(next);
  });

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
      en: "en_US", es: "es_MX", zh: "zh_CN", vi: "vi_VN", tl: "tl_PH", ko: "ko_KR", ar: "ar_SA", ru: "ru_RU", fa: "fa_IR",
    };
    const lang = (i18n.language?.split("-")[0] ?? "en");
    ensure(`meta[property="og:locale"]`, { property: "og:locale" }).content = localeMap[lang] ?? "en_US";
  }, [t, i18n.language]);

  // Reveal helpers — when motion is off, render content immediately visible with no transforms.
  const revealProps = motionOn
    ? { initial: "hidden" as const, whileInView: "show" as const, viewport: { once: true, margin: "-10% 0px" } }
    : {};
  const mountProps = motionOn
    ? { initial: "hidden" as const, animate: "show" as const }
    : {};

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900 pwc-font-sans">
      <style dangerouslySetInnerHTML={{ __html: FONT_STYLES }} />

      {/* Header — tightens h-14 → h-12 on scroll past 24px (sticky element only;
          page content is offset by the sticky header so h change does not shift
          document flow). Border swaps to a hard shadow at the same time. */}
      <header
        className={`sticky top-0 z-50 bg-white px-6 md:px-12 flex items-center justify-between transition-[height,box-shadow,border-color] duration-200 ease-out ${
          scrolled && motionOn
            ? "h-12 border-b border-transparent shadow-[0_2px_0_0_rgba(15,23,42,1)]"
            : "h-14 border-b-2 border-slate-900"
        }`}
      >
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
        <motion.div
          {...mountProps}
          variants={fadeUp(-6, DUR.med)}
          className="inline-flex items-center gap-2 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] px-3 py-1.5 mb-8"
        >
          <GraduationCap className="h-4 w-4" />
          <span className="text-xs pwc-font-mono uppercase tracking-wider font-bold">{t("landing.badge")}</span>
        </motion.div>

        {/* H1 stays instantly visible — only the inverted PATH. block stamps in. */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[0.95] uppercase">
          {t("landing.heroTitle1")}<br />
          <motion.span
            {...mountProps}
            variants={stamp}
            className={`bg-slate-900 text-white px-3 inline-block ${isRtl ? "origin-right" : "origin-left"}`}
          >
            {t("landing.heroTitle2")}
          </motion.span>
        </h1>

        {/* Subtitle + CTA stay readable from t=0 (opacity stays 1). Only a tiny
            secondary y-translate animates in so LCP/readability is preserved. */}
        <motion.p
          initial={motionOn ? { y: 4 } : false}
          animate={motionOn ? { y: 0 } : undefined}
          transition={motionOn ? { duration: DUR.slow, ease: EASE_OUT, delay: 0.08 } : undefined}
          className="text-lg md:text-xl text-slate-700 mb-8 max-w-2xl leading-relaxed"
        >
          <Trans i18nKey="landing.heroSubtitle" components={{ strong: <strong /> }} />
        </motion.p>

        <motion.div
          initial={motionOn ? { y: 2 } : false}
          animate={motionOn ? { y: 0 } : undefined}
          transition={motionOn ? { duration: DUR.med, ease: EASE_OUT, delay: 0.12 } : undefined}
          className="flex flex-col sm:flex-row gap-4 items-start"
        >
          <button
            onClick={login}
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => setCtaHover(false)}
            className="border-2 border-slate-900 bg-slate-900 text-white px-6 py-3 text-sm pwc-font-mono uppercase tracking-wider font-bold hover:bg-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-2"
          >
            {t("landing.heroCta")}
            <motion.span
              animate={motionOn && !ctaHover ? { x: [0, 3 * dirSign, 0] } : false}
              transition={motionOn && !ctaHover ? arrowShimmer : undefined}
              className="inline-flex"
            >
              <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
            </motion.span>
          </button>
          <p className="text-xs pwc-font-mono uppercase tracking-wider text-slate-500 self-center">
            {t("landing.heroNote")}
          </p>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-16 bg-white border-y-2 border-slate-900">
        <div className="max-w-6xl mx-auto">
          <motion.div
            {...revealProps}
            variants={fadeUp(8, DUR.med)}
            className="mb-12"
          >
            <p className="text-xs pwc-font-mono uppercase tracking-widest text-slate-500 font-bold mb-2">{t("landing.modulesEyebrow")}</p>
            <h2 className="text-3xl md:text-4xl font-bold uppercase">
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
                whileHover={motionOn ? { x: -1 * dirSign, y: -1, boxShadow: "6px 6px 0px 0px rgba(15,23,42,1)" } : undefined}
                transition={{ duration: 0.12, ease: EASE_OUT }}
                className="bg-white border-2 border-slate-900 p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] group"
              >
                <motion.div
                  whileHover={motionOn ? { scale: 1.06 } : undefined}
                  transition={{ duration: 0.09, ease: EASE_OUT }}
                  className="inline-block"
                >
                  <feature.icon className="h-7 w-7 mb-3 text-slate-900" />
                </motion.div>
                <h3 className="font-bold uppercase tracking-tight text-base mb-1.5">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <motion.div
          {...revealProps}
          variants={fadeUp(8, DUR.med)}
          className="mb-10"
        >
          <p className="text-xs pwc-font-mono uppercase tracking-widest text-slate-500 font-bold mb-2">{t("landing.howItWorksEyebrow")}</p>
          <h2 className="text-3xl md:text-4xl font-bold uppercase">{t("landing.howItWorksTitle")}</h2>
        </motion.div>
        <motion.div
          {...revealProps}
          variants={staggerContainer(0.07)}
          className="space-y-3"
        >
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
              className="flex gap-4 bg-white border-2 border-slate-900 p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
            >
              <motion.div
                initial={motionOn ? { color: "#cbd5e1" } : false}
                whileInView={motionOn ? { color: "#0f172a" } : undefined}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.15 }}
                className="pwc-font-mono font-bold text-2xl leading-none"
              >
                {item.step}
              </motion.div>
              <div className="flex-1 pt-0.5">
                <h3 className="font-bold uppercase text-sm tracking-tight">{item.title}</h3>
                <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Disclaimer */}
      <section className="px-6 md:px-12 py-8 max-w-3xl mx-auto">
        <motion.div
          {...revealProps}
          variants={fadeUp(6, DUR.base)}
          className="bg-amber-100 border-2 border-amber-700 p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
        >
          <p className="text-xs pwc-font-mono uppercase tracking-widest text-amber-900 font-bold mb-1">{t("landing.disclaimerEyebrow")}</p>
          <p className="text-sm text-amber-900 leading-relaxed">
            {t("landing.disclaimerBody")}
          </p>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20 bg-slate-900 text-white border-y-2 border-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            {...revealProps}
            variants={stamp}
            className="text-3xl md:text-5xl font-extrabold uppercase mb-4 tracking-tight inline-block origin-center"
          >
            {t("landing.ctaTitle")}
          </motion.h2>
          <motion.p
            {...revealProps}
            variants={fadeIn(DUR.med)}
            className="text-slate-300 mb-8 text-base md:text-lg"
          >
            {t("landing.ctaBody")}
          </motion.p>
          <motion.button
            {...revealProps}
            variants={fadeUp(4, DUR.med)}
            onClick={login}
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => setCtaHover(false)}
            animate={
              motionOn && !ctaHover
                ? { boxShadow: ["4px 4px 0px 0px rgba(255,255,255,0.4)", "4px 4px 0px 0px rgba(255,255,255,0.7)"] }
                : false
            }
            style={!motionOn || ctaHover ? { boxShadow: "4px 4px 0px 0px rgba(255,255,255,0.4)" } : undefined}
            transition={motionOn && !ctaHover ? ctaShadowPulse : undefined}
            className="border-2 border-white bg-white text-slate-900 px-6 py-3 text-sm pwc-font-mono uppercase tracking-wider font-bold hover:bg-slate-100 inline-flex items-center gap-2"
          >
            {t("landing.heroCta")}
            <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 text-center text-slate-500 text-xs">
        <p className="pwc-font-mono uppercase tracking-wider mb-2">{t("landing.footerLine1")}</p>
        <p>{t("landing.footerLine2")}</p>
        <motion.div
          {...revealProps}
          variants={staggerContainer(0.04)}
          className="flex flex-wrap justify-center gap-3 mt-3 text-slate-400 pwc-font-mono uppercase"
        >
          {["Santa Monica", "De Anza", "Foothill", "Mt. SAC", "Pasadena City", "LACC", "Diablo Valley"].map(c => (
            <motion.span
              key={c}
              variants={fadeUp(5, DUR.fast)}
            >
              {c}
            </motion.span>
          ))}
        </motion.div>
        <div className="mt-4">
          <a href="/transfer" className="pwc-font-mono uppercase tracking-wider text-slate-600 underline">
            {t("landing.footerGuides")}
          </a>
        </div>
        <span className="hidden"><Map /></span>
      </footer>
    </div>
  );
}
