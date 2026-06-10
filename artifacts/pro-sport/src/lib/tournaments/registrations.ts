import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";

export type TeamRow = {
  id: string;
  name: string;
  captain_id: string;
  created_at: string;
  updated_at: string;
};

export type TeamMemberRow = {
  team_id: string;
  user_id: string;
  role: "captain" | "player";
  joined_at: string;
};

export type RegistrationRow = {
  id: string;
  tournament_id: string;
  team_id: string | null;
  user_id: string | null;
  status: "confirmada" | "cancelada" | "lista_espera";
  registered_by: string;
  created_at: string;
  updated_at: string;
};

type ApiResult<T> = { error: string | null; data: T | null };

export async function findUnverifiedUsers(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<{ error: string | null; unverified: string[] }> {
  if (userIds.length === 0) return { error: null, unverified: [] };
  const { data, error } = await supabase.rpc("find_unverified_users", {
    p_user_ids: userIds,
  });
  if (error) return { error: mapDbError(error, "find_unverified"), unverified: [] };
  const unverified = Array.isArray(data) ? (data as string[]) : [];
  return { error: null, unverified };
}

export async function createTeam(
  supabase: SupabaseClient,
  input: { name: string; memberUserIds: string[] },
  userId: string,
): Promise<ApiResult<TeamRow>> {
  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name: input.name, captain_id: userId })
    .select()
    .single();

  if (error) return { error: mapDbError(error, "create_team"), data: null };

  const extras = input.memberUserIds.filter((id) => id !== userId);
  if (extras.length > 0) {
    const rows = extras.map((uid) => ({
      team_id: (team as TeamRow).id,
      user_id: uid,
      role: "player" as const,
    }));
    const { error: memErr } = await supabase.from("team_members").insert(rows);
    if (memErr) return { error: mapDbError(memErr, "add_members"), data: null };
  }

  return { error: null, data: team as TeamRow };
}

export async function getMyTeams(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<TeamRow[]>> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("captain_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { error: mapDbError(error, "get_my_teams"), data: null };
  return { error: null, data: (data ?? []) as TeamRow[] };
}

export async function registerTeamToTournament(
  supabase: SupabaseClient,
  input: { tournamentId: string; teamId: string },
  userId: string,
): Promise<ApiResult<RegistrationRow>> {
  const { data: members, error: memErr } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", input.teamId);

  if (memErr) return { error: mapDbError(memErr, "team_members"), data: null };

  const memberIds = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id);
  if (memberIds.length === 0) return { error: "El equipo no tiene miembros.", data: null };

  const { error: verifyErr, unverified } = await findUnverifiedUsers(supabase, memberIds);
  if (verifyErr) return { error: verifyErr, data: null };
  if (unverified.length > 0) {
    return {
      error:
        unverified.length === memberIds.length
          ? "Ningún miembro tiene la verificación de edad aprobada."
          : `Hay ${unverified.length} miembro(s) sin verificación de edad aprobada.`,
      data: null,
    };
  }

  const { data, error } = await supabase
    .from("tournament_registrations")
    .insert({
      tournament_id: input.tournamentId,
      team_id: input.teamId,
      user_id: null,
      status: "confirmada",
      registered_by: userId,
    })
    .select()
    .single();

  if (error) return { error: mapRegistrationError(error), data: null };
  return { error: null, data: data as RegistrationRow };
}

export async function registerSoloToTournament(
  supabase: SupabaseClient,
  input: { tournamentId: string },
  userId: string,
): Promise<ApiResult<RegistrationRow>> {
  const { error: verifyErr, unverified } = await findUnverifiedUsers(supabase, [userId]);
  if (verifyErr) return { error: verifyErr, data: null };
  if (unverified.length > 0) {
    return { error: "Tu verificación de edad no está aprobada todavía.", data: null };
  }

  const { data, error } = await supabase
    .from("tournament_registrations")
    .insert({
      tournament_id: input.tournamentId,
      team_id: null,
      user_id: userId,
      status: "confirmada",
      registered_by: userId,
    })
    .select()
    .single();

  if (error) return { error: mapRegistrationError(error), data: null };
  return { error: null, data: data as RegistrationRow };
}

export async function cancelRegistration(
  supabase: SupabaseClient,
  input: { registrationId: string },
): Promise<ApiResult<RegistrationRow>> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .update({ status: "cancelada" })
    .eq("id", input.registrationId)
    .select()
    .single();

  if (error) return { error: mapDbError(error, "cancel_registration"), data: null };
  return { error: null, data: data as RegistrationRow };
}

export async function listRegistrations(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<ApiResult<RegistrationRow[]>> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (error) return { error: mapDbError(error, "list_registrations"), data: null };
  return { error: null, data: (data ?? []) as RegistrationRow[] };
}

export async function getMyRegistrations(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<RegistrationRow[]>> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("*")
    .eq("registered_by", userId)
    .order("created_at", { ascending: false });

  if (error) return { error: mapDbError(error, "my_registrations"), data: null };
  return { error: null, data: (data ?? []) as RegistrationRow[] };
}

export type RegistrationWithNames = RegistrationRow & {
  team_name: string | null;
  player_name: string | null;
};

export async function listRegistrationsWithNames(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<ApiResult<RegistrationWithNames[]>> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select(`
      id, tournament_id, team_id, user_id, status, registered_by, created_at, updated_at,
      team:teams(id, name),
      profile:profiles(id, full_name, username)
    `)
    .eq("tournament_id", tournamentId)
    .order("created_at");

  if (error) return { data: null, error: mapDbError(error, "regs_with_names") };

  type RawRow = { id: string; tournament_id: string; team_id: string | null; user_id: string | null; status: string; registered_by: string; created_at: string; updated_at: string; team: { name: string } | null; profile: { full_name: string | null; username: string | null } | null };
  const rows: RegistrationWithNames[] = ((data ?? []) as unknown as RawRow[]).map((r) => ({
    id: r.id,
    tournament_id: r.tournament_id,
    team_id: r.team_id,
    user_id: r.user_id,
    status: r.status as RegistrationRow["status"],
    registered_by: r.registered_by,
    created_at: r.created_at,
    updated_at: r.updated_at,
    team_name: r.team?.name ?? null,
    player_name: r.profile?.full_name ?? r.profile?.username ?? null,
  }));
  return { data: rows, error: null };
}

type PgError = { code?: string | null; message?: string | null };

function mapRegistrationError(err: unknown): string {
  const e = err as PgError;
  if (e?.code === "P0001") {
    if (e.message?.includes("tournament_full")) return "El torneo está lleno.";
    if (e.message?.includes("tournament_not_open")) return "El torneo no está abierto a inscripciones.";
  }
  if (e?.code === "P0002") return "El torneo no existe.";
  if (e?.code === "23505") return "Ya existe una inscripción activa para este torneo.";
  return mapDbError(err, "registration_insert");
}
