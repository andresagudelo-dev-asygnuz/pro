import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getTournamentById, publishTournament, closeRegistrations, finalizeTournament } from "@/lib/tournaments/api";
import { listRegistrations } from "@/lib/tournaments/registrations";
import { generateFixture } from "@/lib/tournaments/fixtures";

export function useTournamentDetail(id: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tournamentQuery = useQuery({
    queryKey: ["tournament", id],
    queryFn: async () => {
      const { data, error } = await getTournamentById(supabase, id);
      if (error) throw new Error(error);
      if (!data) throw new Error("Torneo no encontrado");
      return data;
    },
    enabled: !!id,
  });

  const registrationsQuery = useQuery({
    queryKey: ["tournament", id, "registrations"],
    queryFn: async () => {
      const { data, error } = await listRegistrations(supabase, id);
      if (error) throw new Error(error);
      return data ?? [];
    },
    enabled: !!id,
  });

  const tournament = tournamentQuery.data ?? null;
  const isOwner = !!user && !!tournament && user.id === tournament.owner_id;

  const invalidateTournament = () =>
    queryClient.invalidateQueries({ queryKey: ["tournament", id] });

  const publishMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("No autenticado");
      return publishTournament(supabase, id, user.id);
    },
    onSuccess: invalidateTournament,
  });

  const closeRegsMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("No autenticado");
      return closeRegistrations(supabase, id, user.id);
    },
    onSuccess: invalidateTournament,
  });

  const generateFixtureMutation = useMutation({
    mutationFn: () => {
      if (!tournament) throw new Error("Torneo no disponible");
      return generateFixture(supabase, id, tournament.format);
    },
    onSuccess: invalidateTournament,
  });

  const finalizeMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("No autenticado");
      return finalizeTournament(supabase, id, user.id);
    },
    onSuccess: invalidateTournament,
  });

  const mutationsLoading =
    publishMutation.isPending ||
    closeRegsMutation.isPending ||
    generateFixtureMutation.isPending ||
    finalizeMutation.isPending;

  return {
    tournament,
    registrations: registrationsQuery.data ?? [],
    isLoading: tournamentQuery.isLoading || registrationsQuery.isLoading,
    error: tournamentQuery.error?.message ?? registrationsQuery.error?.message ?? null,
    isOwner,
    mutations: {
      publish: publishMutation.mutate,
      closeRegs: closeRegsMutation.mutate,
      generateFixture: generateFixtureMutation.mutate,
      finalize: finalizeMutation.mutate,
      isLoading: mutationsLoading,
    },
  };
}
