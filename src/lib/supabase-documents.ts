import { supabase } from "@/lib/supabase";

/** Client-side shape for guidebooks and roadmaps. */
export interface Document {
  id: number;
  profileId: number;
  pathwayId?: number;
  title?: string;
  contentMarkdown?: string;
  createdAt?: string;
}

/** Row shape from a Supabase guidebooks/roadmaps table. */
interface DocumentRow {
  id: number;
  profile_id: number;
  pathway_id: number | null;
  title: string | null;
  content_markdown: string;
  created_at: string;
}

function rowToDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    profileId: row.profile_id,
    pathwayId: row.pathway_id ?? undefined,
    title: row.title ?? undefined,
    contentMarkdown: row.content_markdown ?? undefined,
    createdAt: row.created_at,
  };
}

// ─── Guidebooks ─────────────────────────────────────────────────────

export async function saveGuidebook(
  profileId: number,
  title: string,
  contentMarkdown: string,
  pathwayId?: number,
): Promise<{ id: number } | null> {
  const { data, error } = await supabase
    .from("guidebooks")
    .insert({
      profile_id: profileId,
      pathway_id: pathwayId ?? null,
      title,
      content_markdown: contentMarkdown,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error saving guidebook:", error);
    return null;
  }

  return data as { id: number };
}

export async function loadGuidebook(id: number): Promise<Document | null> {
  const { data, error } = await supabase
    .from("guidebooks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error loading guidebook:", error);
    }
    return null;
  }

  return rowToDocument(data as DocumentRow);
}

// ─── Roadmaps ───────────────────────────────────────────────────────

export async function saveRoadmap(
  profileId: number,
  title: string,
  contentMarkdown: string,
  pathwayId?: number,
): Promise<{ id: number } | null> {
  const { data, error } = await supabase
    .from("roadmaps")
    .insert({
      profile_id: profileId,
      pathway_id: pathwayId ?? null,
      title,
      content_markdown: contentMarkdown,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error saving roadmap:", error);
    return null;
  }

  return data as { id: number };
}

export async function loadRoadmap(id: number): Promise<Document | null> {
  const { data, error } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error loading roadmap:", error);
    }
    return null;
  }

  return rowToDocument(data as DocumentRow);
}
