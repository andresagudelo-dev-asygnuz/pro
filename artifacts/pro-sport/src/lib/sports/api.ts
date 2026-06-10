import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { Sport } from "@/lib/types/db";

type ApiResult<T> = { data: T | null; error: string | null };

export async function listSports(
  supabase: SupabaseClient,
): Promise<ApiResult<Sport[]>> {
  const { data, error } = await supabase
    .from("sports")
    .select("*")
    .order("name");
  if (error) return { data: null, error: mapDbError(error, "listSports") };
  return { data: (data ?? []) as Sport[], error: null };
}

export async function getSportById(
  supabase: SupabaseClient,
  sportId: string,
): Promise<ApiResult<Sport>> {
  const { data, error } = await supabase
    .from("sports")
    .select("*")
    .eq("id", sportId)
    .maybeSingle();
  if (error) return { data: null, error: mapDbError(error, "getSportById") };
  return { data: data as Sport | null, error: null };
}
