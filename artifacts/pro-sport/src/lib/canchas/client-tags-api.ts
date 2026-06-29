import type { SupabaseClient } from "@supabase/supabase-js";
import type { CanchaClientTag, ClientTagType } from "@/lib/types/db";
import { mapDbError } from "@/lib/errors/map-db-error";

type ApiResult<T> = { data: T | null; error: string | null };

export async function getClientTag(
  supabase: SupabaseClient,
  canchaId: string,
  userId: string,
): Promise<ApiResult<CanchaClientTag>> {
  const { data, error } = await supabase
    .from("cancha_client_tags")
    .select("*")
    .eq("cancha_id", canchaId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { data: null, error: mapDbError(error) };
  return { data: data as CanchaClientTag | null, error: null };
}

export async function setClientTag(
  supabase: SupabaseClient,
  canchaId: string,
  userId: string,
  tag: ClientTagType,
  createdBy: string,
  notes?: string,
): Promise<ApiResult<CanchaClientTag>> {
  const { data, error } = await supabase
    .from("cancha_client_tags")
    .upsert(
      { cancha_id: canchaId, user_id: userId, tag, notes: notes ?? null, created_by: createdBy, updated_at: new Date().toISOString() },
      { onConflict: "cancha_id,user_id" },
    )
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error) };
  return { data: data as CanchaClientTag, error: null };
}

export async function removeClientTag(
  supabase: SupabaseClient,
  canchaId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("cancha_client_tags")
    .delete()
    .eq("cancha_id", canchaId)
    .eq("user_id", userId);
  if (error) return { error: mapDbError(error) };
  return { error: null };
}
