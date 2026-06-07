import { supabase } from "@/lib/supabase";
import { computeGpaSummary, type StoredCourse } from "@/lib/course-progress";
import type { StudentProfile } from "@/types/profile";

/**
 * Convert a raw Supabase row (snake_case) to the client-side StudentProfile (camelCase).
 */
function rowToProfile(row: Record<string, unknown>): StudentProfile {
  return {
    id: row.id as number,
    fullName: (row.full_name as string) ?? undefined,
    communityCollege: (row.community_college as string) ?? undefined,
    intendedMajor: (row.intended_major as string) ?? undefined,
    careerGoal: (row.career_goal as string) ?? undefined,
    currentGpa: row.current_gpa != null ? Number(row.current_gpa) : undefined,
    transferTimeline: (row.transfer_timeline as string) ?? undefined,
    financialSituation: (row.financial_situation as string) ?? undefined,
    isFirstGen: (row.is_first_gen as string) ?? undefined,
    completionPercent: row.completion_percent != null ? Number(row.completion_percent) : undefined,
  };
}

/** Convert a raw Supabase courses row to StoredCourse. */
function rowToCourse(row: Record<string, unknown>): StoredCourse {
  return {
    id: row.id as number,
    courseCode: (row.course_code as string) ?? undefined,
    courseName: row.course_name as string,
    units: row.units != null ? Number(row.units) : undefined,
    grade: (row.grade as string) ?? undefined,
    status: (row.status as string) ?? undefined,
    term: (row.term as string) ?? undefined,
  };
}

/**
 * Fetch the single profile for a given auth user ID.
 * RLS ensures the user can only see their own profile.
 */
export async function getProfileForUser(
  userId: string,
): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    if (error?.code !== "PGRST116") {
      // PGRST116 = "no rows returned" — not an error
      console.error("Error fetching profile:", error);
    }
    return null;
  }

  return rowToProfile(data as Record<string, unknown>);
}

/**
 * Create a new profile for the authenticated user.
 * Returns the created profile, or null on error.
 */
export async function createProfile(
  userId: string,
  data: {
    fullName?: string;
    communityCollege?: string;
    intendedMajor?: string;
    careerGoal?: string;
    currentGpa?: number;
    transferTimeline?: string;
    financialSituation?: string;
    isFirstGen?: string;
    completionPercent?: number;
  },
): Promise<StudentProfile | null> {
  const { data: row, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      full_name: data.fullName ?? null,
      community_college: data.communityCollege ?? null,
      intended_major: data.intendedMajor ?? null,
      career_goal: data.careerGoal ?? null,
      current_gpa: data.currentGpa ?? null,
      transfer_timeline: data.transferTimeline ?? null,
      financial_situation: data.financialSituation ?? null,
      is_first_gen: data.isFirstGen ?? null,
      completion_percent: data.completionPercent ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating profile:", error);
    return null;
  }

  return rowToProfile(row as Record<string, unknown>);
}

/**
 * Update an existing profile.
 */
export async function updateProfile(
  profileId: number,
  data: Partial<{
    fullName: string;
    communityCollege: string;
    intendedMajor: string;
    careerGoal: string;
    currentGpa: number;
    transferTimeline: string;
    financialSituation: string;
    isFirstGen: string;
    completionPercent: number;
  }>,
): Promise<StudentProfile | null> {
  const updates: Record<string, unknown> = {};
  if (data.fullName !== undefined) updates.full_name = data.fullName;
  if (data.communityCollege !== undefined) updates.community_college = data.communityCollege;
  if (data.intendedMajor !== undefined) updates.intended_major = data.intendedMajor;
  if (data.careerGoal !== undefined) updates.career_goal = data.careerGoal;
  if (data.currentGpa !== undefined) updates.current_gpa = data.currentGpa;
  if (data.transferTimeline !== undefined) updates.transfer_timeline = data.transferTimeline;
  if (data.financialSituation !== undefined) updates.financial_situation = data.financialSituation;
  if (data.isFirstGen !== undefined) updates.is_first_gen = data.isFirstGen;
  if (data.completionPercent !== undefined) updates.completion_percent = data.completionPercent;

  const { data: row, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    return null;
  }

  return rowToProfile(row as Record<string, unknown>);
}

/**
 * Fetch all courses for a given profile from the `courses` table.
 */
export async function getCoursesForProfile(
  profileId: number,
): Promise<StoredCourse[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }

  return (data ?? []).map((row) => rowToCourse(row as Record<string, unknown>));
}

/**
 * Deduplicate a list of courses against existing courses for a profile.
 * Returns only courses whose course_code is not already in the database.
 */
export async function deduplicateCourses(
  profileId: number,
  incoming: Array<{
    courseCode?: string;
    courseName: string;
    units?: number;
    grade?: string;
    status?: string;
    term?: string;
  }>,
): Promise<typeof incoming> {
  if (incoming.length === 0) return [];

  // Fetch existing course codes for this profile
  const { data: existing } = await supabase
    .from("courses")
    .select("course_code")
    .eq("profile_id", profileId);

  const existingCodes = new Set(
    (existing ?? [])
      .map((r) => (r as { course_code: string | null }).course_code)
      .filter(Boolean)
      .map((c) => c!.trim().toUpperCase()),
  );

  return incoming.filter((c) => {
    const code = (c.courseCode ?? "").trim().toUpperCase();
    if (!code) return true; // always keep courses without a code
    return !existingCodes.has(code);
  });
}

/**
 * Insert courses for a profile into the `courses` table.
 * Automatically deduplicates against existing courses by course_code.
 * Returns the inserted courses.
 */
export async function insertCourses(
  profileId: number,
  userId: string,
  courses: Array<{
    courseCode?: string;
    courseName: string;
    units?: number;
    grade?: string;
    status?: string;
    term?: string;
  }>,
): Promise<StoredCourse[]> {
  if (courses.length === 0) return [];

  // Deduplicate: skip courses that already exist by course_code
  const unique = await deduplicateCourses(profileId, courses);
  if (unique.length === 0) return [];

  const rows = unique.map((c) => ({
    profile_id: profileId,
    user_id: userId,
    course_code: c.courseCode ?? null,
    course_name: c.courseName,
    units: c.units ?? null,
    grade: c.grade ?? null,
    status: c.status ?? "completed",
    term: c.term ?? null,
  }));

  const { data, error } = await supabase.from("courses").insert(rows).select();

  if (error) {
    console.error("Error inserting courses:", error);
    return [];
  }

  return (data ?? []).map((row) => rowToCourse(row as Record<string, unknown>));
}

/**
 * Delete a single course by ID.
 * RLS ensures the user can only delete their own courses.
 */
export async function deleteCourse(courseId: number): Promise<boolean> {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);

  if (error) {
    console.error("Error deleting course:", error);
    return false;
  }
  return true;
}
