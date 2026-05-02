import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, BookOpen, Target, Map, Award, LogOut, Menu, X, User
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

interface Props {
  profileId?: number;
}

export default function Nav({ profileId }: Props) {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resolvedId, setResolvedId] = useState<number | null>(profileId ?? null);

  useEffect(() => {
    if (profileId) {
      storeProfileId(profileId);
      setResolvedId(profileId);
    } else {
      const stored = getStoredProfileId();
      if (stored) setResolvedId(stored);
    }
  }, [profileId]);

  const staticLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "My Profile", icon: User },
    { href: resolvedId ? `/scholarships/${resolvedId}` : "/scholarships", label: "Scholarships & Opportunities", icon: Award },
  ];

  const profileLinks = resolvedId
    ? [
        { href: `/courses/${resolvedId}`, label: "My Courses", icon: BookOpen },
        { href: `/pathways/${resolvedId}`, label: "Pathway", icon: Target },
      ]
    : [];

  const allLinks = [...staticLinks, ...profileLinks];

  if (!isAuthenticated) return null;

  const isActive = (href: string) => {
    const base = href.split("/").slice(0, 2).join("/");
    return location.startsWith(base);
  };

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-6 h-14 items-center justify-between shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-indigo-700 text-lg">
          <Map className="h-5 w-5" />
          Pathwise CC
        </Link>
        <div className="flex items-center gap-1">
          {allLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <span className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}>
                <link.icon className="h-3.5 w-3.5" />
                {link.label}
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

      {/* Mobile nav */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-indigo-700">
          <Map className="h-5 w-5" />
          Pathwise CC
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-600">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-lg">
          <div className="flex flex-col p-4 gap-1">
            {allLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                <span className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
                  isActive(link.href)
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600"
                )}>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </span>
              </Link>
            ))}
            <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 mt-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
