import type { AuthUser } from "@/contexts/auth-context";

/**
 * Resolve the name to show for the current user.
 *
 * The profile name is the app's source of truth for what a user calls
 * themselves (it's the name saved during onboarding), so it takes precedence
 * over the auth metadata. The auth user's first name and email local-part
 * are fallbacks for contexts where no profile exists yet, such as the
 * onboarding intro. There is intentionally no invented display name — every
 * account now has a real name.
 */
export function displayName(
  user: AuthUser | null | undefined,
  profileFullName?: string | null,
): string {
  if (profileFullName?.trim()) return profileFullName.trim().split(/\s+/)[0];
  if (user?.firstName?.trim()) return user.firstName.trim();
  if (user?.email) return user.email.split("@")[0];
  return "";
}
