import type { Session, User } from "@supabase/supabase-js";
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

export async function sendOtpCode(
  email: string,
  options?: { firstName?: string },
): Promise<{ error?: string }> {
  const data = options?.firstName?.trim()
    ? { first_name: options.firstName.trim() }
    : undefined;

  // When signing in (no firstName), avoid auto-creating a user if the email doesn't exist.
  // When signing up (firstName provided), allow user creation.
  const shouldCreateUser = Boolean(options?.firstName?.trim());

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser,
      data,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();

    if (shouldCreateUser) {
      // Sign-up flow — the email might already be registered, or there could be
      // a server configuration issue. Show the raw error so the user knows what
      // went wrong.
      return { error: error.message };
    }

    // Sign-in flow — the email must already have an account.
    // Distinguish "user not found" from other transient failures.
    if (
      msg.includes("not found") ||
      msg.includes("does not exist") ||
      (msg.includes("signup") || msg.includes("not allowed")) ||
      msg.includes("otp")
    ) {
      return {
        error:
          "No account associated with this email. Please create an account instead.",
      };
    }

    return { error: error.message };
  }

  return {};
}

/**
 * Verify a one-time password (6-digit code) sent via email.
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
): Promise<{ error?: string; user?: User }> {
  const { data, error } = await supabase.auth.updateUser({ data: metadata });
  return error ? { error: error.message } : { user: data.user };
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
