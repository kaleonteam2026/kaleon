export interface StudentProfile {
  id: number;
  fullName?: string;
  communityCollege?: string;
  intendedMajor?: string;
  careerGoal?: string;
  currentGpa?: number;
  transferTimeline?: string;
  financialSituation?: string;
  geographicPreference?: string;
  longTermAspirations?: string;
  isFirstGen?: string;
  interests?: string[];
  completionPercent?: number;
}

export interface ProfileFormData {
  id?: number;
  fullName: string;
  communityCollege: string;
  currentGpa: string;
  intendedMajor: string;
  careerGoal: string;
  financialSituation: string;
  transferTimeline: string;
  geographicPreference: string;
  longTermAspirations: string;
  isFirstGen: string;
  interests: string;
}

export interface ProfileSummary {
  fullName: string | null;
  communityCollege: string | null;
  intendedMajor: string | null;
  currentGpa: number | null;
}

export interface ReadinessBreakdown {
  profile: number;
  gpa: number;
  units: number;
  pathway: number;
  guidebook: number;
  progress: number;
  totalUnits: number;
}

export interface DashboardSummary {
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
  readinessBreakdown: ReadinessBreakdown;
}
