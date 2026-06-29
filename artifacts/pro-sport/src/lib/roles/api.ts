import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";

export type UserRoleUpdate = Partial<{
  is_player: boolean;
  is_promoter: boolean;
  is_cancha: boolean;
}>;

export async function updateUserRole(
  supabase: SupabaseClient,
  userId: string,
  updates: UserRoleUpdate,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("user_roles")
    .update(updates)
    .eq("user_id", userId);
  if (error) return { error: mapDbError(error, "updateUserRole") };
  return { error: null };
}
