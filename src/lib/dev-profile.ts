import { storeProfileId } from "@/components/nav";

export const DEV_PROFILE_ID = 1;
const STORAGE_KEY = "kaleon_dev_profiles";

export interface DevStudentProfile {
  id: number;
  fullName?: string;
  communityCollege?: string;
  intendedMajor?: string;
  careerGoal?: string;
  currentGpa?: number;
  transferTimeline?: string;
  financialSituation?: string;
  isFirstGen?: string;
  completionPercent?: number;
}

export interface DevDashboardSummary {
  profileCompletionPercent: number;
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  estimatedGpa: number | null;
  savedPathwaysCount: number;
  guidebooksCount: number;
  topMatchUniversity: string | null;
  topMatchScore: number | null;
  chosenTransferSchool: string | null;
  chosenTransferScore: number | null;
  nextActions: string[];
  readinessScore: number;
  readinessLabel: string;
  readinessBreakdown: {
    profile: number;
    gpa: number;
    units: number;
    pathway: number;
    guidebook: number;
    progress: number;
    totalUnits: number;
  };
}

export function isAuthBypass(): boolean {
  return import.meta.env.VITE_AUTH_BYPASS === "true";
}

export function getDevProfiles(): DevStudentProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DevStudentProfile[];
  } catch {
    return [];
  }
}

export function saveDevProfile(
  input: Omit<DevStudentProfile, "id">,
): DevStudentProfile {
  const profile: DevStudentProfile = { id: DEV_PROFILE_ID, ...input };
  const next = getDevProfiles().filter((p) => p.id !== DEV_PROFILE_ID);
  next.push(profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  storeProfileId(DEV_PROFILE_ID);
  return profile;
}

export function getDevDashboardSummary(
  profile: DevStudentProfile,
): DevDashboardSummary {
  const completion = profile.completionPercent ?? 60;
  const gpa = profile.currentGpa ?? 0;
  return {
    profileCompletionPercent: completion,
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    estimatedGpa: gpa > 0 ? gpa : null,
    savedPathwaysCount: 0,
    guidebooksCount: 0,
    topMatchUniversity: null,
    topMatchScore: null,
    chosenTransferSchool: null,
    chosenTransferScore: null,
    nextActions: [
      "Add your completed courses",
      "Explore AI transfer pathways",
      "Review scholarship matches",
    ],
    readinessScore: Math.min(100, Math.round(completion * 0.6 + (gpa > 0 ? 15 : 0))),
    readinessLabel: "Getting started",
    readinessBreakdown: {
      profile: completion,
      gpa: gpa > 0 ? 70 : 20,
      units: 0,
      pathway: 0,
      guidebook: 0,
      progress: 0,
      totalUnits: 0,
    },
  };
}
