import { t } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { KALEON_LOGO_SRC } from "@/lib/brand";

export type FooterVariant = "public" | "compact";

function FooterLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "transition-colors hover:text-[#4ECCA3] focus:outline-none focus:ring-2 focus:ring-[#4ECCA3] focus:ring-offset-2 focus:ring-offset-[#050c18] rounded-sm",
        className,
      )}
      target={href.startsWith("mailto:") ? undefined : "_self"}
      rel={href.startsWith("mailto:") ? undefined : undefined}
    >
      {children}
    </a>
  );
}

const LINK_CLASS = "pwc-font-mono uppercase tracking-wider text-xs";

const links = [
  { key: "privacyPolicy", href: "/privacy" },
  { key: "termsOfService", href: "/terms" },
  { key: "contactSupport", href: "mailto:support@kaleon.org" },
  { key: "reportBug", href: "mailto:support@kaleon.org?subject=Bug%20Report" },
  { key: "requestDataDeletion", href: "mailto:support@kaleon.org?subject=Data%20Deletion%20Request" },
];

export default function Footer({ variant = "compact" }: { variant?: FooterVariant }) {
  const isPublic = variant === "public";

  if (isPublic) {
    return (
      <footer
        className="px-6 md:px-12 py-10 md:py-14 text-center md:text-left"
        style={{
          background: "var(--app-nav-bg, #050c18)",
          borderTop: "1px solid rgba(78,204,163,0.15)",
          color: "#94a3b8",
        }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Brand */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <img
                  src={KALEON_LOGO_SRC}
                  alt="Kaleon"
                  className="shrink-0 object-contain rounded-md"
                  width={28}
                  height={28}
                  style={{ width: 28, height: 28, maxWidth: 28, maxHeight: 28, borderRadius: 6 }}
                />
                <span className="font-bold text-lg tracking-tight uppercase" style={{ color: "#f8fafc" }}>
                  KALEON
                </span>
              </div>
              <p className="text-sm max-w-sm mx-auto md:mx-0" style={{ color: "var(--app-text-muted)" }}>
                {t("footer.tagline")}
              </p>
            </div>

            {/* Support email */}
            <div className="text-center md:text-right" style={{ color: "#4ECCA3" }}>
              <FooterLink 
                href="mailto:support@kaleon.org"
                className={cn(LINK_CLASS, "text-sm")}
                
              >
                {t("footer.supportEmail")}
              </FooterLink>
            </div>
          </div>

          {/* Legal links row */}
          <div
            className="flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-2 py-4 mb-4"
            style={{ borderTop: "1px solid rgba(78,204,163,0.1)", borderBottom: "1px solid rgba(78,204,163,0.1)" }}
          >
            {links.slice(0, 4).map((link) => (
              <FooterLink key={link.key} href={link.href} className={LINK_CLASS}>
                {t(`footer.${link.key}`)}
              </FooterLink>
            ))}
          </div>

          {/* Bottom row */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 text-xs" style={{ color: "var(--app-text-muted)" }}>
            <p>{t("footer.copyright")}</p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              <span>{t("footer.betaVersion")}</span>
              <span>{t("footer.builtWithFeedback")}</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  /* ── Compact variant (dashboard) ── */
  return (
    <footer
      className="px-4 md:px-6 py-4"
      style={{
        background: "var(--app-nav-bg, #050c18)",
        borderTop: "1px solid rgba(78,204,163,0.15)",
        color: "var(--app-text-muted)",
      }}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {links.map((link) => (
          <FooterLink key={link.key} href={link.href} className={LINK_CLASS}>
            {t(`footer.${link.key}`)}
          </FooterLink>
        ))}
      </div>
    </footer>
  );
}
