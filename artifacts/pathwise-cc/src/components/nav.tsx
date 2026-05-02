import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, Target, Map, Award, LogOut, Menu, X,
  User, TrendingUp, Search, ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";

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
      {/* ── Desktop nav ── */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-slate-900 px-6 h-14 items-center justify-between">
        {Brand}
        <div className="flex items-center gap-1 flex-wrap">
          {allLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <span className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs pwc-font-mono uppercase tracking-wider font-bold transition-colors border-2",
                isActive(link.href)
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}>
                <link.icon className="h-3.5 w-3.5" />{link.label}
              </span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs pwc-font-mono uppercase tracking-wider text-slate-500">
            {user?.firstName ?? user?.email ?? "Student"}
          </span>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="text-slate-500 hover:text-slate-900 p-1.5 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>

      {/* ── Mobile top bar ── */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-slate-900 px-4 h-14 flex items-center justify-between">
        {Brand}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-900">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* ── Mobile full-screen menu (hamburger) ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white" style={{ top: 56 }}>
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="p-4 flex-1">
              <p className="text-xs pwc-font-mono font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Navigation</p>
              {allLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                  <span className={cn(
                    "flex items-center justify-between px-4 py-3.5 text-sm font-medium mb-1 border-2",
                    isActive(link.href) ? "bg-slate-900 text-white border-slate-900" : "border-transparent text-slate-700 hover:bg-slate-50"
                  )}>
                    <span className="flex items-center gap-3">
                      <link.icon className="h-5 w-5" />{link.label}
                    </span>
                    <ChevronRight className="h-4 w-4 opacity-60" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="p-4 border-t-2 border-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs pwc-font-mono uppercase text-slate-500">{user?.firstName ?? user?.email ?? "Student"}</span>
                <button onClick={logout} className="flex items-center gap-2 text-xs pwc-font-mono uppercase text-slate-700 px-3 py-2 border-2 border-slate-900 hover:bg-slate-900 hover:text-white">
                  <LogOut className="h-4 w-4" />Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-900 flex">
        {bottomTabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link key={tab.href} href={tab.href} onClick={() => setMobileOpen(false)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 border-r border-slate-200 last:border-r-0",
                active && "bg-slate-900 text-white"
              )}>
              <tab.icon className={cn("h-5 w-5", active ? "text-white" : "text-slate-400")} />
              <span className={cn("text-[10px] pwc-font-mono uppercase font-bold", active ? "text-white" : "text-slate-500")}>
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
