import type { ExtractedCourse } from "@/lib/parse-transcript";

export interface FormData {
  fullName: string;
  communityCollege: string;
  intendedMajor: string;
  careerGoal: string;
  transferTimeline: string;
  financialSituation: string;
  isFirstGen: string;
}

export interface PendingTranscript {
  id: string;
  file: File;
  college: string;
}

export interface ScanResult {
  college: string;
  courses: ExtractedCourse[];
  latestGpa: number | null;
  totalUnits: number;
  detectedMajor?: string | null;
}
