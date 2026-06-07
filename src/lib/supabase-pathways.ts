import { supabase } from "@/lib/supabase";

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
}

/** Row shape from the `pathways` Supabase table. */
interface PathwayRow {
  id: number;
  profile_id: number;
  pathway_type: string;
  compatibility_score: number;
  is_selected: boolean;
  report_json: unknown;
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
  };
}

/**
 * Delete all existing pathways for a profile, then insert fresh ones.
 * Called after pathway generation completes.
 */
export async function savePathways(
  profileId: number,
  userId: string,
  pathways: Pathway[],
): Promise<void> {
  if (pathways.length === 0) return;

  // Delete existing pathways for this profile
  const { error: delErr } = await supabase
    .from("pathways")
    .delete()
    .eq("profile_id", profileId);

  if (delErr) {
    console.error("Error deleting old pathways:", delErr);
    return;
  }

  // Insert fresh rows
  const rows = pathways.map((p) => ({
    profile_id: profileId,
    pathway_type: p.pathwayType ?? "moderately_compatible",
    compatibility_score: p.compatibilityScore ?? 70,
    is_selected: false,
    report_json: p.reportJson ?? {},
  }));

  const { error: insErr } = await supabase.from("pathways").insert(rows);

  if (insErr) {
    console.error("Error saving pathways:", insErr);
  }
}

/**
 * Load all pathways for a profile from the database.
 * Used on page mount to restore previously generated pathways.
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
 * Mark a pathway as selected (primary) and unselect all others for the profile.
 * The DB unique partial index on is_selected=true enforces one primary per profile.
 */
export async function selectPathwayInDb(
  profileId: number,
  pathwayId: number,
): Promise<boolean> {
  // First, unselect all pathways for this profile
  const { error: unselErr } = await supabase
    .from("pathways")
    .update({ is_selected: false })
    .eq("profile_id", profileId);

  if (unselErr) {
    console.error("Error unselecting pathways:", unselErr);
    return false;
  }

  // Then, select the target pathway
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
 * Returns null if none is selected.
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
      // PGRST116 = no rows returned — not an error
      console.error("Error fetching selected pathway:", error);
    }
    return null;
  }

  return rowToPathway(data as PathwayRow);
}
