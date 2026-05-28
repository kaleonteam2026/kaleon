import { useEffect } from "react";
import { useLocation } from "wouter";

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";

/** Handles direct visits to /api/login in the SPA (Vite serves index.html for unknown paths). */
export default function ApiLoginRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (AUTH_BYPASS) {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      setLocation(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard");
      return;
    }
    // Full navigation so Vite's /api proxy forwards to the API server.
    window.location.replace(`${window.location.pathname}${window.location.search}`);
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Redirecting to sign in…</p>
    </div>
  );
}
