import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, Target, Map, Award, LogOut, Menu, X,
  User, TrendingUp, Search, ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";

const PROFILE_ID_KEY = "pathwise_active_profile_id";

export function storeProfileId(id: number) {
  localStorage.setItem(PROFILE_ID_KEY, String(id));
}
function getStoredProfileId(): number | null {
  const v = localStorage.getItem(PROFILE_ID_KEY);
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
    { href: "/profile", label: "My Profile", icon: User },
    { href: resolvedId ? `/scholarships/${resolvedId}` : "/scholarships", label: "Scholarships & CC", icon: Award },
  ];

  const profileLinks = resolvedId ? [
    { href: `/courses/${resolvedId}`, label: "My Courses", icon: BookOpen },
    { href: `/pathways/${resolvedId}`, label: "Pathway", icon: Target },
    { href: `/progress/${resolvedId}`, label: "My Progress", icon: TrendingUp },
    { href: `/internships/${resolvedId}`, label: "Internships", icon: Search },
  ] : [];

  const allLinks = [...staticLinks, ...profileLinks];

  if (!isAuthenticated) return null;

  const isActive = (href: string) => {
    const base = href.split("/").slice(0, 2).join("/");
    return location.startsWith(base);
  };

  // Bottom nav tabs (mobile only) — 5 most-used
  const bottomTabs = resolvedId ? [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { href: `/courses/${resolvedId}`, icon: BookOpen, label: "Courses" },
    { href: `/pathways/${resolvedId}`, icon: Target, label: "Pathway" },
    { href: `/progress/${resolvedId}`, icon: TrendingUp, label: "Progress" },
    { href: `/internships/${resolvedId}`, icon: Search, label: "Internships" },
  ] : [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <>
      {/* ── Desktop nav ── */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-6 h-14 items-center justify-between shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-indigo-700 text-lg">
          <Map className="h-5 w-5" />Pathwise CC
        </Link>
        <div className="flex items-center gap-1 flex-wrap">
          {allLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <span className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                isActive(link.href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}>
                <link.icon className="h-3.5 w-3.5" />{link.label}
              </span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{user?.firstName ?? user?.email ?? "Student"}</span>
          <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 hover:text-slate-800">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* ── Mobile top bar ── */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-indigo-700">
          <Map className="h-5 w-5" />Pathwise CC
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-600">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* ── Mobile full-screen menu (hamburger) ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white" style={{ top: 56 }}>
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="p-4 flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Navigation</p>
              {allLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                  <span className={cn(
                    "flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium mb-1",
                    isActive(link.href) ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                  )}>
                    <span className="flex items-center gap-3">
                      <link.icon className="h-5 w-5" />{link.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{user?.firstName ?? user?.email ?? "Student"}</span>
                <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-50">
                  <LogOut className="h-4 w-4" />Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex shadow-lg">
        {bottomTabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link key={tab.href} href={tab.href} onClick={() => setMobileOpen(false)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5">
              <tab.icon className={cn("h-5 w-5", active ? "text-indigo-600" : "text-slate-400")} />
              <span className={cn("text-[10px] font-semibold", active ? "text-indigo-600" : "text-slate-400")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
