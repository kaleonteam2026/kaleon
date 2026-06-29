import { t } from "@/lib/copy";
import { KALEON_LOGO_SRC } from "@/lib/brand";
import { ONBOARDING_PAGE_BG, ONBOARDING_CARD } from "./onboarding-constants";

export function IntroPhase({ firstName }: { firstName?: string | null }) {
  return (
    <main
      className="min-h-screen pwc-font-sans flex items-center justify-center px-4 py-12"
      style={ONBOARDING_PAGE_BG}
      aria-live="polite"
    >
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-8">
          <img src={KALEON_LOGO_SRC} alt="" width={28} height={28} className="shrink-0 object-contain" aria-hidden />
          <span className="text-xl font-bold uppercase tracking-tight" style={{ color: "#f8fafc" }}>
            Kaleon
          </span>
        </div>
        <section className="overflow-hidden shadow-xl" style={ONBOARDING_CARD}>
          <div
            className="px-8 py-10"
            style={{
              borderBottom: "1px solid var(--app-border-subtle)",
              background: "rgba(78, 204, 163, 0.06)",
            }}
          >
            <div className="onboarding-intro-message">
              <h1
                className="m-0 font-bold text-center leading-snug tracking-tight"
                style={{
                  fontSize: "clamp(1.25rem, 2.3vw, 1.75rem)",
                  color: "#f8fafc",
                }}
              >
                {t("onboarding.introHeading", { firstName: firstName ?? t("common.student") })}
              </h1>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
