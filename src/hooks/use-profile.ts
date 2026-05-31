import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/api/profiles";

export function useProfile(profileId: number | null) {
  return useQuery({
    queryKey: ["profile", profileId],
    queryFn: () => {
      if (profileId == null) throw new Error("No profile id");
      return getProfile(profileId);
    },
    enabled: profileId != null,
  });
}
