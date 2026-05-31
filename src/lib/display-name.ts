import type { AuthUser } from "@/contexts/auth-context";

export function displayName(
  user: AuthUser | null | undefined,
  profileFullName?: string | null,
  fallback = "Student",
): string {
  if (user?.firstName?.trim()) return user.firstName.trim();
  if (user?.email) return user.email.split("@")[0];
  if (profileFullName?.trim()) return profileFullName.trim().split(/\s+/)[0];
  return fallback;
}
