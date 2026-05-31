import { useParams } from "wouter";
import { getStoredProfileId } from "@/lib/profile-storage";

export function useProfileId(paramName = "profileId"): number | null {
  const params = useParams<Record<string, string>>();
  const raw = params[paramName];
  if (raw) {
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return getStoredProfileId();
}
