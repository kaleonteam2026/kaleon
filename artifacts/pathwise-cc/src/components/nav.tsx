import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, Target, Map, Award, LogOut, Menu, X,
  User, TrendingUp, Search, ChevronRight, Download,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import NotificationBell from "@/components/notification-bell";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resolvedId, setResolvedId] = useState<number | null>(profileId ?? null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(mobileMenuRef, mobileOpen, () => setMobileOpen(false));

  useEffect(() => {
    if (profileId) { storeProfileId(profileId); setResolvedId(profileId); }
    else { const s = getStoredProfileId(); if (s) setResolvedId(s); }
  }, [profileId]);

  const staticLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Profile", icon: User },
    { href: resolvedId ? `/scholarships/${resolvedId}` : "/scholarships", label: "Scholarships", icon: Award },
  ];

  const profileLinks = resolvedId ? [
    { href: `/courses/${resolvedId}`, label: "Courses", icon: BookOpen },
    { href: `/pathways/${resolvedId}`, label: "Pathway", icon: Target },
    { href: `/progress/${resolvedId}`, label: "Progress", icon: TrendingUp },
    { href: `/internships/${resolvedId}`, label: "Internships", icon: Search },
    { href: `/exports/${resolvedId}`, label: "Exports", icon: Download },
  ] : [];

  const allLinks = [...staticLinks, ...profileLinks];

  if (!isAuthenticated) return null;

  const isActive = (href: string) => {
    const base = href.split("/").slice(0, 2).join("/");
    return location.startsWith(base);
  };

  const bottomTabs = resolvedId ? [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { href: `/courses/${resolvedId}`, icon: BookOpen, label: "Courses" },
    { href: `/pathways/${resolvedId}`, icon: Target, label: "Pathway" },
    { href: `/progress/${resolvedId}`, icon: TrendingUp, label: "Progress" },
    { href: `/internships/${resolvedId}`, icon: Search, label: "Intern" },
  ] : [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  const Brand = (
    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900 text-lg tracking-tight uppercase">
      <div className="h-7 w-7 bg-slate-900 text-white flex items-center justify-center pwc-font-mono font-bold text-sm">
        D
      </div>
      <span>DYP</span>
      <span className="hidden lg:inline pwc-font-mono text-[10px] text-slate-500 normal-case tracking-widest font-medium">// DO YOUR PATH</span>
    </Link>
  );

  return (
    <>
      {/* Skip link for keyboard / screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-slate-900 focus:text-white focus:px-4 focus:py-2 focus:border-2 focus:border-amber-300 focus:outline-none"
      >
        Skip to main content
      </a>

      {/* ── Desktop nav ── */}
      <nav aria-label="Primary" className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-slate-900 px-6 h-14 items-center justify-between">
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
          <span className="text-xs pwc-font-mono uppercase tracking-wider text-slate-600">
            {user?.firstName ?? user?.email ?? "Student"}
          </span>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="text-slate-700 hover:text-slate-900 p-1.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* ── Mobile top bar ── */}
      <nav aria-label="Primary" className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-slate-900 px-4 h-14 flex items-center justify-between">
        {Brand}
        <div className="flex items-center gap-1">
          {resolvedId && <NotificationBell profileId={resolvedId} />}
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
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
          aria-label="Navigation menu"
          tabIndex={-1}
          className="md:hidden fixed inset-0 z-50 bg-white focus:outline-none"
        >
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="h-14 px-4 flex items-center justify-between border-b-2 border-slate-900 flex-shrink-0">
              <span className="text-xs pwc-font-mono font-bold text-slate-900 uppercase tracking-widest">Menu</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="p-3 -mr-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 flex-1">
              <p className="text-xs pwc-font-mono font-bold text-slate-600 uppercase tracking-widest mb-3 px-1">Navigation</p>
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
            <div className="p-4 border-t-2 border-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs pwc-font-mono uppercase text-slate-700">{user?.firstName ?? user?.email ?? "Student"}</span>
                <button onClick={logout} className="flex items-center gap-2 text-xs pwc-font-mono uppercase text-slate-900 px-3 py-2 border-2 border-slate-900 hover:bg-slate-900 hover:text-white min-h-[44px]">
                  <LogOut className="h-4 w-4" aria-hidden="true" />Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav aria-label="Quick navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-900 flex">
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
                "flex-1 flex flex-col items-center justify-center gap-0.5 border-r border-slate-200 last:border-r-0 min-h-[56px] py-2 px-1 focus:outline-none focus:bg-slate-100",
                active && "bg-slate-900 text-white focus:bg-slate-800"
              )}
            >
              <tab.icon className={cn("h-5 w-5", active ? "text-white" : "text-slate-700")} aria-hidden="true" />
              <span className={cn("text-[10px] pwc-font-mono uppercase font-bold", active ? "text-white" : "text-slate-700")}>
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
