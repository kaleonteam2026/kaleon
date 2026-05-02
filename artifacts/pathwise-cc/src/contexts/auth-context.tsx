import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

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
      .then((data) => {
        setUser(data.user ?? null);
        setIsLoading(false);
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
