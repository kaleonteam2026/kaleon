import { Loader2 } from "lucide-react";
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
        <Loader2
          className={cn(
            "h-8 w-8 animate-spin",
            isDark ? "text-[#4ECCA3]" : "text-slate-900",
          )}
        />
        {message && (
          <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
