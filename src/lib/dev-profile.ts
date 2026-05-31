import { graduationProgressPercent } from "@/lib/course-progress";
import { getDevCourses } from "@/lib/dev-courses";
import { storeProfileId } from "@/lib/profile-storage";
import type { DashboardSummary, StudentProfile } from "@/types/profile";

export const DEV_PROFILE_ID = 1;
const STORAGE_KEY = "kaleon_dev_profiles";

export interface DevStudentProfile extends StudentProfile {
  completionPercent?: number;
}

export type DevDashboardSummary = DashboardSummary;

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
  const courses = getDevCourses(profile.id);
  const completed = courses.filter((c) => c.status === "completed").length;
  const inProgress = courses.filter((c) => c.status === "in_progress").length;
  const totalUnits = courses.reduce((sum, c) => sum + (c.units ?? 0), 0);
  const unitsPct = Math.round(graduationProgressPercent(totalUnits));

  return {
    profileCompletionPercent: completion,
    totalCourses: courses.length,
    completedCourses: completed,
    inProgressCourses: inProgress,
    estimatedGpa: gpa > 0 ? gpa : null,
    savedPathwaysCount: 0,
    guidebooksCount: 0,
    topMatchUniversity: null,
    topMatchScore: null,
    chosenTransferSchool: null,
    chosenTransferScore: null,
    nextActions: courses.length > 0
      ? ["Review your pathway course gaps", "Explore AI transfer pathways"]
      : ["Add your completed courses", "Explore AI transfer pathways", "Review scholarship matches"],
    readinessScore: Math.min(100, Math.round(unitsPct * 0.4 + completion * 0.3 + (gpa > 0 ? gpa * 7 : 0))),
    readinessLabel: "Getting started",
    readinessBreakdown: {
      profile: completion,
      gpa: gpa > 0 ? Math.round(gpa * 20) : 20,
      units: unitsPct,
      pathway: 0,
      guidebook: 0,
      progress: courses.length > 0 ? Math.round((completed / courses.length) * 100) : 0,
      totalUnits,
    },
  };
}
