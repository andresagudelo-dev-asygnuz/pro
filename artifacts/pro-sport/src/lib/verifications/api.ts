import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { AgeVerification } from "@/lib/types/db";

export type VerificationRow = {
  id: string;
  user_id: string;
  status: string;
  storage_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  rejection_reason: string | null;
  profile?: { full_name: string | null; username: string | null } | null;
};

export type VerificationWithUrl = VerificationRow & { signed_url: string | null };

export async function getUserVerification(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: AgeVerification | null; error: string | null }> {
  const { data, error } = await supabase
    .from("age_verifications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { data: null, error: mapDbError(error, "getUserVerification") };
  return { data: data as AgeVerification | null, error: null };
}

export async function submitVerification(
  supabase: SupabaseClient,
  userId: string,
  payload: { storage_path: string; mime_type: string; file_size_bytes: number },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("age_verifications").upsert({
    user_id: userId,
    storage_path: payload.storage_path,
    mime_type: payload.mime_type,
    file_size_bytes: payload.file_size_bytes,
    status: "pendiente",
    uploaded_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return { error: mapDbError(error, "submitVerification") };
  return { error: null };
}

export async function uploadVerificationDocument(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ path: string | null; error: string | null }> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("age-verifications").upload(path, file, { upsert: true });
  if (error) return { path: null, error: "Error al subir el archivo. Intentá de nuevo." };
  return { path, error: null };
}

export async function getPendingVerifications(
  supabase: SupabaseClient,
): Promise<{ data: VerificationRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("age_verifications")
    .select("*, profile:profiles(full_name, username)")
    .eq("status", "pendiente")
    .order("uploaded_at", { ascending: true });
  if (error) return { data: [], error: mapDbError(error, "getPendingVerifications") };
  return { data: (data ?? []) as VerificationRow[], error: null };
}

export async function createSignedVerificationUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from("age-verifications")
    .createSignedUrl(storagePath, expiresInSeconds);
  return data?.signedUrl ?? null;
}

export async function reviewVerification(
  supabase: SupabaseClient,
  verificationId: string,
  decision: "aprobada" | "rechazada",
  rejectionReason?: string,
): Promise<{ error: string | null }> {
  const update: Record<string, unknown> = {
    status: decision,
    reviewed_at: new Date().toISOString(),
  };
  if (decision === "rechazada" && rejectionReason) {
    update.rejection_reason = rejectionReason;
  }
  const { error } = await supabase
    .from("age_verifications")
    .update(update)
    .eq("id", verificationId);
  if (error) return { error: mapDbError(error, "reviewVerification") };
  return { error: null };
}
