import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { createMatch, updateMatch } from "@/lib/matches/api";
import { useAuth } from "@/context/AuthContext";
import type { Match } from "@/lib/types/db";

const schema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres."),
  sport_id: z.string().min(1, "Seleccioná un deporte."),
  city: z.string().min(1, "Seleccioná la ciudad."),
  location: z.string().optional().default(""),
  dateStr: z.string().min(1, "Indicá la fecha del partido."),
  timeStr: z.string().min(1, "Indicá la hora del partido."),
  duration_minutes: z.number().min(15, "Duración mínima 15 min."),
  max_players: z.number().min(2, "Mínimo 2 jugadores."),
  skill_level: z.string().optional().default("any"),
  description: z.string().optional().default(""),
  is_public: z.boolean().default(true),
  cancha_booking_id: z.string().nullable().optional(),
});

export type MatchFormValues = z.infer<typeof schema>;

interface UseMatchFormOptions {
  mode: "create" | "edit";
  matchId?: string;
}

function isoToLocalDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoToLocalTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function useMatchForm({ mode, matchId }: UseMatchFormOptions) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Load existing match for edit mode
  const { data: match, isLoading: loadingMatch } = useQuery<Match | null>({
    queryKey: ["match", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { data } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
      return data as Match | null;
    },
    enabled: mode === "edit" && !!matchId,
  });

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      sport_id: "",
      city: "",
      location: "",
      dateStr: new Date().toISOString().slice(0, 10),
      timeStr: "09:00",
      duration_minutes: 60,
      max_players: 10,
      skill_level: "any",
      description: "",
      is_public: true,
      cancha_booking_id: null,
    },
  });

  // Pre-populate form once match data loads (edit mode)
  const { reset } = form;
  if (mode === "edit" && match && !loadingMatch) {
    const currentValues = form.getValues();
    // Only reset if title is still the default (i.e., not yet populated)
    if (currentValues.title === "" && match.title) {
      reset({
        title: match.title,
        sport_id: match.sport_id,
        city: match.city,
        location: match.location ?? "",
        dateStr: isoToLocalDate(match.starts_at),
        timeStr: isoToLocalTime(match.starts_at),
        duration_minutes: match.duration_minutes,
        max_players: match.max_players,
        skill_level: match.skill_level ?? "any",
        description: match.description ?? "",
        is_public: match.is_public,
        cancha_booking_id: match.cancha_booking_id,
      });
    }
  }

  const createMutation = useMutation({
    mutationFn: async (values: MatchFormValues) => {
      if (!user) throw new Error("No autenticado");
      const startsAt = new Date(`${values.dateStr}T${values.timeStr}:00`).toISOString();
      const { data, error } = await createMatch(
        supabase,
        {
          title: values.title.trim(),
          sport_id: values.sport_id,
          city: values.city,
          location: values.location?.trim() || "",
          starts_at: startsAt,
          duration_minutes: values.duration_minutes,
          max_players: values.max_players,
          description: values.description?.trim() || undefined,
          skill_level: values.skill_level && values.skill_level !== "any" ? values.skill_level : undefined,
          cancha_booking_id: values.cancha_booking_id ?? null,
        },
        user.id,
      );
      if (error) throw new Error(error);
      return data!.id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("¡Partido creado!");
      setLocation(`/matches/${id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al crear el partido.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: MatchFormValues) => {
      if (!matchId) throw new Error("matchId requerido");
      const startsAt = new Date(`${values.dateStr}T${values.timeStr}:00`).toISOString();
      const { error } = await updateMatch(supabase, matchId, {
        title: values.title.trim(),
        sport_id: values.sport_id,
        city: values.city,
        location: values.location?.trim() || "",
        starts_at: startsAt,
        duration_minutes: values.duration_minutes,
        max_players: values.max_players,
        description: values.description?.trim() || undefined,
        skill_level: values.skill_level && values.skill_level !== "any" ? values.skill_level : undefined,
        cancha_booking_id: values.cancha_booking_id ?? null,
      });
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("¡Partido actualizado!");
      setLocation(`/matches/${matchId}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al actualizar el partido.");
    },
  });

  const activeMutation = mode === "create" ? createMutation : updateMutation;

  const onSubmit = form.handleSubmit((values) => {
    activeMutation.mutate(values);
  });

  return {
    form,
    onSubmit,
    isLoading: activeMutation.isPending || (mode === "edit" && loadingMatch),
    error: activeMutation.error ? (activeMutation.error as Error).message : null,
    match: mode === "edit" ? match : null,
    loadingMatch,
  };
}
