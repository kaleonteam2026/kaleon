/** Total units required for associate degree / graduation progress at CC. */
export const GRADUATION_UNITS = 60;

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
  // Only consider courses with actual earned units. Failed/withdrawn courses
  // (units = 0 or undefined) should not count toward totals or course count.
  const validCourses = courses.filter(
    c => typeof c.units === "number" && c.units > 0
  );
  const completed = validCourses.filter((c) => c.status === "completed");
  const inProgress = validCourses.filter((c) => c.status === "in_progress");
  const completedUnits = completed.reduce((s, c) => s + (c.units ?? 0), 0);
  const inProgressUnits = inProgress.reduce((s, c) => s + (c.units ?? 0), 0);
  return {
    estimatedGpa: profileGpa ?? 0,
    totalUnits: completedUnits + inProgressUnits,
    completedUnits,
    inProgressUnits,
    courseCount: validCourses.length,
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

