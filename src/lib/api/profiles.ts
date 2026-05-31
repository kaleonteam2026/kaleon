import { apiFetch } from "@/lib/api/client";
import type { StudentProfile } from "@/types/profile";

export function getProfile(id: number): Promise<StudentProfile> {
  return apiFetch<StudentProfile>(`/api/profiles/${id}`);
}

export function getProfilesForUser(userId: string): Promise<StudentProfile[]> {
  return apiFetch<StudentProfile[]>(`/api/profiles/user/${userId}`);
}

export async function getPrimaryProfileForUser(
  userId: string,
): Promise<StudentProfile | null> {
  const profiles = await getProfilesForUser(userId);
  return profiles.length > 0 ? profiles[0] : null;
}
