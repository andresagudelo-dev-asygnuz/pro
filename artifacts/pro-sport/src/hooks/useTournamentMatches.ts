import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { listMatchesWithNames, listStandings, recordResult } from "@/lib/tournaments/matches";
import type { MatchStatus } from "@/lib/tournaments/matches";

export function useTournamentMatches(tournamentId: string) {
  const queryClient = useQueryClient();

  const matchesQuery = useQuery({
    queryKey: ["tournament", tournamentId, "matches"],
    queryFn: async () => {
      const { data, error } = await listMatchesWithNames(supabase, tournamentId);
      if (error) throw new Error(error);
      return data ?? [];
    },
    enabled: !!tournamentId,
  });

  const standingsQuery = useQuery({
    queryKey: ["tournament", tournamentId, "standings"],
    queryFn: async () => {
      const { data, error } = await listStandings(supabase, tournamentId);
      if (error) throw new Error(error);
      return data ?? [];
    },
    enabled: !!tournamentId,
  });

  const recordResultMutation = useMutation({
    mutationFn: ({
      matchId,
      homeScore,
      awayScore,
      status,
    }: {
      matchId: string;
      homeScore: number;
      awayScore: number;
      status: MatchStatus;
    }) => recordResult(supabase, { matchId, homeScore, awayScore, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId, "matches"] });
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId, "standings"] });
    },
  });

  return {
    matches: matchesQuery.data ?? [],
    standings: standingsQuery.data ?? [],
    isLoading: matchesQuery.isLoading || standingsQuery.isLoading,
    error: matchesQuery.error?.message ?? standingsQuery.error?.message ?? null,
    recordResult: recordResultMutation.mutate,
    isRecording: recordResultMutation.isPending,
  };
}
