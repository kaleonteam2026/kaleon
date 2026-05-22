import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { DUR, EASE_OUT, useMotionEnabled } from "@/lib/motion";
import {
  LayoutDashboard, BookOpen, Target, Map, Award, LogOut, Menu, X,
  User, TrendingUp, Search, ChevronRight, Download,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import NotificationBell from "@/components/notification-bell";
import LanguageSwitcher from "@/components/language-switcher";

const PROFILE_ID_KEY = "kaleon_active_profile_id";

export function storeProfileId(id: number) {
  localStorage.setItem(PROFILE_ID_KEY, String(id));
}
function getStoredProfileId(): number | null {
  const v = localStorage.getItem(PROFILE_ID_KEY) ?? localStorage.getItem("pathwise_active_profile_id");
  return v ? parseInt(v) : null;
}

interface Props { profileId?: number; }

export default function Nav({ profileId }: Props) {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resolvedId, setResolvedId] = useState<number | null>(profileId ?? null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const motionEnabled = useMotionEnabled();
  useFocusTrap(mobileMenuRef, mobileOpen, () => setMobileOpen(false));

  useEffect(() => {
    if (profileId) { storeProfileId(profileId); setResolvedId(profileId); }
    else { const s = getStoredProfileId(); if (s) setResolvedId(s); }
  }, [profileId]);

  const staticLinks = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/profile", label: t("nav.profile"), icon: User },
    { href: resolvedId ? `/scholarships/${resolvedId}` : "/scholarships", label: t("nav.scholarships"), icon: Award },
  ];

  const profileLinks = resolvedId ? [
    { href: `/courses/${resolvedId}`, label: t("nav.courses"), icon: BookOpen },
    { href: `/pathways/${resolvedId}`, label: t("nav.pathway"), icon: Target },
    { href: `/progress/${resolvedId}`, label: t("nav.progress"), icon: TrendingUp },
    { href: `/internships/${resolvedId}`, label: t("nav.internships"), icon: Search },
    { href: `/exports/${resolvedId}`, label: t("nav.exports"), icon: Download },
  ] : [];

  const allLinks = [...staticLinks, ...profileLinks];

  if (!isAuthenticated) return null;

  const isActive = (href: string) => {
    const base = href.split("/").slice(0, 2).join("/");
    return location.startsWith(base);
  };

  const bottomTabs = resolvedId ? [
    { href: "/dashboard", icon: LayoutDashboard, label: t("nav.home") },
    { href: `/courses/${resolvedId}`, icon: BookOpen, label: t("nav.courses") },
    { href: `/pathways/${resolvedId}`, icon: Target, label: t("nav.pathway") },
    { href: `/progress/${resolvedId}`, icon: TrendingUp, label: t("nav.progress") },
    { href: `/internships/${resolvedId}`, icon: Search, label: t("nav.intern") },
  ] : [
    { href: "/dashboard", icon: LayoutDashboard, label: t("nav.home") },
    { href: "/profile", icon: User, label: t("nav.profile") },
  ];

  const Brand = (
    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight uppercase">
      <img
        src="/logo.png"
        alt="Logo"
        style={{ width: 30, height: 30, borderRadius: 6, mixBlendMode: "screen" as const }}
      />
      <span style={{ color: "#f8fafc" }}>Kaleon</span>
      <span className="hidden lg:inline pwc-font-mono text-[10px] normal-case tracking-widest font-medium" style={{ color: "#4ECCA3", opacity: 0.6 }}>// {t("common.tagline")}</span>
    </Link>
  );

  return (
    <>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:border-2 focus:outline-none focus:text-sm"
        style={{ background: "#4ECCA3", color: "#050c18", borderColor: "#4ECCA3" }}
      >
        {t("common.skipToMain")}
      </a>

      {/* ── Desktop nav ── */}
      <nav
        aria-label={t("common.primaryNav")}
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 px-6 h-14 items-center justify-between"
        style={{ background: "rgba(5,12,24,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(78,204,163,0.15)" }}
      >
        {Brand}
        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto min-w-0">
          {allLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                aria-label={link.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-xs pwc-font-mono uppercase tracking-wider font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-1",
                  "focus:ring-[#4ECCA3]",
                )}
                style={{
                  borderRadius: 6,
                  border: active ? "1px solid rgba(78,204,163,0.35)" : "1px solid transparent",
                  background: active ? "rgba(78,204,163,0.12)" : "transparent",
                  color: active ? "#4ECCA3" : "#94a3b8",
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "rgba(78,204,163,0.07)"; (e.currentTarget as HTMLElement).style.color = "#cbd5e1"; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; } }}
              >
                <link.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline">{link.label}</span>
                <span className="lg:hidden sr-only">{link.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {resolvedId && <NotificationBell profileId={resolvedId} />}
          <LanguageSwitcher />
          <span className="text-xs pwc-font-mono uppercase tracking-wider" style={{ color: "#64748b" }}>
            {user?.firstName ?? user?.email ?? t("common.student")}
          </span>
          <button
            onClick={logout}
            aria-label={t("common.signOut")}
            className="p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors"
            style={{ color: "#64748b" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#4ECCA3"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* ── Mobile top bar ── */}
      <nav
        aria-label={t("common.primaryNav")}
        className="md:hidden fixed top-0 left-0 right-0 z-50 px-4 h-14 flex items-center justify-between"
        style={{ background: "rgba(5,12,24,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(78,204,163,0.15)" }}
      >
        {Brand}
        <div className="flex items-center gap-1">
          {resolvedId && <NotificationBell profileId={resolvedId} />}
          <LanguageSwitcher />
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? t("common.close") : t("common.menu")}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-menu"
          className="p-3 -mr-2 focus:outline-none focus:ring-2 focus:ring-[#4ECCA3]"
          style={{ color: "#94a3b8" }}
        >
          {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </nav>

      {/* ── Mobile full-screen menu ── */}
      {mobileOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-nav-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t("common.navMenu")}
          tabIndex={-1}
          className="md:hidden fixed inset-0 z-50 focus:outline-none"
          style={{ background: "#070d1a" }}
        >
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="h-14 px-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid rgba(78,204,163,0.15)" }}>
              <span className="text-xs pwc-font-mono font-bold uppercase tracking-widest" style={{ color: "#4ECCA3" }}>{t("common.menu")}</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label={t("common.close")}
                className="p-3 -mr-2 focus:outline-none focus:ring-2 focus:ring-[#4ECCA3]"
                style={{ color: "#94a3b8" }}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 flex-1">
              <p className="text-xs pwc-font-mono font-bold uppercase tracking-widest mb-3 px-1" style={{ color: "#4ECCA3", opacity: 0.6 }}>{t("common.navigation")}</p>
              {allLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className="flex items-center justify-between px-4 py-3.5 text-sm font-medium mb-1 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#4ECCA3] transition-all"
                    style={{
                      borderRadius: 8,
                      border: active ? "1px solid rgba(78,204,163,0.3)" : "1px solid transparent",
                      background: active ? "rgba(78,204,163,0.1)" : "transparent",
                      color: active ? "#4ECCA3" : "#94a3b8",
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <link.icon className="h-5 w-5" aria-hidden="true" />{link.label}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-60" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
            <div className="p-4 space-y-3" style={{ borderTop: "1px solid rgba(78,204,163,0.1)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs pwc-font-mono uppercase truncate" style={{ color: "#64748b" }}>{user?.firstName ?? user?.email ?? t("common.student")}</span>
                <LanguageSwitcher />
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 text-xs pwc-font-mono uppercase px-3 py-2 min-h-[44px] transition-all"
                style={{ border: "1px solid rgba(78,204,163,0.3)", borderRadius: 8, color: "#4ECCA3", background: "transparent" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(78,204,163,0.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />{t("common.signOut")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav
        aria-label={t("common.quickNav")}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: "rgba(5,12,24,0.97)", borderTop: "1px solid rgba(78,204,163,0.15)" }}
      >
        {bottomTabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => setMobileOpen(false)}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 px-1 focus:outline-none transition-colors",
              )}
              style={{ borderRight: "1px solid rgba(78,204,163,0.08)", color: active ? "#4ECCA3" : "#475569" }}
            >
              {active && motionEnabled && (
                <motion.span
                  layoutId="pwc-bottom-tab-pill"
                  className="absolute inset-0"
                  style={{ background: "rgba(78,204,163,0.1)" }}
                  transition={{ duration: DUR.fast, ease: EASE_OUT }}
                  aria-hidden="true"
                />
              )}
              {active && !motionEnabled && (
                <span className="absolute inset-0" style={{ background: "rgba(78,204,163,0.1)" }} aria-hidden="true" />
              )}
              <tab.icon className="h-5 w-5 relative" aria-hidden="true" />
              <span className="text-[10px] pwc-font-mono uppercase font-bold relative">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
      <span className="hidden"><Map /></span>
    </>
  );
}
