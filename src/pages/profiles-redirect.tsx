import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { getPrimaryProfileForUser } from "@/lib/api/profiles";
import { PageLoadingState } from "@/components/page-loading-state";

/**
 * Redirects an authenticated user to their primary profile's courses page,
 * or to onboarding if they have no profile yet.
 *
 * This is the target for navigation calls to "/profiles" from landing,
 * welcome, and admin pages.
 */
export default function ProfilesRedirect() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    (async () => {
      try {
        const profile = await getPrimaryProfileForUser(user.id);
        if (cancelled) return;

        if (profile?.id) {
          navigate(`/courses/${profile.id}`, { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      } catch {
        if (!cancelled) {
          navigate("/onboarding", { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  return <PageLoadingState variant="dark" message="Loading…" />;
}
