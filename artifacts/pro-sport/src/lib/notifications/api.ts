import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendNotification(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  await supabase.from("notifications").insert({ user_id: userId, type, data });
}
