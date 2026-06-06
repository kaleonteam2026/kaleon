export interface SemesterSnapshot {
  id: number;
  user_id: string;
  profile_id: number;
  term_label: string;
  college: string;
  term_gpa: number | null;
  cumulative_gpa: number | null;
  term_units: number | null;
  cumulative_units: number | null;
  course_count: number;
  created_at: string;
  updated_at: string;
}

export interface SnapshotCourse {
  id: number;
  snapshot_id: number;
  course_code: string | null;
  course_name: string;
  units: number | null;
  grade: string | null;
}

/** Payload for creating a new semester snapshot (before DB insert). */
export interface CreateSemesterSnapshotPayload {
  user_id: string;
  profile_id: number;
  term_label: string;
  college: string;
  term_gpa?: number | null;
  cumulative_gpa?: number | null;
  term_units?: number | null;
  cumulative_units?: number | null;
  courses?: Omit<SnapshotCourse, "id" | "snapshot_id">[];
}
