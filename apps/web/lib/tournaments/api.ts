import { SupabaseClient } from "@supabase/supabase-js";
import { tournamentCreateSchema, type Tournament } from "../validation/schemas";
import { mapDbError } from "../errors/map-db-error";

export async function createTournament(
  supabase: SupabaseClient,
  data: Omit<Tournament, "id">
) {
  const parsed = tournamentCreateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const {
    name,
    format,
    slots,
    location,
    startDate,
    endDate,
    status,
    categories,
  } = parsed.data;

  const { data: userAuth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userAuth.user) {
    return { error: "No autenticado", data: null };
  }

  const { data: result, error } = await supabase
    .from("tournaments")
    .insert({
      owner_id: userAuth.user.id,
      name,
      format,
      slots,
      location,
      start_date: startDate,
      end_date: endDate,
      status,
      categories,
    })
    .select()
    .single();

  if (error) return { error: mapDbError(error), data: null };

  return { error: null, data: result };
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
  if (authErr || !userAuth.user) {
    return { error: "No autenticado", data: null };
  }

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
  if (authErr || !userAuth.user) {
    return { error: "No autenticado", data: null };
  }

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
