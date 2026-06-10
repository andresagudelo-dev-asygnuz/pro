import type { SupabaseClient } from "@supabase/supabase-js";

type StorageResult = { url: string | null; error: string | null };

export async function uploadFile(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean; contentType?: string },
): Promise<StorageResult> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: options?.upsert ?? true, contentType: options?.contentType });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function getPublicUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<string> {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error: error ? error.message : null };
}
