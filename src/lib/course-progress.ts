/** Total units required for associate degree / graduation progress at CC. */
export const GRADUATION_UNITS = 130;

export interface StoredCourse {
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

export function computeGpaSummary(
  courses: StoredCourse[],
  profileGpa?: number | null,
): GpaSummary {
  const completed = courses.filter((c) => c.status === "completed");
  const inProgress = courses.filter((c) => c.status === "in_progress");
  const completedUnits = completed.reduce((s, c) => s + (c.units ?? 0), 0);
  const inProgressUnits = inProgress.reduce((s, c) => s + (c.units ?? 0), 0);
  return {
    estimatedGpa: profileGpa && profileGpa > 0 ? profileGpa : 0,
    totalUnits: completedUnits + inProgressUnits,
    completedUnits,
    inProgressUnits,
    courseCount: courses.length,
  };
}
export function graduationProgressPercent(totalUnits: number): number {
  return Math.min(100, (totalUnits / GRADUATION_UNITS) * 100);
}

export function unitsRemaining(totalUnits: number): number {
  return Math.max(0, GRADUATION_UNITS - totalUnits);
}

/** Progress toward a configurable transfer-unit target (default 60 = UC/CSU minimum). */
export function transferProgressPercent(
  totalUnits: number,
  requiredUnits: number = 60,
): number {
  return Math.min(100, (totalUnits / requiredUnits) * 100);
}

/** Remaining units to reach a configurable transfer-unit target. */
export function transferUnitsRemaining(
  totalUnits: number,
  requiredUnits: number = 60,
): number {
  return Math.max(0, requiredUnits - totalUnits);
}

