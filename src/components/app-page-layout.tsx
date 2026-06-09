import { type ReactNode } from "react";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { cn } from "@/lib/utils";

export type AppLayoutVariant = "light" | "dark";
export type AppLayoutMaxWidth = "3xl" | "4xl" | "5xl" | "6xl" | "wide";

const MAX_WIDTH_CLASS: Record<AppLayoutMaxWidth, string> = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  wide: "max-w-[1280px]",
};

export interface AppPageLayoutProps {
  variant?: AppLayoutVariant;
  profileId?: number;
  maxWidth?: AppLayoutMaxWidth;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  /** Dark dashboard-style: main holds children directly without inner padded wrapper */
  bareContent?: boolean;
  mainClassName?: string;
}

export function AppPageLayout({
  variant = "light",
  profileId,
  maxWidth = "3xl",
  children,
  title,
  subtitle,
  action,
  bareContent = false,
  mainClassName,
}: AppPageLayoutProps) {
  const isDark = variant === "dark";
  const widthClass = MAX_WIDTH_CLASS[maxWidth];

  return (
    <div
      className={cn(
        "min-h-screen pwc-font-sans",
        !isDark && "bg-[#f4f4f5] text-slate-900",
      )}
      style={
        isDark
          ? { background: "var(--app-page-bg)", color: "var(--app-text)" }
          : undefined
      }
    >
      <Nav profileId={profileId} />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "pt-14 pb-20 md:pb-8 focus:outline-none",
          !isDark && "px-4 md:px-8",
          !isDark && "mx-auto",
          !isDark && widthClass,
          isDark && bareContent && widthClass,
          isDark && bareContent && "mx-auto px-4 md:px-6",
          mainClassName,
        )}
      >
        {isDark && !bareContent ? (
          <div className={cn("mx-auto p-4 md:p-6", widthClass)}>
            {(title || subtitle || action) && (
              <header
                className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 pb-4 mb-6"
                style={{ borderBottom: "1px solid rgba(78,204,163,0.2)" }}
              >
                <div>
                  {title && (
                    <h1
                      className="text-2xl md:text-3xl font-bold tracking-tight uppercase"
                      style={{ color: "#f8fafc" }}
                    >
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-sm md:text-base mt-1" style={{ color: "#64748b" }}>
                      {subtitle}
                    </p>
                  )}
                </div>
                {action && <div className="flex-shrink-0">{action}</div>}
              </header>
            )}
            {children}
          </div>
        ) : (
          children
        )}
      </main>
      <Footer variant="compact" />
    </div>
  );
}
