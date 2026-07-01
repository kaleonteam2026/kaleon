import { KaleonLoader } from "@/components/ui/kaleon-loader";
import Nav from "@/components/nav";
import { cn } from "@/lib/utils";
import type { AppLayoutVariant } from "@/components/app-page-layout";

interface PageLoadingStateProps {
  variant?: AppLayoutVariant;
  message?: string;
  showNav?: boolean;
  profileId?: number;
  className?: string;
}

export function PageLoadingState({
  variant = "light",
  message,
  showNav = false,
  profileId,
  className,
}: PageLoadingStateProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "min-h-screen",
        !isDark && "bg-[#f4f4f5]",
        className,
      )}
      style={isDark ? { background: "var(--app-page-bg)" } : undefined}
    >
      {showNav && <Nav profileId={profileId} />}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3",
          showNav ? "min-h-screen pt-14" : "min-h-screen",
        )}
      >
        <KaleonLoader />
        {message && (
          <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
