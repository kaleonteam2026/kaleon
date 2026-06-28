import { useState, type FormEvent } from "react";
import { Loader2, Mail, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { t } from "@/lib/copy";

export default function SupabaseAuthModal() {
  const {
    isLoginOpen,
    closeLogin,
    signInWithEmail,
    authError,
    clearAuthError,
    authVerifying,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isLoginOpen && !authVerifying && !authError) return null;

  const resetAndClose = () => {
    setEmail("");
    setEmailSent(false);
    setLocalError(null);
    clearAuthError();
    closeLogin();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setLocalError(null);
    const result = await signInWithEmail(email.trim());
    if (result.error) {
      setLocalError(result.error);
    } else {
      setEmailSent(true);
    }
    setLoading(false);
  };

  const displayError = authError ?? localError;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pwc-font-sans"
      style={{ background: "rgba(5, 12, 24, 0.88)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="relative w-full max-w-md p-6 md:p-8"
        style={{
          background: "linear-gradient(160deg, #0a1628 0%, #061020 100%)",
          border: "1px solid rgba(78,204,163,0.25)",
          borderRadius: 12,
          boxShadow: "0 0 40px rgba(78,204,163,0.12)",
        }}
      >
        {!authVerifying && (
          <button
            type="button"
            onClick={resetAndClose}
            aria-label={t("common.close")}
            className="absolute top-4 right-4 p-1.5 transition-colors"
            style={{ color: "#64748b" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#4ECCA3"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <p
          className="text-xs pwc-font-mono uppercase tracking-widest font-bold mb-2"
          style={{ color: "#4ECCA3", opacity: 0.8 }}
        >
          {t("auth.eyebrow", { defaultValue: "Sign in to Kaleon" })}
        </p>
        <h2
          id="auth-modal-title"
          className="text-2xl font-bold uppercase tracking-tight mb-2"
          style={{ color: "#f8fafc" }}
        >
          {authVerifying
            ? t("auth.verifyingTitle", { defaultValue: "Confirming your link" })
            : displayError
              ? t("auth.errorTitle", { defaultValue: "Sign in failed" })
              : emailSent
                ? t("auth.sentTitle", { defaultValue: "Check your email" })
                : t("auth.title", { defaultValue: "Get started free" })}
        </h2>

        {authVerifying ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#4ECCA3" }} />
            <p className="text-sm text-center" style={{ color: "#94a3b8" }}>
              {t("auth.verifyingBody", { defaultValue: "Confirming your magic link…" })}
            </p>
          </div>
        ) : displayError ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "#fca5a5" }}>{displayError}</p>
            <button
              type="button"
              onClick={() => { clearAuthError(); setLocalError(null); setEmailSent(false); }}
              className="kaleon-btn-primary w-full px-4 py-2.5 text-xs pwc-font-mono uppercase tracking-wider font-bold"
              style={{ borderRadius: 8 }}
            >
              {t("auth.tryAgain", { defaultValue: "Try again" })}
            </button>
          </div>
        ) : emailSent ? (
          <div className="space-y-4">
            <div
              className="flex items-start gap-3 p-4"
              style={{
                background: "rgba(78,204,163,0.08)",
                border: "1px solid rgba(78,204,163,0.25)",
                borderRadius: 8,
              }}
            >
              <Mail className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#4ECCA3" }} />
              <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
                {t("auth.sentBody", {
                  defaultValue: "We sent a verification code to {{email}}. Enter it on this device to continue.",
                  email,
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="kaleon-btn-outline w-full px-4 py-2.5 text-xs pwc-font-mono uppercase tracking-wider font-bold"
              style={{ borderRadius: 8 }}
            >
              {t("common.close")}
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>
              {t("auth.subtitle", { defaultValue: "Enter your email and we'll send you a secure sign-in link." })}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="text-xs pwc-font-mono uppercase tracking-wider font-bold mb-2 block" style={{ color: "#64748b" }}>
                  {t("auth.emailLabel", { defaultValue: "Email" })}
                </span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder", { defaultValue: "you@example.com" })}
                  className="w-full px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#4ECCA3]"
                  style={{
                    background: "rgba(5, 12, 24, 0.65)",
                    border: "1px solid rgba(78,204,163,0.2)",
                    borderRadius: 8,
                    color: "#f8fafc",
                  }}
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="kaleon-btn-primary w-full px-4 py-3 text-sm pwc-font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ borderRadius: 8 }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("auth.sending", { defaultValue: "Sending…" })}
                  </>
                ) : (
                  t("auth.sendLink", { defaultValue: "Send verification code" })
                )}
              </button>
            </form>
          </>
        )}
      </div>

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
