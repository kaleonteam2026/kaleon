import { CalendarRange, Download, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NAV_ICON_SRC } from "@/lib/brand";
import { t } from "@/lib/copy";

export type NavIconSrc = { default: string; active: string };

export type NavItem = {
  href: string;
  label: string;
  iconSrc?: NavIconSrc;
  icon?: LucideIcon;
  /** Visible in nav but not navigable (e.g. coming soon). */
  locked?: boolean;
};

export function buildProfileNavItems(profileId: number): NavItem[] {
  return [
    { href: `/courses/${profileId}`, label: t("nav.courses"), iconSrc: NAV_ICON_SRC.courses },
    { href: `/pathways/${profileId}`, label: t("nav.pathway"), iconSrc: NAV_ICON_SRC.pathways },
    { href: `/progress/${profileId}`, label: t("nav.progress"), iconSrc: NAV_ICON_SRC.progress },
    { href: `/plan/${profileId}`, label: t("nav.plan"), icon: CalendarRange },
    { href: `/scholarships/${profileId}`, label: t("nav.scholarships"), icon: Percent, locked: true },
    { href: `/exports/${profileId}`, label: t("nav.exports"), icon: Download },
  ];
}
