import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { SUPPORTED_LOCALES, changeLocale, LOCALE_STORAGE_KEY, type SupportedLocale } from "@/i18n/config";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  getCurrentSession,
  mapSupabaseUser,
  signInWithMagicLink,
  verifyMagicLinkFromUrl,
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
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  logout: () => void;
  refetch: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";
const USE_SUPABASE = isSupabaseConfigured && !AUTH_BYPASS;

async function syncLocaleWithServer(): Promise<void> {
  try {
    const res = await fetch("/api/me/locale", { credentials: "include" });
    if (!res.ok) return;
    const { locale } = await res.json() as { locale?: string | null };
    const explicitStored = typeof window !== "undefined"
      ? window.localStorage.getItem(LOCALE_STORAGE_KEY)
      : null;
    const valid = (l: unknown): l is SupportedLocale =>
      typeof l === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(l);
    if (valid(explicitStored) && explicitStored !== locale) {
      await fetch("/api/me/locale", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-dyp-locale": explicitStored },
        body: JSON.stringify({ locale: explicitStored }),
      });
    } else if (valid(locale)) {
      await changeLocale(locale);
    }
  } catch {
    /* offline or unauthenticated — no-op */
  }
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

  const applySession = useCallback(async (session: Awaited<ReturnType<typeof getCurrentSession>>) => {
    if (session?.user) {
      setUser(mapSupabaseUser(session.user));
      await syncLocaleWithServer();
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
        if (data.user) await syncLocaleWithServer();
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

    async function initSupabaseAuth() {
      const params = new URLSearchParams(window.location.search);
      if (params.has("token_hash")) {
        setAuthVerifying(true);
        const { error } = await verifyMagicLinkFromUrl();
        if (!mounted) return;
        if (error) setAuthError(error);
        setAuthVerifying(false);
      }

      const session = await getCurrentSession();
      if (!mounted) return;
      await applySession(session);
      setIsLoading(false);
    }

    initSupabaseAuth();

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
    };
  }, [applySession, fetchUser]);

  const login = useCallback(() => {
    if (AUTH_BYPASS) {
      setLocation("/dashboard");
      return;
    }
    if (USE_SUPABASE) {
      setAuthError(null);
      setIsLoginOpen(true);
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

  const signInWithEmail = useCallback(async (email: string) => {
    return signInWithMagicLink(email);
  }, []);

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
