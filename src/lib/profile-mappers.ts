import type { ProfileFormData } from "@/types/profile";

export function apiProfileToFormData(p: Record<string, unknown>): ProfileFormData {
  return {
    id: p.id as number,
    fullName: (p.fullName as string) ?? "",
    communityCollege: (p.communityCollege as string) ?? "",
    currentGpa: p.currentGpa ? String(p.currentGpa) : "",
    intendedMajor: (p.intendedMajor as string) ?? "",
    careerGoal: (p.careerGoal as string) ?? "",
    financialSituation: (p.financialSituation as string) ?? "",
    transferTimeline: (p.transferTimeline as string) ?? "",
    geographicPreference: (p.geographicPreference as string) ?? "",
    longTermAspirations: (p.longTermAspirations as string) ?? "",
    isFirstGen: (p.isFirstGen as string) ?? "",
    interests: Array.isArray(p.interests) ? (p.interests as string[]).join(", ") : "",
  };
}

export const EMPTY_PROFILE_FORM: ProfileFormData = {
  fullName: "",
  communityCollege: "",
  currentGpa: "",
  intendedMajor: "",
  careerGoal: "",
  financialSituation: "",
  transferTimeline: "",
  geographicPreference: "",
  longTermAspirations: "",
  isFirstGen: "",
  interests: "",
};
