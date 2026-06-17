import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";
import { KALEON_LOGO_SRC } from "@/lib/brand";
import { t } from "@/lib/copy";
import { getProfileForUser } from "@/lib/supabase-profiles";

type AuthMode = "signin" | "signup";

const inputClass =
  "w-full px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#4ECCA3]";

const inputStyle = {
  background: "rgba(5, 12, 24, 0.65)",
  border: "1px solid rgba(78,204,163,0.2)",
  borderRadius: 8,
  color: "#f8fafc",
} as const;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const {
    isAuthenticated,
    isLoading,
    user,
    signInWithEmail,
    verifyOtp,
    authVerifying,
    authError,
    clearAuthError,
  } = useAuth();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  // Persist returnTo in localStorage so it survives Supabase's PKCE redirect cycle.
  const returnTo = useMemo(() => {
    const fromUrl = params.get("returnTo");
    const fromStorage = localStorage.getItem("kaleon_auth_returnTo");
    const resolved = fromUrl || fromStorage || "/profiles";
    if (resolved && resolved !== fromStorage) {
      localStorage.setItem("kaleon_auth_returnTo", resolved);
    }
    return resolved;
  }, [params]);
  const initialMode: AuthMode = params.get("mode") === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated && !authVerifying) {
      localStorage.removeItem("kaleon_auth_returnTo");
      // If user has a profile, go to their courses; otherwise go to onboarding
      (async () => {
        try {
          const profile = await getProfileForUser(user?.id ?? '');
          if (profile?.id) {
            navigate(`/courses/${profile.id}`, { replace: true });
          } else {
            navigate("/onboarding", { replace: true });
          }
        } catch (err) {
          // On error, fallback to onboarding
          navigate("/onboarding", { replace: true });
        }
      })();
    }
  }, [isAuthenticated, isLoading, authVerifying, navigate, user]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setLocalError(null);
    clearAuthError();
    setLinkSent(false);
    if (next === "signin") setFirstName("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!isSupabaseConfigured) {
      setLocalError(t("auth.notConfigured"));
      return;
    }

    if (mode === "signup" && !firstName.trim()) {
      setLocalError(t("auth.firstNameRequired"));
      return;
    }

    setLoading(true);
    const result = await signInWithEmail(email.trim(), {
      firstName: mode === "signup" ? firstName.trim() : undefined,
      returnTo,
    });
    if (result.error) {
      setLocalError(result.error);
    } else {
      setLinkSent(true);
    }
    setLoading(false);
  };

  const displayError = authError ?? localError;

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center pwc-font-sans"
        style={{ background: "var(--app-page-bg)" }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4ECCA3" }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pwc-font-sans flex flex-col"
      style={{
        background: "linear-gradient(165deg, #070d1a 0%, #0a1628 45%, #061020 100%)",
        color: "var(--app-text)",
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(78,204,163,0.15), transparent)",
        }}
      />

      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm pwc-font-mono uppercase tracking-wider transition-colors"
          style={{ color: "#94a3b8" }}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("auth.backHome")}
        </Link>
        <div className="flex items-center gap-2">
          <img
            src={KALEON_LOGO_SRC}
            alt=""
            width={28}
            height={28}
            className="object-contain"
            aria-hidden
          />
          <span className="font-bold uppercase tracking-tight" style={{ color: "#f8fafc" }}>
            Kaleon
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-12">
        <div
          className="w-full max-w-md p-6 md:p-8"
          style={{
            background: "linear-gradient(160deg, rgba(13,26,46,0.95) 0%, rgba(6,16,32,0.98) 100%)",
            border: "1px solid rgba(78,204,163,0.25)",
            borderRadius: 12,
            boxShadow: "0 0 48px rgba(78,204,163,0.1)",
          }}
        >
          {authVerifying ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4ECCA3" }} />
              <h1 className="text-xl font-bold uppercase tracking-tight" style={{ color: "#f8fafc" }}>
                {t("auth.verifyingTitle")}
              </h1>
              <p className="text-sm text-center" style={{ color: "#94a3b8" }}>
                {t("auth.verifyingBody")}
              </p>
            </div>
          ) : linkSent ? (
            <>
              <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-2" style={{ color: "#f8fafc" }}>
                Enter Code
              </h1>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: "#94a3b8" }}>
                Check your email at <strong style={{ color: "#f1f5f9" }}>{email}</strong> for a 6-digit verification code.
                Enter it below to {mode === "signin" ? "sign in" : "create your account"}.
              </p>

              {displayError && (
                <p
                  className="text-sm mb-4 px-3 py-2"
                  style={{
                    color: "#fca5a5",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 8,
                  }}
                >
                  {displayError}
                </p>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLocalError(null);
                  clearAuthError();
                  if (!otpCode.trim()) return;
                  setLoading(true);
                  const result = await verifyOtp(email, otpCode.trim());
                  if (result.error) {
                    setLocalError(result.error);
                  }
                  setLoading(false);
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    className="text-xs pwc-font-mono uppercase tracking-wider font-bold mb-2 block"
                    style={{ color: "#64748b" }}
                  >
                    Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#4ECCA3] text-center text-2xl font-bold tracking-widest"
                    style={inputStyle}
                  />
                  <p className="text-xs mt-2 text-center" style={{ color: "#64748b" }}>
                    The code is in the same email as the magic link
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="kaleon-btn-primary w-full px-4 py-3 text-sm pwc-font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ borderRadius: 8 }}
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
                  ) : (
                    "Verify & " + (mode === "signin" ? "Sign In" : "Create Account")
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setLinkSent(false); setEmail(""); setOtpCode(""); }}
                  className="kaleon-btn-outline w-full px-4 py-3 text-xs pwc-font-mono uppercase tracking-wider font-bold"
                  style={{ borderRadius: 8 }}
                >
                  Use a different email
                </button>
              </form>
            </>
          ) : (
            <>
              <p
                className="text-xs pwc-font-mono uppercase tracking-widest font-bold mb-2"
                style={{ color: "#4ECCA3", opacity: 0.85 }}
              >
                {mode === "signup" ? t("auth.createAccountEyebrow") : t("auth.signInEyebrow")}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-2" style={{ color: "#f8fafc" }}>
                {mode === "signup" ? t("auth.createAccountTitle") : t("auth.signInTitle")}
              </h1>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "#94a3b8" }}>
                {t("auth.subtitle")}
              </p>

              <div
                className="flex gap-1 p-1 mb-6"
                style={{
                  background: "rgba(5,12,24,0.6)",
                  border: "1px solid rgba(78,204,163,0.12)",
                  borderRadius: 8,
                }}
                role="tablist"
              >
                {(["signin", "signup"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={mode === tab}
                    onClick={() => switchMode(tab)}
                    className="flex-1 py-2.5 text-xs pwc-font-mono uppercase tracking-wider font-bold transition-all"
                    style={{
                      borderRadius: 6,
                      background: mode === tab ? "rgba(78,204,163,0.15)" : "transparent",
                      color: mode === tab ? "#4ECCA3" : "#64748b",
                      border: mode === tab ? "1px solid rgba(78,204,163,0.35)" : "1px solid transparent",
                    }}
                  >
                    {tab === "signin" ? t("auth.tabSignIn") : t("auth.tabSignUp")}
                  </button>
                ))}
              </div>

              {displayError && (
                <p
                  className="text-sm mb-4 px-3 py-2"
                  style={{
                    color: "#fca5a5",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 8,
                  }}
                >
                  {displayError}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <label className="block">
                    <span
                      className="text-xs pwc-font-mono uppercase tracking-wider font-bold mb-2 block"
                      style={{ color: "#64748b" }}
                    >
                      {t("auth.firstNameLabel")}
                    </span>
                    <input
                      type="text"
                      required
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t("auth.firstNamePlaceholder")}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </label>
                )}

                <label className="block">
                  <span
                    className="text-xs pwc-font-mono uppercase tracking-wider font-bold mb-2 block"
                    style={{ color: "#64748b" }}
                  >
                    {t("auth.emailLabel")}
                  </span>
                  <input
                    type="email"
                    required
                    autoFocus={mode === "signin"}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    className={inputClass}
                    style={inputStyle}
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="kaleon-btn-primary w-full px-4 py-3 text-sm pwc-font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                  style={{ borderRadius: 8 }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("auth.sending")}
                    </>
                  ) : (
                    t("auth.sendLink")
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      <style>{`
        .kaleon-btn-primary {
          background: linear-gradient(135deg, #4ECCA3, #38b2ac);
          color: #050c18;
        }
        .kaleon-btn-outline {
          border: 1px solid rgba(78,204,163,0.35);
          background: transparent;
          color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
