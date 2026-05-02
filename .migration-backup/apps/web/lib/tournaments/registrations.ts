import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "../errors/map-db-error";
import {
  teamCreateSchema,
  registerTeamSchema,
  registerSoloSchema,
  cancelRegistrationSchema,
  type TeamCreateInput,
  type RegisterTeamInput,
  type RegisterSoloInput,
  type CancelRegistrationInput,
} from "../validation/schemas";

/**
 * HU-005 / RF-004 — Inscripción de equipos y jugadores a torneos.
 *
 * Las validaciones de cupos, estado del torneo y no-duplicados viven en la
 * DB (trigger `enforce_tournament_capacity` + UNIQUE parciales). En TS solo
 * hacemos:
 *   - validación de forma (zod),
 *   - verificación de edad (RF-007) de todos los participantes antes de
 *     intentar el insert, para dar mensajes claros en lugar de un error
 *     genérico de RLS/trigger.
 */

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

async function getAuthUserId(
  supabase: SupabaseClient,
): Promise<{ userId: string | null; error: string | null }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { userId: null, error: "No autenticado" };
  return { userId: data.user.id, error: null };
}

/**
 * Verifica que un conjunto de user_ids tienen `age_verifications.status = 'aprobada'`.
 * Retorna los IDs que NO están aprobados (en caso vacío: todos ok).
 *
 * IMPORTANTE: la tabla `age_verifications` tiene RLS `read_self` (solo podés
 * leer tu propia fila). Consultarla directamente desde el browser client
 * ocultaría los registros de los demás miembros del equipo y haría que
 * aparecieran como "no verificados" aunque sí lo estén. Por eso delegamos
 * en la función SQL `public.find_unverified_users(uuid[])` que corre con
 * `SECURITY DEFINER` y bypasea la RLS (mismo patrón que
 * `ensure_verification_aprobada` en la migración Sprint 1).
 */
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

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export async function createTeam(
  supabase: SupabaseClient,
  input: TeamCreateInput,
): Promise<ApiResult<TeamRow>> {
  const parsed = teamCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const { userId, error: authErr } = await getAuthUserId(supabase);
  if (!userId) return { error: authErr, data: null };

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name: parsed.data.name, captain_id: userId })
    .select()
    .single();

  if (error) return { error: mapDbError(error, "create_team"), data: null };

  // Agregar miembros adicionales (si vienen). El trigger ya agregó al capitán.
  const extras = parsed.data.memberUserIds.filter((id) => id !== userId);
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
): Promise<ApiResult<TeamRow[]>> {
  const { userId, error: authErr } = await getAuthUserId(supabase);
  if (!userId) return { error: authErr, data: null };

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("captain_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { error: mapDbError(error, "get_my_teams"), data: null };
  return { error: null, data: (data ?? []) as TeamRow[] };
}

export async function getTeamMembers(
  supabase: SupabaseClient,
  teamId: string,
): Promise<ApiResult<TeamMemberRow[]>> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId);

  if (error) return { error: mapDbError(error, "get_team_members"), data: null };
  return { error: null, data: (data ?? []) as TeamMemberRow[] };
}

// ---------------------------------------------------------------------------
// Registrations
// ---------------------------------------------------------------------------

export async function registerTeamToTournament(
  supabase: SupabaseClient,
  input: RegisterTeamInput,
): Promise<ApiResult<RegistrationRow>> {
  const parsed = registerTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const { userId, error: authErr } = await getAuthUserId(supabase);
  if (!userId) return { error: authErr, data: null };

  // Validación pre-trigger: verificación de edad de todos los miembros.
  const { data: members, error: memErr } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", parsed.data.teamId);

  if (memErr) return { error: mapDbError(memErr, "team_members"), data: null };

  const memberIds = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id);
  if (memberIds.length === 0) {
    return { error: "El equipo no tiene miembros.", data: null };
  }

  const { error: verifyErr, unverified } = await findUnverifiedUsers(
    supabase,
    memberIds,
  );
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
      tournament_id: parsed.data.tournamentId,
      team_id: parsed.data.teamId,
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
  input: RegisterSoloInput,
): Promise<ApiResult<RegistrationRow>> {
  const parsed = registerSoloSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const { userId, error: authErr } = await getAuthUserId(supabase);
  if (!userId) return { error: authErr, data: null };

  const { error: verifyErr, unverified } = await findUnverifiedUsers(supabase, [userId]);
  if (verifyErr) return { error: verifyErr, data: null };
  if (unverified.length > 0) {
    return {
      error: "Tu verificación de edad no está aprobada todavía.",
      data: null,
    };
  }

  const { data, error } = await supabase
    .from("tournament_registrations")
    .insert({
      tournament_id: parsed.data.tournamentId,
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
  input: CancelRegistrationInput,
): Promise<ApiResult<RegistrationRow>> {
  const parsed = cancelRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const { data, error } = await supabase
    .from("tournament_registrations")
    .update({ status: "cancelada" })
    .eq("id", parsed.data.registrationId)
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
): Promise<ApiResult<RegistrationRow[]>> {
  const { userId, error: authErr } = await getAuthUserId(supabase);
  if (!userId) return { error: authErr, data: null };

  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("*")
    .eq("registered_by", userId)
    .order("created_at", { ascending: false });

  if (error) return { error: mapDbError(error, "my_registrations"), data: null };
  return { error: null, data: (data ?? []) as RegistrationRow[] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type PgError = { code?: string | null; message?: string | null };

function mapRegistrationError(err: unknown): string {
  const e = err as PgError;
  if (e?.code === "P0001") {
    if (e.message?.includes("tournament_full")) return "El torneo está lleno.";
    if (e.message?.includes("tournament_not_open"))
      return "El torneo no está abierto a inscripciones.";
  }
  if (e?.code === "P0002") return "El torneo no existe.";
  if (e?.code === "23505") return "Ya existe una inscripción activa para este torneo.";
  return mapDbError(err, "registration_insert");
}
