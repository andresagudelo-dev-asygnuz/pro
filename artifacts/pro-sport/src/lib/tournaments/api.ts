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
    | "in_progress"
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

export async function getTournaments(
  supabase: SupabaseClient,
  options: { cursor?: string; limit?: number } = {},
): Promise<{ data: TournamentRow[] | null; error: string | null; nextCursor: string | null }> {
  const limit = options.limit ?? 20;

  let query = supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;

  if (error) return { error: mapDbError(error), data: null, nextCursor: null };

  const rows = (data ?? []) as TournamentRow[];

  if (rows.length > limit) {
    const nextCursor = rows[limit - 1].created_at;
    return { error: null, data: rows.slice(0, limit), nextCursor };
  }

  return { error: null, data: rows, nextCursor: null };
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
  const rows = (data as unknown as RegistrationWithTournament[]) ?? [];
  const tournaments = rows.map((r) => r.tournaments).filter(Boolean) as TournamentRow[];
  return { error: null, data: tournaments };
}

type ApiResult<T> = { data: T | null; error: string | null };

async function transitionTournamentStatus(
  supabase: SupabaseClient,
  id: string,
  from: TournamentRow["status"],
  to: TournamentRow["status"],
  userId: string,
): Promise<ApiResult<TournamentRow>> {
  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", userId)
    .eq("status", from)
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "tournament_transition") };
  if (!data) return { data: null, error: "No se pudo actualizar el torneo. Refrescá la página." };
  return { data: data as TournamentRow, error: null };
}

export async function publishTournament(
  supabase: SupabaseClient, id: string, userId: string,
): Promise<ApiResult<TournamentRow>> {
  return transitionTournamentStatus(supabase, id, "borrador", "abierto_inscripciones", userId);
}

export async function closeRegistrations(
  supabase: SupabaseClient, id: string, userId: string,
): Promise<ApiResult<TournamentRow>> {
  return transitionTournamentStatus(supabase, id, "abierto_inscripciones", "cerrado_inscripciones", userId);
}

export async function startTournament(
  supabase: SupabaseClient, id: string, userId: string,
): Promise<ApiResult<TournamentRow>> {
  return transitionTournamentStatus(supabase, id, "cerrado_inscripciones", "in_progress", userId);
}

export async function finalizeTournament(
  supabase: SupabaseClient, id: string, userId: string,
): Promise<ApiResult<TournamentRow>> {
  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: "finalizado", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", userId)
    .in("status", ["cerrado_inscripciones", "in_progress"])
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "tournament_transition") };
  if (!data) return { data: null, error: "No se pudo actualizar el torneo. Refrescá la página." };
  return { data: data as TournamentRow, error: null };
}
