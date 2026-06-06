import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useLocation } from "wouter";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  getCurrentSession,
  mapSupabaseUser,
  signInWithMagicLink,
  updateUserMetadata,
  verifyMagicLinkFromUrl,
  verifyOtpCode,
} from "@/lib/supabase-auth";

interface AuthUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoginOpen: boolean;
  authVerifying: boolean;
  authError: string | null;
  login: () => void;
  closeLogin: () => void;
  clearAuthError: () => void;
  signInWithEmail: (
    email: string,
    options?: { firstName?: string; returnTo?: string },
  ) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  updateProfileName: (firstName: string) => Promise<{ error?: string }>;
  logout: () => void;
  refetch: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";
const USE_SUPABASE = isSupabaseConfigured && !AUTH_BYPASS;

if (AUTH_BYPASS && import.meta.env.DEV) {
  console.warn(
    "[Kaleon] VITE_AUTH_BYPASS is enabled — auth uses a fake Dev user. Disable for real Supabase sign-in.",
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authVerifying, setAuthVerifying] = useState(() => {
    if (!USE_SUPABASE) return false;
    return new URLSearchParams(window.location.search).has("token_hash");
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessPath, setAuthSuccessPath] = useState<string | null>(null);

  const applySession = useCallback(async (session: Awaited<ReturnType<typeof getCurrentSession>>) => {
    if (session?.user) {
      setUser(mapSupabaseUser(session.user));
    } else {
      setUser(null);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    if (AUTH_BYPASS) {
      setUser({
        id: "dev",
        email: "dev@local",
        firstName: "Dev",
        lastName: "User",
      });
      setIsLoading(false);
      return;
    }

    if (USE_SUPABASE) {
      const session = await getCurrentSession();
      await applySession(session);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch("/api/auth/user", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null }>;
      })
      .then(async (data) => {
        setUser(data.user ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoading(false);
      });
  }, [applySession]);

  useEffect(() => {
    if (!USE_SUPABASE) {
      fetchUser();
      return;
    }

    let mounted = true;
    let authChannel: BroadcastChannel | null = null;

    async function initSupabaseAuth() {
      const params = new URLSearchParams(window.location.search);
      if (params.has("token_hash")) {
        setAuthVerifying(true);
        const { error } = await verifyMagicLinkFromUrl();
        if (!mounted) return;
        if (error) setAuthError(error);
        setAuthVerifying(false);

        // If we just verified the magic link in THIS tab, notify other tabs
        // and close (the magic link email opened this as a new tab).
        const session = await getCurrentSession();
        if (!mounted) return;
        if (session?.user) {
          const returnTo = localStorage.getItem("kaleon_auth_returnTo") || "/dashboard";
          try {
            const channel = new BroadcastChannel("kaleon-auth");
            channel.postMessage({ type: "auth-success", returnTo });
            channel.close();
          } catch { /* BroadcastChannel may not be available */ }
          // Attempt to close this tab — it was opened by the magic link email
          window.close();
        }
      }

      const session = await getCurrentSession();
      if (!mounted) return;
      await applySession(session);
      setIsLoading(false);
    }

    initSupabaseAuth();

    // Listen for auth success in another tab (the magic link tab)
    try {
      authChannel = new BroadcastChannel("kaleon-auth");
      authChannel.onmessage = (event) => {
        if (event.data?.type === "auth-success") {
          const path = event.data.returnTo || "/dashboard";
          // Re-fetch session to pick up the new auth state
          getCurrentSession().then((session) => {
            if (!mounted) return;
            applySession(session);
            setAuthSuccessPath(path);
          });
        }
      };
    } catch { /* BroadcastChannel may not be available */ }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await applySession(session);
      setIsLoading(false);
      if (session?.user) {
        setIsLoginOpen(false);
        setAuthError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      authChannel?.close();
    };
  }, [applySession, fetchUser]);

  // Navigate when auth completes from a cross-tab broadcast
  useEffect(() => {
    if (authSuccessPath && !isLoading && user && !authVerifying) {
      setAuthSuccessPath(null);
      localStorage.removeItem("kaleon_auth_returnTo");
      setLocation(authSuccessPath, { replace: true });
    }
  }, [authSuccessPath, isLoading, user, authVerifying, setLocation]);

  const login = useCallback(() => {
    if (AUTH_BYPASS) {
      setLocation("/dashboard", { replace: true });
      return;
    }
    if (USE_SUPABASE) {
      setAuthError(null);
      setLocation("/auth", { replace: true });
      return;
    }
    window.location.href = `/api/login?returnTo=${encodeURIComponent("/")}`;
  }, [setLocation]);

  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, options?: { firstName?: string; returnTo?: string }) => {
      return signInWithMagicLink(email, options);
    },
    [],
  );

  const verifyOtp = useCallback(async (email: string, token: string) => {
    return verifyOtpCode(email, token);
  }, []);

  const updateProfileName = useCallback(async (firstName: string) => {
    const trimmed = firstName.trim();
    if (!trimmed) return { error: "Name is required" };
    const result = await updateUserMetadata({ first_name: trimmed });
    if (!result.error) {
      const session = await getCurrentSession();
      await applySession(session);
    }
    return result;
  }, [applySession]);

  const logout = useCallback(async () => {
    if (AUTH_BYPASS) {
      setUser(null);
      setLocation("/");
      return;
    }
    if (USE_SUPABASE) {
      await supabase.auth.signOut();
      setUser(null);
      setLocation("/");
      return;
    }
    window.location.href = "/api/logout";
  }, [setLocation]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isLoginOpen,
        authVerifying,
        authError,
        login,
        closeLogin,
        clearAuthError,
        signInWithEmail,
        verifyOtp,
        updateProfileName,
        logout,
        refetch: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export type { AuthUser };
