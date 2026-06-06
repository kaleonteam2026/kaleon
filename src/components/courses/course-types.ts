export interface Course {
  id?: number;
  courseCode?: string;
  courseName: string;
  units?: number;
  grade?: string;
  status?: string;
  term?: string;
}

export interface GpaSummary {
  estimatedGpa: number;
  totalUnits: number;
  completedUnits: number;
  inProgressUnits: number;
  courseCount: number;
}

export interface CatalogCourse {
  courseCode: string;
  courseName: string;
  units: number;
  description: string;
  category: string;
  igetcArea?: string;
  csuGEArea?: string;
  transferable: boolean;
}

export interface CourseCatalog {
  college: string;
  major: string;
  categories: string[];
  courses: CatalogCourse[];
}

export interface CourseTransferResult {
  courseCode?: string;
  courseName: string;
  units: number;
  status: "transferable" | "likely" | "uncertain" | "unlikely";
  igetcArea?: string;
  csuGEArea?: string;
  assistNote: string;
}

export interface UniversityMatch {
  university: string;
  system: string;
  matchScore: number;
  matchReason: string;
  transferableCount: number;
  totalCourses: number;
}

export interface IgetcSummary {
  area1AEnglish: boolean;
  area1BCriticalThinking: boolean;
  area2Math: boolean;
  area3Arts: boolean;
  area4Social: boolean;
  area5Science: boolean;
  area6Language: boolean;
  completedAreas: string[];
  missingAreas: string[];
}

export interface TransferabilityResult {
  communityCollege: string;
  summary: string;
  bestMatches: UniversityMatch[];
  courseAnalysis: CourseTransferResult[];
  igetcSummary: IgetcSummary;
  totalTransferableUnits: number;
  recommendations: string[];
}

export const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "P", "NP", "W", "IP"];

export const IGETC_AREAS = [
  { key: "area1AEnglish",          labelKey: "pages.courses.igetc_1A" },
  { key: "area1BCriticalThinking", labelKey: "pages.courses.igetc_1B" },
  { key: "area2Math",              labelKey: "pages.courses.igetc_2" },
  { key: "area3Arts",              labelKey: "pages.courses.igetc_3" },
  { key: "area4Social",            labelKey: "pages.courses.igetc_4" },
  { key: "area5Science",           labelKey: "pages.courses.igetc_5" },
  { key: "area6Language",          labelKey: "pages.courses.igetc_6" },
] as const;
