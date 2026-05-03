import { createClient } from "@/lib/supabase/client";
import type { Team, TeamMember, Profile } from "@/lib/types/db";

const supabase = createClient();

export type TeamWithCount = Team & { member_count: number };
export type TeamMemberWithProfile = TeamMember & { profile: Pick<Profile, "id" | "full_name" | "username" | "avatar_url" | "city" | "primary_skill_level"> };
export type TeamWithMembers = Team & { team_members: TeamMemberWithProfile[] };

/** Returns true if the error means the teams table doesn't exist yet (migration pending). */
function isMissingTable(error: any): boolean {
  const msg: string = error?.message ?? error?.details ?? "";
  return (
    msg.includes("schema cache") ||
    msg.includes("relation") ||
    msg.includes("does not exist") ||
    msg.includes("Could not find the table") ||
    error?.code === "PGRST200" ||
    error?.code === "42P01"
  );
}

export async function getMyTeams(userId: string): Promise<TeamWithCount[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, teams(*, team_members(count))")
    .eq("user_id", userId);
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((row: any) => {
    const t = row.teams;
    return { ...t, member_count: t.team_members?.[0]?.count ?? 0 };
  });
}

export async function getPublicTeams(city?: string): Promise<TeamWithCount[]> {
  let q = supabase
    .from("teams")
    .select("*, team_members(count)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(30);
  if (city) q = q.eq("city", city);
  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((t: any) => ({ ...t, member_count: t.team_members?.[0]?.count ?? 0 }));
}

export async function getTeamById(id: string): Promise<TeamWithMembers | null> {
  const { data, error } = await supabase
    .from("teams")
    .select(`*, team_members(role, joined_at, user_id, profile:profiles(id, full_name, username, avatar_url, city, primary_skill_level))`)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return data as TeamWithMembers | null;
}

export class RlsPolicyError extends Error {
  readonly sql: string;
  constructor(sql: string) {
    super("rls_policy_missing");
    this.name = "RlsPolicyError";
    this.sql = sql;
  }
}

const TEAMS_RLS_FIX_SQL = `-- Ejecutá en Supabase → SQL Editor → New query
DROP POLICY IF EXISTS teams_insert ON teams;
CREATE POLICY teams_insert ON teams
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS tm_insert ON team_members;
CREATE POLICY tm_insert ON team_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());`.trim();

// Recursion fix: the teams_select <-> tm_select policies reference each other
const TEAMS_RECURSION_FIX_SQL = `-- Solo 2 líneas — pegá en Supabase → SQL Editor
DROP POLICY IF EXISTS tm_select ON team_members;
CREATE POLICY tm_select ON team_members FOR SELECT USING (true);`.trim();

export async function createTeam(payload: {
  name: string;
  slug: string;
  description: string | null;
  sport_type: string;
  city: string;
  owner_id: string;
  max_members: number;
  is_public: boolean;
}): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .insert({ ...payload, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) {
    if (error.code === "42P17" || error.message?.includes("infinite recursion"))
      throw new RlsPolicyError(TEAMS_RECURSION_FIX_SQL);
    const isRls =
      error.message?.includes("row-level security") ||
      error.code === "42501" ||
      error.code === "PGRST301";
    if (isRls) throw new RlsPolicyError(TEAMS_RLS_FIX_SQL);
    throw error;
  }
  const { error: memberErr } = await supabase
    .from("team_members")
    .insert({ team_id: data.id, user_id: payload.owner_id, role: "owner" });
  if (memberErr) {
    if (memberErr.code === "42P17" || memberErr.message?.includes("infinite recursion"))
      throw new RlsPolicyError(TEAMS_RECURSION_FIX_SQL);
    const isRls =
      memberErr.message?.includes("row-level security") ||
      memberErr.code === "42501" ||
      memberErr.code === "PGRST301";
    if (isRls) throw new RlsPolicyError(TEAMS_RLS_FIX_SQL);
    throw memberErr;
  }
  return data as Team;
}

export async function joinTeam(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: userId, role: "player" });
  if (error) throw error;
}

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw error;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
