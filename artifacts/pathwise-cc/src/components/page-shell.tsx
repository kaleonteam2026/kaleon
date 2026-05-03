import { ReactNode } from "react";
import Nav from "@/components/nav";
import { cn } from "@/lib/utils";

const FONT_STYLES = `
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
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900 pwc-font-sans">
      <style dangerouslySetInnerHTML={{ __html: FONT_STYLES }} />
      <Nav profileId={profileId} />
      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none">
        <div className={cn("mx-auto p-4 md:p-6", widthClass)}>
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase">{title}</h1>
              {subtitle && (
                <p className="text-sm md:text-base text-slate-600 mt-1">{subtitle}</p>
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
  const variantClass =
    variant === "dark" ? "bg-slate-900 text-white border-slate-900" :
    variant === "accent" ? "bg-blue-50 border-blue-900" :
    variant === "danger" ? "bg-red-50 border-red-900" :
    "bg-white border-slate-900";
  const paddingClass =
    padding === "none" ? "" :
    padding === "sm" ? "p-3" : "p-4 md:p-5";

  return (
    <div className={cn(
      "border-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]",
      variantClass, paddingClass, className,
    )}>
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
    <div className={cn("flex items-center justify-between mb-4 border-b-2 border-slate-100 pb-3", className)}>
      <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
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
  const variantClass =
    variant === "primary" ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-700" :
    variant === "outline" ? "bg-white text-slate-900 border-slate-900 hover:bg-slate-900 hover:text-white" :
    "bg-transparent text-slate-700 border-transparent hover:bg-slate-100";
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={cn(
        "border-2 font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2",
        variantClass, sizeClass, className,
      )}
    >
      {children}
    </button>
  );
}

export function LoadingShell() {
  return (
    <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
    </div>
  );
}
