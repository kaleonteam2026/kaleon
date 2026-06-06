import type { EmailOtpType, Session, User } from "@supabase/supabase-js";
import type { AuthUser } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

export function mapSupabaseUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email,
    firstName: (meta.first_name ?? meta.given_name ?? null) as string | null,
    lastName: (meta.last_name ?? null) as string | null,
    profileImageUrl: (meta.avatar_url ?? null) as string | null,
  };
}

export function getAuthRedirectUrl(returnTo?: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const origin = `${window.location.origin}${base || ""}`;
  const path = `${origin}/auth`;
  if (!returnTo) return path;
  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
}

export async function verifyMagicLinkFromUrl(): Promise<{ error?: string }> {
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const returnTo = params.get("returnTo");

  if (!tokenHash) return {};

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: (type as EmailOtpType) || "email",
  });

  if (!error) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const next = returnTo
      ? `${base}/auth?returnTo=${encodeURIComponent(returnTo)}`
      : `${base}/auth`;
    window.history.replaceState({}, document.title, next);
  }

  return error ? { error: error.message } : {};
}

export async function signInWithMagicLink(
  email: string,
  options?: { firstName?: string; returnTo?: string },
): Promise<{ error?: string }> {
  const data = options?.firstName?.trim()
    ? { first_name: options.firstName.trim() }
    : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(options?.returnTo),
      data,
    },
  });
  return error ? { error: error.message } : {};
}

/**
 * Verify a one-time password (6-digit code) sent via email.
 * This lets the user enter the code on their original device instead of
 * relying on clicking the magic link (which opens wherever email is read).
 */
export async function verifyOtpCode(
  email: string,
  token: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  return error ? { error: error.message } : {};
}

export async function updateUserMetadata(
  metadata: { first_name?: string; last_name?: string },
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.updateUser({ data: metadata });
  return error ? { error: error.message } : {};
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
