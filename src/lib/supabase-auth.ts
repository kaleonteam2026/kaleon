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
  // Some Supabase projects block OTP sign-in when "Allow new users to sign up" is
  // disabled in the dashboard — as a workaround, try shouldCreateUser:true as a
  // fallback so existing users can still receive codes.
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

    // Detect Supabase's "signups disabled" error.
    // Retry once with shouldCreateUser: true as a workaround.
    if (!shouldCreateUser && (msg.includes("signup") || msg.includes("not allowed") || msg.includes("otp"))) {
      const { error: retryError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data,
        },
      });
      if (!retryError) return {};
      return {
        error:
          "Unable to send a verification code. This usually means the Supabase project has sign-ups disabled. " +
          "Please ask the admin to enable \"Allow new users to sign up\" in the Supabase dashboard " +
          "(Authentication > Settings > General), or try again later.",
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
): Promise<{ error?: string }> {
  const { error } = await supabase.auth.updateUser({ data: metadata });
  return error ? { error: error.message } : {};
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
