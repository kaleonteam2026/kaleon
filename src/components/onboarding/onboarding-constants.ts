import { GraduationCap, BookOpen, User } from "lucide-react";

export const TRANSFER_TIMELINE_KEYS = [
  "timelineFall2025", "timelineSpring2026", "timelineFall2026", "timelineSpring2027",
  "timelineFall2027", "timelineSpring2028", "timelineFall2028", "timelineUndecided",
] as const;

export const TRANSFER_TIMELINE_VALUES: Record<string, string> = {
  timelineFall2025: "Fall 2025", timelineSpring2026: "Spring 2026", timelineFall2026: "Fall 2026",
  timelineSpring2027: "Spring 2027", timelineFall2027: "Fall 2027", timelineSpring2028: "Spring 2028",
  timelineFall2028: "Fall 2028", timelineUndecided: "Undecided",
};

export const FINANCIAL_KEYS = ["finPell", "finDream", "finAb540", "finMiddle", "finFullPay", "finNotSure"] as const;
export const FINANCIAL_VALUES: Record<string, string> = {
  finPell: "Federal Pell Grant eligible (FAFSA)",
  finDream: "California Dream Act eligible (no DACA/FAFSA)",
  finAb540: "AB 540 eligible", finMiddle: "Middle-income (no Pell)",
  finFullPay: "Full pay", finNotSure: "Not sure",
};

export const STEP_ICONS = [GraduationCap, BookOpen, User] as const;

export const INTRO_DURATION_MS = 5000;

export const ONBOARDING_PAGE_BG = {
  background: "var(--app-page-bg)",
  color: "var(--app-text)",
} as const;

export const ONBOARDING_CARD = {
  background: "var(--app-card-bg)",
  border: "1px solid var(--app-border-strong)",
  borderRadius: 16,
} as const;

export const ONBOARDING_INPUT =
  "w-full px-4 py-2.5 rounded-xl text-sm text-[var(--app-input-text)] placeholder:text-[var(--app-input-placeholder)] bg-[var(--app-input-bg)] border border-[var(--app-border-strong)] focus:outline-none focus:ring-2 focus:ring-[#4ECCA3]/40 focus:border-[#4ECCA3]";
