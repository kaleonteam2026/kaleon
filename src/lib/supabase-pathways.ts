import { supabase } from "@/lib/supabase";
import { computeGpaSummary } from "@/lib/course-progress";
import type { StoredCourse } from "@/lib/course-progress";

/** Describes the JSON shape inside the pathway report. */
export interface PathwayReportJson {
  type?: string;
  university?: string;
  compatibilityScore?: number;
  whyItFits?: string;
  concerns?: string;
  riskAnalysis?: string;
  gpaTarget?: number;
  requiredUnits?: number;
  courseGaps?: string[];
  coursesAnalyzed?: string[];
  transferTimeline?: string;
  scholarshipOptions?: string[];
  internshipRecommendations?: string[];
  extracurricularRecommendations?: string[];
  campusOpportunities?: Array<{
    name: string;
    type: string;
    description: string;
    admitProfileNote: string;
  }>;
  risks?: string[];
  nextSteps?: string[];
}

/** The client-side Pathway shape used by pathways.tsx. */
export interface Pathway {
  id: number;
  profileId: number;
  universityId?: string;
  compatibilityScore?: number;
  pathwayType?: string;
  reportJson?: PathwayReportJson;
  isSelected?: string; // "true" | "false" (string, matching existing convention)
  generationLabel?: string;
}

/** Row shape from the `pathways` Supabase table. */
interface PathwayRow {
  id: number;
  profile_id: number;
  pathway_type: string;
  compatibility_score: number;
  is_selected: boolean;
  report_json: unknown;
  generation_label: string;
  created_at: string;
}

/** Map a DB row back to the client-side Pathway shape. */
function rowToPathway(row: PathwayRow): Pathway {
  const report = (row.report_json ?? {}) as PathwayReportJson;
  return {
    id: row.id,
    profileId: row.profile_id,
    pathwayType: row.pathway_type,
    compatibilityScore: row.compatibility_score,
    isSelected: row.is_selected ? "true" : "false",
    universityId: report.university,
    reportJson: report,
    generationLabel: row.generation_label,
  };
}

/**
 * Get the next generation label for a profile.
 * Counts existing generations and returns "Pathway N+1".
 */
async function getNextGenerationLabel(profileId: number): Promise<string> {
  const { data, error } = await supabase
    .from("pathways")
    .select("generation_label")
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error counting generations:", error);
    return "Pathway 1";
  }

  const existing = new Set(
    ((data ?? []) as { generation_label: string }[]).map((r) => r.generation_label),
  );

  if (existing.size === 0) return "Pathway 1";

  // Find the highest numbered pathway label
  let maxN = 0;
  for (const label of existing) {
    const match = label.match(/^Pathway (\d+)$/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxN) maxN = n;
    }
  }

  return `Pathway ${maxN + 1}`;
}

/**
 * Save a new generation of pathways. Does NOT delete old generations —
 * every call creates a new numbered "slot" (Pathway 1, Pathway 2, …).
 */
export async function savePathways(
  profileId: number,
  userId: string,
  pathways: Pathway[],
): Promise<void> {
  if (pathways.length === 0) return;

  const label = await getNextGenerationLabel(profileId);

  const rows = pathways.map((p) => ({
    profile_id: profileId,
    pathway_type: p.pathwayType ?? "moderately_compatible",
    compatibility_score: p.compatibilityScore ?? 70,
    is_selected: false,
    generation_label: label,
    report_json: p.reportJson ?? {},
  }));

  const { error: insErr } = await supabase.from("pathways").insert(rows);

  if (insErr) {
    console.error("Error saving pathways:", insErr);
    throw insErr;
  }
}

/**
 * Load all pathways for a profile from the database, ordered by generation.
 */
export async function loadPathwaysFromDb(
  profileId: number,
): Promise<Pathway[]> {
  const { data, error } = await supabase
    .from("pathways")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading pathways:", error);
    return [];
  }

  return ((data ?? []) as PathwayRow[]).map(rowToPathway);
}

/**
 * Get the list of distinct generation labels for a profile, newest first.
 */
export async function getGenerationLabels(
  profileId: number,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("pathways")
    .select("generation_label")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching generation labels:", error);
    return [];
  }

  const seen = new Set<string>();
  const labels: string[] = [];
  for (const row of data as { generation_label: string }[]) {
    if (!seen.has(row.generation_label)) {
      seen.add(row.generation_label);
      labels.push(row.generation_label);
    }
  }
  return labels;
}

/**
 * Mark a pathway as selected (primary) and unselect all others for the profile.
 */
export async function selectPathwayInDb(
  profileId: number,
  pathwayId: number,
): Promise<boolean> {
  const { error: unselErr } = await supabase
    .from("pathways")
    .update({ is_selected: false })
    .eq("profile_id", profileId);

  if (unselErr) {
    console.error("Error unselecting pathways:", unselErr);
    return false;
  }

  const { error: selErr } = await supabase
    .from("pathways")
    .update({ is_selected: true })
    .eq("id", pathwayId)
    .eq("profile_id", profileId);

  if (selErr) {
    console.error("Error selecting pathway:", selErr);
    return false;
  }

  return true;
}

/**
 * Get the currently selected (primary) pathway for a profile.
 */
export async function getSelectedPathway(
  profileId: number,
): Promise<Pathway | null> {
  const { data, error } = await supabase
    .from("pathways")
    .select("*")
    .eq("profile_id", profileId)
    .eq("is_selected", true)
    .limit(1)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching selected pathway:", error);
    }
    return null;
  }

  return rowToPathway(data as PathwayRow);
}

// ── Pathway Snapshots ────────────────────────────────────────────────────

export interface PathwaySnapshot {
  id: number;
  profileId: number;
  generationLabel: string;
  totalUnits: number;
  completedUnits: number;
  inProgressUnits: number;
  courseCount: number;
  gpa: number | null;
  createdAt: string;
}

interface PathwaySnapshotRow {
  id: number;
  profile_id: number;
  generation_label: string;
  total_units: number;
  completed_units: number;
  in_progress_units: number;
  course_count: number;
  gpa: number | null;
  created_at: string;
}

function rowToSnapshot(row: PathwaySnapshotRow): PathwaySnapshot {
  return {
    id: row.id,
    profileId: row.profile_id,
    generationLabel: row.generation_label,
    totalUnits: row.total_units,
    completedUnits: row.completed_units,
    inProgressUnits: row.in_progress_units,
    courseCount: row.course_count,
    gpa: row.gpa,
    createdAt: row.created_at,
  };
}

/**
 * Save a snapshot of the user's course state at the time a pathway generation
 * is saved. This preserves the academic context so the progress page can show
 * what the user's record looked like when each pathway was created.
 */
export async function savePathwaySnapshot(
  profileId: number,
  generationLabel: string,
  courses: StoredCourse[],
): Promise<void> {
  const summary = computeGpaSummary(courses);

  const { error } = await supabase.from("pathway_snapshots").insert({
    profile_id: profileId,
    generation_label: generationLabel,
    total_units: summary.totalUnits,
    completed_units: summary.completedUnits,
    in_progress_units: summary.inProgressUnits,
    course_count: summary.courseCount,
    gpa: summary.estimatedGpa > 0 ? summary.estimatedGpa : null,
  });

  if (error) {
    console.error("Error saving pathway snapshot:", error);
  }
}

/**
 * Load all pathway snapshots for a profile, newest first.
 */
export async function loadPathwaySnapshots(
  profileId: number,
): Promise<PathwaySnapshot[]> {
  const { data, error } = await supabase
    .from("pathway_snapshots")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading pathway snapshots:", error);
    return [];
  }

  return ((data ?? []) as PathwaySnapshotRow[]).map(rowToSnapshot);
}

/**
 * Delete ALL pathways for a profile (every generation).
 * Used when re-uploading a transcript — old pathway data must be wiped.
 */
export async function deleteAllPathwaysForProfile(profileId: number): Promise<boolean> {
  const { error } = await supabase.from("pathways").delete().eq("profile_id", profileId);

  if (error) {
    console.error("Error deleting pathways for profile:", error);
    return false;
  }
  return true;
}

/**
 * Delete ALL pathway snapshots for a profile.
 * Used when re-uploading a transcript — old snapshot data must be wiped.
 */
export async function deleteAllPathwaySnapshotsForProfile(profileId: number): Promise<boolean> {
  const { error } = await supabase.from("pathway_snapshots").delete().eq("profile_id", profileId);

  if (error) {
    console.error("Error deleting pathway snapshots for profile:", error);
    return false;
  }
  return true;
}
