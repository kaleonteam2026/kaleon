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

const PROFILE_ID_KEY = "dyp_active_profile_id";

export function storeProfileId(id: number) {
  localStorage.setItem(PROFILE_ID_KEY, String(id));
}
function getStoredProfileId(): number | null {
  // Backwards compat: also read the old key if present.
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
    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900 text-lg tracking-tight uppercase">
      <div className="h-7 w-7 bg-slate-900 text-white flex items-center justify-center pwc-font-mono font-bold text-sm">
        D
      </div>
      <span>DYP</span>
      <span className="hidden lg:inline pwc-font-mono text-[10px] text-slate-500 normal-case tracking-widest font-medium">// {t("common.tagline")}</span>
    </Link>
  );

  return (
    <>
      {/* Skip link for keyboard / screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-slate-900 focus:text-white focus:px-4 focus:py-2 focus:border-2 focus:border-amber-300 focus:outline-none"
      >
        {t("common.skipToMain")}
      </a>

      {/* ── Desktop nav ── */}
      <nav aria-label={t("common.primaryNav")} className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-slate-900 px-6 h-14 items-center justify-between">
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
                  "flex items-center gap-1.5 px-2 lg:px-3 py-1.5 text-xs pwc-font-mono uppercase tracking-wider font-bold transition-colors border-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1",
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
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
          <span className="text-xs pwc-font-mono uppercase tracking-wider text-slate-600">
            {user?.firstName ?? user?.email ?? t("common.student")}
          </span>
          <button
            onClick={logout}
            aria-label={t("common.signOut")}
            className="text-slate-700 hover:text-slate-900 p-1.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* ── Mobile top bar ── */}
      <nav aria-label={t("common.primaryNav")} className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-slate-900 px-4 h-14 flex items-center justify-between">
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
          className="p-3 -mr-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </nav>

      {/* ── Mobile full-screen menu (hamburger) ── */}
      {mobileOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-nav-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t("common.navMenu")}
          tabIndex={-1}
          className="md:hidden fixed inset-0 z-50 bg-white focus:outline-none"
        >
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="h-14 px-4 flex items-center justify-between border-b-2 border-slate-900 flex-shrink-0">
              <span className="text-xs pwc-font-mono font-bold text-slate-900 uppercase tracking-widest">{t("common.menu")}</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label={t("common.close")}
                className="p-3 -mr-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 flex-1">
              <p className="text-xs pwc-font-mono font-bold text-slate-600 uppercase tracking-widest mb-3 px-1">{t("common.navigation")}</p>
              {allLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5 text-sm font-medium mb-1 border-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-slate-900",
                      active ? "bg-slate-900 text-white border-slate-900" : "border-transparent text-slate-800 hover:bg-slate-50"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <link.icon className="h-5 w-5" aria-hidden="true" />{link.label}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-60" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
            <div className="p-4 border-t-2 border-slate-900 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs pwc-font-mono uppercase text-slate-700 truncate">{user?.firstName ?? user?.email ?? t("common.student")}</span>
                <LanguageSwitcher />
              </div>
              <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-xs pwc-font-mono uppercase text-slate-900 px-3 py-2 border-2 border-slate-900 hover:bg-slate-900 hover:text-white min-h-[44px]">
                <LogOut className="h-4 w-4" aria-hidden="true" />{t("common.signOut")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav aria-label={t("common.quickNav")} className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-900 flex">
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
                "relative flex-1 flex flex-col items-center justify-center gap-0.5 border-r border-slate-200 last:border-r-0 min-h-[56px] py-2 px-1 focus:outline-none focus:bg-slate-100",
                active ? "text-white" : "text-slate-700"
              )}
            >
              {active && motionEnabled && (
                <motion.span
                  layoutId="pwc-bottom-tab-pill"
                  className="absolute inset-0 bg-slate-900"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  aria-hidden="true"
                />
              )}
              {active && !motionEnabled && (
                <span className="absolute inset-0 bg-slate-900" aria-hidden="true" />
              )}
              <tab.icon className={cn("h-5 w-5 relative", active ? "text-white" : "text-slate-700")} aria-hidden="true" />
              <span className={cn("text-[10px] pwc-font-mono uppercase font-bold relative", active ? "text-white" : "text-slate-700")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
      {/* Suppress unused import warning */}
      <span className="hidden"><Map /></span>
    </>
  );
}
