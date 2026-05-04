import type { SupabaseClient } from "@supabase/supabase-js";

type ApiResult<T> = { error: string | null; data: T | null };

export type AdminRole = "admin" | "staff";

export interface AdminPermissions {
  can_confirm:  boolean;
  can_schedule: boolean;
  can_stats:    boolean;
  can_clients:  boolean;
}

export interface CanchaAdmin {
  id: string;
  cancha_id: string;
  user_id: string;
  role: AdminRole;
  can_confirm: boolean;
  can_schedule: boolean;
  can_stats: boolean;
  can_clients: boolean;
  invited_by: string | null;
  status: "active" | "suspended";
  created_at: string;
  profile: {
    full_name:  string | null;
    username:   string | null;
    avatar_url: string | null;
    city:       string | null;
  } | null;
}

export interface UserSearchResult {
  id: string;
  full_name:  string | null;
  username:   string | null;
  avatar_url: string | null;
  city:       string | null;
}

export interface AdminCanchaEntry {
  cancha_id:    string;
  role:         AdminRole;
  can_confirm:  boolean;
  can_schedule: boolean;
  can_stats:    boolean;
  can_clients:  boolean;
}

export const DEFAULT_PERMS: Record<AdminRole, AdminPermissions> = {
  admin: { can_confirm: true, can_schedule: true,  can_stats: true, can_clients: true  },
  staff: { can_confirm: true, can_schedule: false, can_stats: true, can_clients: false },
};

export async function getCanchaAdmins(
  supabase: SupabaseClient,
  canchaId: string,
): Promise<ApiResult<CanchaAdmin[]>> {
  const { data, error } = await supabase
    .from("cancha_admins")
    .select("*, profiles(full_name, username, avatar_url, city)")
    .eq("cancha_id", canchaId)
    .eq("status", "active")
    .order("created_at");
  if (error) return { error: error.message, data: null };
  return {
    error: null,
    data: (data ?? []).map((r: any) => ({ ...r, profile: r.profiles ?? null })) as CanchaAdmin[],
  };
}

export async function addCanchaAdmin(
  supabase: SupabaseClient,
  canchaId: string,
  userId: string,
  role: AdminRole,
  permissions: AdminPermissions,
  invitedBy: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("cancha_admins")
    .upsert(
      { cancha_id: canchaId, user_id: userId, role, ...permissions, invited_by: invitedBy, status: "active" },
      { onConflict: "cancha_id,user_id" },
    );
  if (error) return { error: error.message, data: null };
  return { error: null, data: null };
}

export async function removeCanchaAdmin(
  supabase: SupabaseClient,
  canchaId: string,
  userId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("cancha_admins")
    .delete()
    .eq("cancha_id", canchaId)
    .eq("user_id", userId);
  if (error) return { error: error.message, data: null };
  return { error: null, data: null };
}

export async function getAdminCanchas(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<AdminCanchaEntry[]>> {
  const { data, error } = await supabase
    .from("cancha_admins")
    .select("cancha_id, role, can_confirm, can_schedule, can_stats, can_clients")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) return { error: error.message, data: null };
  return { error: null, data: (data ?? []) as AdminCanchaEntry[] };
}

export async function getCanchaAccessRole(
  supabase: SupabaseClient,
  userId: string,
  canchaId: string,
): Promise<{ isOwner: boolean; isAdmin: boolean; perms: AdminPermissions | null }> {
  const { data: cancha } = await supabase
    .from("canchas")
    .select("owner_id")
    .eq("id", canchaId)
    .single();

  if (cancha?.owner_id === userId) {
    return { isOwner: true, isAdmin: false, perms: { can_confirm: true, can_schedule: true, can_stats: true, can_clients: true } };
  }

  const { data: adminEntry } = await supabase
    .from("cancha_admins")
    .select("can_confirm, can_schedule, can_stats, can_clients")
    .eq("cancha_id", canchaId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (adminEntry) {
    return {
      isOwner: false,
      isAdmin: true,
      perms: {
        can_confirm:  adminEntry.can_confirm,
        can_schedule: adminEntry.can_schedule,
        can_stats:    adminEntry.can_stats,
        can_clients:  adminEntry.can_clients,
      },
    };
  }

  return { isOwner: false, isAdmin: false, perms: null };
}

export async function searchProfiles(
  supabase: SupabaseClient,
  query: string,
): Promise<ApiResult<UserSearchResult[]>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, city")
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10);
  if (error) return { error: error.message, data: null };
  return { error: null, data: (data ?? []) as UserSearchResult[] };
}
