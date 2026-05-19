import { ReactNode } from "react";
import Nav from "@/components/nav";
import { cn } from "@/lib/utils";

const FONT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  .pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; }
  .pwc-font-sans { font-family: 'Inter', sans-serif; }
`;

interface PageShellProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  profileId?: number;
  children: ReactNode;
  maxWidth?: "narrow" | "default" | "wide";
}

export function PageShell({
  title, subtitle, action, profileId, children, maxWidth = "default",
}: PageShellProps) {
  const widthClass =
    maxWidth === "narrow" ? "max-w-3xl" :
    maxWidth === "wide" ? "max-w-[1280px]" : "max-w-5xl";

  return (
    <div className="min-h-screen pwc-font-sans" style={{ background: "linear-gradient(160deg, #050c18 0%, #070d1a 100%)", color: "#e2e8f0" }}>
      <style dangerouslySetInnerHTML={{ __html: FONT_STYLES }} />
      <Nav profileId={profileId} />
      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none">
        <div className={cn("mx-auto p-4 md:p-6", widthClass)}>
          {/* Header — LCP H1 stays static, no animation wrapper */}
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 pb-4 mb-6" style={{ borderBottom: "1px solid rgba(78,204,163,0.2)" }}>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase" style={{ color: "#f8fafc" }}>{title}</h1>
              {subtitle && (
                <p className="text-sm md:text-base mt-1" style={{ color: "#64748b" }}>{subtitle}</p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}

interface BrutalistCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "dark" | "accent" | "danger";
  padding?: "none" | "sm" | "default";
}

export function BrutalistCard({
  children, className, variant = "default", padding = "default",
}: BrutalistCardProps) {
  const variantStyle =
    variant === "dark"
      ? { background: "rgba(5,12,24,0.9)", border: "1px solid rgba(78,204,163,0.25)", color: "#f8fafc" }
      : variant === "accent"
      ? { background: "rgba(78,204,163,0.06)", border: "1px solid rgba(78,204,163,0.3)", color: "#e2e8f0" }
      : variant === "danger"
      ? { background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", color: "#e2e8f0" }
      : { background: "rgba(13,26,46,0.8)", border: "1px solid rgba(78,204,163,0.15)", color: "#e2e8f0" };

  const paddingClass =
    padding === "none" ? "" :
    padding === "sm" ? "p-3" : "p-4 md:p-5";

  return (
    <div
      className={cn(paddingClass, className)}
      style={{ borderRadius: 12, ...variantStyle }}
    >
      {children}
    </div>
  );
}

interface SectionHeadingProps {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({ icon, children, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4 pb-3", className)} style={{ borderBottom: "1px solid rgba(78,204,163,0.1)" }}>
      <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2" style={{ color: "#4ECCA3" }}>
        {icon}{children}
      </h2>
      {action}
    </div>
  );
}

export function BrutalistButton({
  children, onClick, disabled, variant = "primary", size = "default", className, type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "default";
  className?: string;
  type?: "button" | "submit";
}) {
  const variantStyle =
    variant === "primary"
      ? { background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18", border: "none" }
      : variant === "outline"
      ? { background: "transparent", color: "#4ECCA3", border: "1px solid rgba(78,204,163,0.4)" }
      : { background: "transparent", color: "#94a3b8", border: "1px solid transparent" };

  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={cn(
        "font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2",
        sizeClass, className,
      )}
      style={{ borderRadius: 8, ...variantStyle }}
    >
      {children}
    </button>
  );
}

export function LoadingShell() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#070d1a" }}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "rgba(78,204,163,0.3)", borderTopColor: "transparent" }} />
    </div>
  );
}
