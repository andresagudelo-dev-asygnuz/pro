import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ENABLED_CITIES } from "@/lib/types/db";
import type { Sport } from "@/lib/types/db";

export function useMatchCatalog() {
  const { data: sports = [], isLoading: loadingSports } = useQuery<Sport[]>({
    queryKey: ["sports"],
    queryFn: async () => {
      const { data } = await supabase.from("sports").select("id, name, icon").order("name");
      return (data ?? []) as Sport[];
    },
    staleTime: 5 * 60 * 1000, // sports don't change often
  });

  return {
    sports,
    cities: ENABLED_CITIES,
    isLoading: loadingSports,
  };
}
