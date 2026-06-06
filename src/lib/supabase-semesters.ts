import { supabase } from "@/lib/supabase";
import type {
  SemesterSnapshot,
  SnapshotCourse,
  CreateSemesterSnapshotPayload,
} from "@/types/semester";

/**
 * Fetch all semester snapshots for a profile, ordered by term (oldest first).
 */
export async function getSemesterSnapshots(
  profileId: number,
): Promise<(SemesterSnapshot & { courses: SnapshotCourse[] })[]> {
  const { data: snapshots, error } = await supabase
    .from("semester_snapshots")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching semester snapshots:", error);
    return [];
  }

  if (!snapshots || snapshots.length === 0) return [];

  // Fetch courses for all snapshots
  const snapshotIds = snapshots.map((s) => s.id);
  const { data: courses, error: coursesError } = await supabase
    .from("snapshot_courses")
    .select("*")
    .in("snapshot_id", snapshotIds);

  if (coursesError) {
    console.error("Error fetching snapshot courses:", coursesError);
    return snapshots.map((s) => ({ ...s, courses: [] }));
  }

  const coursesBySnapshot = new Map<number, SnapshotCourse[]>();
  for (const c of courses ?? []) {
    const list = coursesBySnapshot.get(c.snapshot_id) ?? [];
    list.push(c);
    coursesBySnapshot.set(c.snapshot_id, list);
  }

  return snapshots.map((s) => ({
    ...s,
    courses: coursesBySnapshot.get(s.id) ?? [],
  }));
}

/**
 * Fetch the most recent semester snapshot for a profile.
 */
export async function getLatestSnapshot(
  profileId: number,
): Promise<(SemesterSnapshot & { courses: SnapshotCourse[] }) | null> {
  const snapshots = await getSemesterSnapshots(profileId);
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

/**
 * Create a new semester snapshot with its courses.
 * Returns the created snapshot with courses, or null on error.
 */
export async function createSnapshot(
  data: CreateSemesterSnapshotPayload,
): Promise<(SemesterSnapshot & { courses: SnapshotCourse[] }) | null> {
  const { courses, ...snapshotData } = data;

  // Insert the snapshot header
  const { data: snapshot, error } = await supabase
    .from("semester_snapshots")
    .insert({
      user_id: snapshotData.user_id,
      profile_id: snapshotData.profile_id,
      term_label: snapshotData.term_label,
      college: snapshotData.college,
      term_gpa: snapshotData.term_gpa ?? null,
      cumulative_gpa: snapshotData.cumulative_gpa ?? null,
      term_units: snapshotData.term_units ?? null,
      cumulative_units: snapshotData.cumulative_units ?? null,
      course_count: courses?.length ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating semester snapshot:", error);
    return null;
  }

  // Insert associated courses
  let insertedCourses: SnapshotCourse[] = [];
  if (courses && courses.length > 0) {
    const courseRows = courses.map((c) => ({
      snapshot_id: snapshot.id,
      course_code: c.course_code ?? null,
      course_name: c.course_name,
      units: c.units ?? null,
      grade: c.grade ?? null,
    }));

    const { data: cres, error: cerr } = await supabase
      .from("snapshot_courses")
      .insert(courseRows)
      .select();

    if (cerr) {
      console.error("Error inserting snapshot courses:", cerr);
    } else {
      insertedCourses = cres ?? [];
    }
  }

  return { ...snapshot, courses: insertedCourses };
}

/**
 * Delete a single semester snapshot (courses cascade on DELETE).
 */
export async function deleteSnapshot(id: number): Promise<boolean> {
  const { error } = await supabase
    .from("semester_snapshots")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting semester snapshot:", error);
    return false;
  }
  return true;
}

/**
 * Delete ALL semester snapshots for a profile (used when re-uploading transcript).
 * Courses cascade on DELETE.
 */
export async function deleteAllSnapshots(profileId: number): Promise<boolean> {
  const { error } = await supabase
    .from("semester_snapshots")
    .delete()
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error deleting all semester snapshots:", error);
    return false;
  }
  return true;
}
