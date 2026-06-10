import type { SupabaseClient } from "@supabase/supabase-js";

type ApiResult<T> = { data: T | null; error: string | null };

export interface WaitlistPayload {
  name: string;
  email: string;
  main_sport: string;
  beta_interest: boolean;
  signals?: Record<string, unknown>;
}

export async function checkWaitlistEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<ApiResult<boolean>> {
  const { data, error } = await supabase
    .from("market_validation_responses")
    .select("id")
    .eq("email", email)
    .single();
  if (error && error.code !== "PGRST116") return { data: null, error: error.message };
  return { data: !!data, error: null };
}

export async function registerToWaitlist(
  supabase: SupabaseClient,
  payload: WaitlistPayload,
): Promise<ApiResult<{ id: string }>> {
  const { data, error } = await supabase
    .from("market_validation_responses")
    .insert([payload])
    .select("id")
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as { id: string }, error: null };
}
