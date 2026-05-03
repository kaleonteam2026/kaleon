import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { SUPPORTED_LOCALES, changeLocale, getStoredLocale, type SupportedLocale } from "@/i18n/config";

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
  login: () => void;
  logout: () => void;
  refetch: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

async function syncLocaleWithServer(): Promise<void> {
  try {
    const res = await fetch("/api/me/locale", { credentials: "include" });
    if (!res.ok) return;
    const { locale } = await res.json() as { locale?: string | null };
    const localStored = getStoredLocale();
    const valid = (l: unknown): l is SupportedLocale =>
      typeof l === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(l);
    if (valid(localStored) && localStored !== locale) {
      // Guest/device-chosen locale wins on sign-in: push it up to the server
      // so a freshly chosen language carries through authentication.
      await fetch("/api/me/locale", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-dyp-locale": localStored },
        body: JSON.stringify({ locale: localStored }),
      });
    } else if (valid(locale) && locale !== localStored) {
      // No device preference set — adopt the server's stored locale.
      await changeLocale(locale);
    }
  } catch {
    /* offline or unauthenticated — no-op */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(() => {
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
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = useCallback(() => {
    window.location.href = `/api/login?returnTo=${encodeURIComponent("/")}`;
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, refetch: fetchUser }}>
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
