import { type ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { PageLoadingState } from "@/components/page-loading-state";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const bypass = import.meta.env.VITE_AUTH_BYPASS === "true";
  const { isAuthenticated, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (bypass || isLoading || isAuthenticated) return;
    const returnTo = encodeURIComponent(location || "/dashboard");
    navigate(`/auth?returnTo=${returnTo}`, { replace: true });
  }, [bypass, isLoading, isAuthenticated, location, navigate]);

  if (bypass) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <PageLoadingState variant="dark" message="Loading…" />;
  }

  if (!isAuthenticated) {
    return <PageLoadingState variant="dark" message="Redirecting…" />;
  }

  return <>{children}</>;
}
