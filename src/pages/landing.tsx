import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import {
  DUR,
  fadeUp,
  staggerContainer,
  useMotionEnabled,
} from "@/lib/motion";
import { KALEON_LOGO_SRC, staticAsset } from "@/lib/brand";
import BetaAgreementModal from "@/components/beta-agreement-modal";

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";

const PHOTO_SLOTS = {
  hero: {
    file: "landing-hero-students.jpg",
    label: "Students planning between classes",
    note: "Supply a campus photo with two students reviewing transfer plans together.",
  },
  advising: {
    file: "landing-advising-session.jpg",
    label: "Student and advisor conversation",
    note: "Supply a candid advising or peer-support moment.",
  },
  graduation: {
    file: "landing-graduation-walk.jpg",
    label: "Student heading toward graduation",
    note: "Supply a celebratory campus or graduation-path image.",
  },
} as const;

function PhotoSlot({
  file,
  label,
  className,
}: {
  file: string;
  label: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={staticAsset(file)}
        alt={label}
        onError={() => setFailed(true)}
        className={className}
      />
    );
  }

  return (
    <div
      className={[
        "student-panel-muted relative min-h-[280px] overflow-hidden",
        className ?? "",
      ].join(" ")}
      role="img"
      aria-label={label}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(78,204,163,0.16), transparent 42%), linear-gradient(160deg, rgba(13,26,46,0.96), rgba(7,17,31,0.96))",
        }}
      />
      <div className="absolute -left-10 top-8 h-32 w-32 rounded-full border border-[rgba(78,204,163,0.18)]" />
      <div className="absolute bottom-8 right-8 h-24 w-24 rounded-full bg-[rgba(78,204,163,0.08)]" />
      <div className="absolute inset-x-8 bottom-8 h-px bg-[rgba(78,204,163,0.18)]" />
      <div className="absolute inset-x-8 top-8 h-px bg-[rgba(255,255,255,0.08)]" />
      <div className="absolute left-8 top-12 h-16 w-16 rounded-2xl border border-[rgba(255,255,255,0.08)]" />
      <div className="absolute right-12 top-16 h-12 w-24 rounded-full border border-[rgba(78,204,163,0.16)]" />
      <div className="absolute bottom-14 left-10 h-10 w-10 rounded-full bg-[rgba(255,255,255,0.06)]" />
      <div className="sr-only">
        {label}
      </div>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, navigate] = useLocation();
  const motionOn = useMotionEnabled();
  const [scrolled, setScrolled] = useState(false);
  const [betaModalOpen, setBetaModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !AUTH_BYPASS) {
      navigate("/profiles", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const title = "Kaleon | Understand your transfer path with more confidence";
    const desc =
      "Kaleon helps community college students see what counts, what is left, and what to plan next on the road to transfer.";
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

  const startOnboarding = () => setBetaModalOpen(true);
  const revealProps = motionOn
    ? { initial: "hidden" as const, whileInView: "show" as const, viewport: { once: true, margin: "-8% 0px" } }
    : {};
  const mountProps = motionOn
    ? { initial: "hidden" as const, animate: "show" as const }
    : {};

  return (
    <div
      className="dark min-h-screen pwc-font-sans"
      style={{ background: "var(--app-page-bg)", color: "var(--app-text)" }}
    >
      <header
        className="sticky top-0 z-50 border-b px-5 py-4 md:px-10"
        style={{
          background: scrolled ? "var(--app-nav-bg)" : "rgba(5, 12, 24, 0.86)",
          borderBottomColor: "var(--app-border-subtle)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={KALEON_LOGO_SRC}
              alt="Kaleon"
              className="h-10 w-10 rounded-lg border p-1"
              style={{ borderColor: "rgba(78, 204, 163, 0.2)", background: "rgba(13, 26, 46, 0.72)" }}
            />
            <div>
              <div className="text-lg font-bold tracking-tight text-white">KALEON</div>
              <div className="text-xs font-medium tracking-wide text-slate-400">Student transfer planning</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={login}
              className="kaleon-btn-outline rounded-lg px-4 py-2 text-sm font-medium"
            >
              Sign in
            </button>
            <button
              onClick={startOnboarding}
              className="kaleon-btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold"
            >
              Start your plan
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="px-5 pb-20 pt-12 md:px-10 md:pb-28 md:pt-16">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <motion.div {...mountProps} variants={staggerContainer(0.08)} className="max-w-xl">
              <motion.h1
                variants={fadeUp(12, DUR.slow)}
                className="text-4xl font-bold leading-[1.03] tracking-tight text-white md:text-6xl"
              >
                Know what counts toward transfer, what is left, and what comes next.
              </motion.h1>
              <motion.p
                variants={fadeUp(12, DUR.med)}
                className="mt-5 max-w-lg text-lg leading-8 text-slate-300"
              >
                Kaleon helps community college students move through each semester with fewer surprises.
              </motion.p>

              <motion.div variants={fadeUp(12, DUR.med)} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={startOnboarding}
                  className="kaleon-btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold"
                >
                  Start your plan
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={login}
                  className="kaleon-btn-outline inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium"
                >
                  Sign in
                </button>
              </motion.div>
            </motion.div>

            <motion.div {...mountProps} variants={fadeUp(16, DUR.slow)}>
              <PhotoSlot
                file={PHOTO_SLOTS.hero.file}
                label={PHOTO_SLOTS.hero.label}
                className="h-full w-full rounded-[20px] border object-cover"
              />
            </motion.div>
          </div>
        </section>

        <section className="px-5 py-18 md:px-10">
          <div className="mx-auto max-w-6xl">
            <motion.div {...revealProps} variants={fadeUp(12, DUR.med)} className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                More clarity before registration. More confidence before advising.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Kaleon keeps the next decision easier to understand.
              </p>
            </motion.div>

            <motion.div
              {...revealProps}
              variants={staggerContainer(0.08)}
              className="mt-10 grid gap-6 border-y border-[var(--student-border)] py-6 md:grid-cols-3"
            >
              {[
                {
                  title: "Know where you stand",
                  body: "Completed work, current courses, and planned semesters stay visible in one place.",
                },
                {
                  title: "Know what is still missing",
                  body: "Remaining requirements stay short enough to scan and specific enough to act on.",
                },
                {
                  title: "Know what to do next",
                  body: "Semester planning stays connected to real prerequisites, counselor follow-up, and transfer goals.",
                },
              ].map((item) => (
                <motion.div key={item.title} variants={fadeUp(12, DUR.med)} className="pr-4 md:pr-8">
                  <h3 className="text-2xl font-semibold tracking-tight text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--student-text-secondary)]">{item.body}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="px-5 py-18 md:px-10">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div {...revealProps} variants={fadeUp(12, DUR.med)}>
              <PhotoSlot
                file={PHOTO_SLOTS.advising.file}
                label={PHOTO_SLOTS.advising.label}
                className="h-full w-full rounded-[20px] border object-cover"
              />
            </motion.div>

            <motion.div {...revealProps} variants={fadeUp(12, DUR.med)} className="student-panel p-7 md:p-9">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                Be better prepared for advising.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--student-text-secondary)]">
                See what you've completed, what you still need, and what to ask about before your next meeting.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="px-5 pb-24 pt-18 md:px-10">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <motion.div {...revealProps} variants={fadeUp(12, DUR.med)} className="student-panel p-7 md:p-9">
              <h2 className="text-3xl font-semibold tracking-tight text-[var(--student-text-primary)] md:text-4xl">
                Stay on track now, and head toward transfer with more confidence later.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[var(--student-text-secondary)]">
                Kaleon is here to help students feel steadier about what counts, what is left, and what comes next.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={startOnboarding}
                  className="student-button-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold"
                >
                  Start your plan
                  <GraduationCap className="h-4 w-4" />
                </button>
                <button
                  onClick={login}
                  className="student-button-secondary inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium"
                >
                  Return to your account
                </button>
              </div>
            </motion.div>

            <motion.div {...revealProps} variants={fadeUp(12, DUR.med)}>
              <PhotoSlot
                file={PHOTO_SLOTS.graduation.file}
                label={PHOTO_SLOTS.graduation.label}
                className="h-full w-full rounded-[20px] border object-cover"
              />
            </motion.div>
          </div>
        </section>
      </main>

      <BetaAgreementModal open={betaModalOpen} onOpenChange={setBetaModalOpen} />
    </div>
  );
}
