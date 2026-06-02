import { useLocation } from "wouter";
import { Map, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppPageLayout } from "@/components/app-page-layout";
import { displayName } from "@/lib/display-name";
import { t } from "@/lib/copy";
import type { AuthUser } from "@/contexts/auth-context";

interface DashboardEmptyProps {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

export function DashboardEmpty({ user, isAuthenticated }: DashboardEmptyProps) {
  const [, navigate] = useLocation();
  const greeting = displayName(user, undefined, t("common.student"));
  return (
    <AppPageLayout variant="dark" maxWidth="3xl">
      <div className="py-16 text-center">
        <Map className="h-16 w-16 mx-auto mb-4" style={{ color: "rgba(78,204,163,0.3)" }} />
        <p className="text-sm pwc-font-mono uppercase tracking-wider mb-2" style={{ color: "#94a3b8" }}>
          {t("dashboard.hello", { name: greeting })}
        </p>
        <h2 className="text-xl font-semibold mb-2" style={{ color: "#f1f5f9" }}>{t("dashboard.letsGetStarted")}</h2>
        <p className="mb-6 max-w-md mx-auto text-sm" style={{ color: "#64748b" }}>
          {t("dashboard.letsGetStartedBody")}
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() =>
              navigate(
                isAuthenticated
                  ? "/onboarding"
                  : "/auth?mode=signup&returnTo=/onboarding",
              )
            }
            style={{ background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", color: "#050c18", border: "none", borderRadius: 8 }}
          >
            <Plus className="h-4 w-4 mr-2" />{t("dashboard.quickSetup")}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              navigate(isAuthenticated ? "/profile" : "/auth?returnTo=/profile")
            }
            style={{ borderColor: "rgba(78,204,163,0.3)", color: "#4ECCA3", background: "transparent", borderRadius: 8 }}
          >
            {t("dashboard.manualSetup")}
          </Button>
        </div>
      </div>
    </AppPageLayout>
  );
}
