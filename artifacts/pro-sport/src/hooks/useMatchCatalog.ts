import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ENABLED_CITIES } from "@/lib/types/db";
import type { Sport } from "@/lib/types/db";
import { listSports } from "@/lib/sports/api";
import { KEYS, STALE } from "@/lib/queryKeys";

export function useMatchCatalog() {
  const { data: sports = [], isLoading: loadingSports } = useQuery<Sport[]>({
    queryKey: KEYS.sports,
    queryFn: async () => {
      const { data } = await listSports(supabase);
      return (data ?? []) as Sport[];
    },
    staleTime: STALE.static,
  });

  return {
    sports,
    cities: ENABLED_CITIES,
    isLoading: loadingSports,
  };
}
