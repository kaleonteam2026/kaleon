import {
  db,
  studentProfilesTable,
  pathwaysTable,
  academicRoadmapsTable,
  guidebooksTable,
  coursesTable,
  studentProgressTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export type StudentProfileRow = typeof studentProfilesTable.$inferSelect;

export async function getOwnedProfile(
  profileId: number,
  userId: string,
): Promise<{ ok: true; profile: StudentProfileRow } | { ok: false; status: 403 | 404 }> {
  if (!Number.isFinite(profileId)) return { ok: false, status: 404 };
  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.id, profileId));
  if (!profile) return { ok: false, status: 404 };
  if (profile.userId !== userId) return { ok: false, status: 403 };
  return { ok: true, profile };
}

export async function getOwnedPathway(pathwayId: number, userId: string) {
  if (!Number.isFinite(pathwayId)) return { ok: false as const, status: 404 as const };
  const [pathway] = await db
    .select()
    .from(pathwaysTable)
    .where(eq(pathwaysTable.id, pathwayId));
  if (!pathway) return { ok: false as const, status: 404 as const };
  const owner = await getOwnedProfile(pathway.profileId, userId);
  if (!owner.ok) return { ok: false as const, status: owner.status };
  return { ok: true as const, pathway, profile: owner.profile };
}

export async function getOwnedRoadmap(roadmapId: number, userId: string) {
  if (!Number.isFinite(roadmapId)) return { ok: false as const, status: 404 as const };
  const [roadmap] = await db
    .select()
    .from(academicRoadmapsTable)
    .where(eq(academicRoadmapsTable.id, roadmapId));
  if (!roadmap) return { ok: false as const, status: 404 as const };
  const owner = await getOwnedProfile(roadmap.profileId, userId);
  if (!owner.ok) return { ok: false as const, status: owner.status };
  return { ok: true as const, roadmap };
}

export async function getOwnedGuidebook(guidebookId: number, userId: string) {
  if (!Number.isFinite(guidebookId)) return { ok: false as const, status: 404 as const };
  const [guidebook] = await db
    .select()
    .from(guidebooksTable)
    .where(eq(guidebooksTable.id, guidebookId));
  if (!guidebook) return { ok: false as const, status: 404 as const };
  const owner = await getOwnedProfile(guidebook.profileId, userId);
  if (!owner.ok) return { ok: false as const, status: owner.status };
  return { ok: true as const, guidebook };
}

export async function getOwnedCourse(courseId: number, userId: string) {
  if (!Number.isFinite(courseId)) return { ok: false as const, status: 404 as const };
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, courseId));
  if (!course) return { ok: false as const, status: 404 as const };
  const owner = await getOwnedProfile(course.profileId, userId);
  if (!owner.ok) return { ok: false as const, status: owner.status };
  return { ok: true as const, course };
}

export async function getOwnedProgressEntry(entryId: number, userId: string) {
  if (!Number.isFinite(entryId)) return { ok: false as const, status: 404 as const };
  const [entry] = await db
    .select()
    .from(studentProgressTable)
    .where(eq(studentProgressTable.id, entryId));
  if (!entry) return { ok: false as const, status: 404 as const };
  const owner = await getOwnedProfile(entry.profileId, userId);
  if (!owner.ok) return { ok: false as const, status: owner.status };
  return { ok: true as const, entry };
}

export function ownershipErrorBody(status: 403 | 404, kind = "Profile"): { error: string } {
  if (status === 403) return { error: "Forbidden" };
  return { error: `${kind} not found` };
}
