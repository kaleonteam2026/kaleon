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

export interface CalgetcSummary {
  areaA1Oral: boolean;
  areaA2Written: boolean;
  areaA3Critical: boolean;
  areaB1Physical: boolean;
  areaB2Life: boolean;
  areaB3Lab: boolean;
  areaB4Math: boolean;
  areaC1Arts: boolean;
  areaC2Humanities: boolean;
  areaDSocial: boolean;
  areaELifelong: boolean;
  areaFEthnic: boolean;
  completedAreas: string[];
  missingAreas: string[];
}

export interface TransferabilityResult {
  communityCollege: string;
  summary: string;
  bestMatches: UniversityMatch[];
  courseAnalysis: CourseTransferResult[];
  igetcSummary: IgetcSummary;
  calgetcSummary?: CalgetcSummary;
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

export const CSU_GE_AREAS = [
  { key: "areaA1Oral",        labelKey: "pages.courses.csuge_A1" },
  { key: "areaA2Written",     labelKey: "pages.courses.csuge_A2" },
  { key: "areaA3Critical",    labelKey: "pages.courses.csuge_A3" },
  { key: "areaB1Physical",    labelKey: "pages.courses.csuge_B1" },
  { key: "areaB2Life",        labelKey: "pages.courses.csuge_B2" },
  { key: "areaB3Lab",         labelKey: "pages.courses.csuge_B3" },
  { key: "areaB4Math",        labelKey: "pages.courses.csuge_B4" },
  { key: "areaC1Arts",        labelKey: "pages.courses.csuge_C1" },
  { key: "areaC2Humanities",  labelKey: "pages.courses.csuge_C2" },
  { key: "areaDSocial",       labelKey: "pages.courses.csuge_D" },
  { key: "areaELifelong",     labelKey: "pages.courses.csuge_E" },
  { key: "areaFEthnic",       labelKey: "pages.courses.csuge_F" },
] as const;
