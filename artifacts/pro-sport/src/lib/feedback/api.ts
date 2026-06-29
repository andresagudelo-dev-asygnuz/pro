import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";

export async function submitFeedback(
  supabase: SupabaseClient,
  answers: Record<string, string>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("feedback").insert({
    answers,
    submitted_at: new Date().toISOString(),
  });
  if (error) return { error: mapDbError(error, "submitFeedback") };
  return { error: null };
}
