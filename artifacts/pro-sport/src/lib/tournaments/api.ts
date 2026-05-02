import { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";

export type TournamentRow = {
  id: string;
  owner_id: string;
  name: string;
  format: "liga" | "eliminatoria" | "fase_grupos_eliminatoria";
  slots: number;
  slots_filled: number;
  location: string;
  start_date: string;
  end_date: string;
  status:
    | "borrador"
    | "abierto_inscripciones"
    | "cerrado_inscripciones"
    | "cancelado"
    | "finalizado";
  categories: unknown;
  created_at: string;
  updated_at: string;
};

type TournamentCreateInput = {
  name: string;
  format: "liga" | "eliminatoria" | "fase_grupos_eliminatoria";
  slots: number;
  location: string;
  startDate: string;
  endDate: string;
  status: TournamentRow["status"];
  categories: unknown[];
};

export async function createTournament(
  supabase: SupabaseClient,
  data: TournamentCreateInput,
  userId: string,
) {
  const { data: result, error } = await supabase
    .from("tournaments")
    .insert({
      owner_id: userId,
      name: data.name,
      format: data.format,
      slots: data.slots,
      location: data.location,
      start_date: data.startDate,
      end_date: data.endDate,
      status: data.status,
      categories: data.categories,
    })
    .select()
    .single();

  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: result };
}

export async function getTournamentById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data };
}

export async function getTournaments(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data };
}

export async function getMyTournaments(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data };
}

export type RegistrationWithTournament = {
  id: string;
  status: string;
  tournament_id: string;
  tournaments: TournamentRow;
};

export async function getRegisteredTournaments(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("id, status, tournament_id, tournaments(*)")
    .eq("user_id", userId)
    .neq("status", "cancelada")
    .order("created_at", { ascending: false });

  if (error) return { error: mapDbError(error), data: null };
  const rows = (data ?? []) as RegistrationWithTournament[];
  const tournaments = rows.map((r) => r.tournaments).filter(Boolean) as TournamentRow[];
  return { error: null, data: tournaments };
}

export async function publishTournament(supabase: SupabaseClient, id: string, userId: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: "abierto_inscripciones" })
    .eq("id", id)
    .eq("owner_id", userId)
    .eq("status", "borrador")
    .select()
    .single();

  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data };
}
