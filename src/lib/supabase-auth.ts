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

export function getAuthRedirectUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base || ""}`;
}

export async function verifyMagicLinkFromUrl(): Promise<{ error?: string }> {
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  if (!tokenHash) return {};

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: (type as EmailOtpType) || "email",
  });

  if (!error) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  return error ? { error: error.message } : {};
}

export async function signInWithMagicLink(email: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
  return error ? { error: error.message } : {};
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
