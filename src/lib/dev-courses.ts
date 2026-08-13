import { computeGpaSummary, type StoredCourse } from "@/lib/course-progress";
import { DEV_PROFILE_ID } from "@/lib/dev-profile";

const STORAGE_KEY = "kaleon_dev_courses";

function readAll(): Record<string, StoredCourse[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredCourse[]>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, StoredCourse[]>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function key(profileId: number): string {
  return String(profileId);
}

export function getDevCourses(profileId = DEV_PROFILE_ID): StoredCourse[] {
  return readAll()[key(profileId)] ?? [];
}

export function saveDevCourses(profileId: number, courses: StoredCourse[]): void {
  const all = readAll();
  all[key(profileId)] = courses;
  writeAll(all);
}

export function deleteDevCompletedCoursesByCodes(
  profileId: number,
  courseCodes: string[],
): StoredCourse[] {
  const normalized = new Set(
    courseCodes
      .map((code) => code.trim().toUpperCase())
      .filter((code) => code.length > 0),
  );

  if (normalized.size === 0) return getDevCourses(profileId);

  const kept = getDevCourses(profileId).filter((course) => {
    const code = (course.courseCode ?? "").trim().toUpperCase();
    return !(course.status === "completed" && code && normalized.has(code));
  });

  saveDevCourses(profileId, kept);
  return kept;
}

export function appendDevCourses(
  profileId: number,
  incoming: Omit<StoredCourse, "id">[],
): StoredCourse[] {
  const existing = getDevCourses(profileId);
  const seen = new Set(existing.map((c) => c.courseCode ?? c.courseName));
  let nextId = existing.reduce((max, c) => Math.max(max, c.id ?? 0), 0) + 1;
  const added: StoredCourse[] = [];
  for (const course of incoming) {
    const code = course.courseCode ?? course.courseName;
    if (seen.has(code)) continue;
    seen.add(code);
    added.push({ ...course, id: nextId++ });
  }
  const merged = [...existing, ...added];
  saveDevCourses(profileId, merged);
  return merged;
}

export function getDevGpaSummary(profileId: number, profileGpa?: number | null) {
  return computeGpaSummary(getDevCourses(profileId), profileGpa);
}
