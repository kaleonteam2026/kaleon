import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { getPrimaryProfileForUser } from "@/lib/api/profiles";

export function usePrimaryProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["primary-profile", user?.id],
    queryFn: () => {
      if (!user?.id) return null;
      return getPrimaryProfileForUser(user.id);
    },
    enabled: !!user?.id,
  });
}
