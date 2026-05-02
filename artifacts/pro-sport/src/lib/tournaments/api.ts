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
) {
  const { data: userAuth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userAuth.user) return { error: "No autenticado", data: null };

  const { data: result, error } = await supabase
    .from("tournaments")
    .insert({
      owner_id: userAuth.user.id,
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

export async function getMyTournaments(supabase: SupabaseClient) {
  const { data: userAuth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userAuth.user) return { error: "No autenticado", data: null };

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("owner_id", userAuth.user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data };
}

export async function publishTournament(supabase: SupabaseClient, id: string) {
  const { data: userAuth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userAuth.user) return { error: "No autenticado", data: null };

  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: "abierto_inscripciones" })
    .eq("id", id)
    .eq("owner_id", userAuth.user.id)
    .eq("status", "borrador")
    .select()
    .single();

  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data };
}
