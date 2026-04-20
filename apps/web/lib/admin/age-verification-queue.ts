import "server-only";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import type { AgeVerificationStatus } from "@/lib/types/db";

export interface QueueRow {
  id: string;
  user_id: string;
  status: AgeVerificationStatus;
  storage_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  created_at: string;
  /** Signed URL corto (ver `SIGNED_URL_TTL_SECONDS`). `null` si falla o el
   *  registro no tiene `storage_path`. */
  signed_url: string | null;
  profile: {
    username: string | null;
    full_name: string | null;
  } | null;
}

/**
 * TTL de las URLs firmadas entregadas al admin para previsualizar documentos.
 * Corto a propósito: el admin abre el enlace, decide y acciona. No queremos
 * que la URL siga viva pegada en un chat ni indexada.
 */
export const SIGNED_URL_TTL_SECONDS = 5 * 60;
const BUCKET = "age-verifications";

/**
 * Lista las verificaciones pendientes ordenadas por antigüedad (FIFO),
 * con un join best-effort contra `profiles` para mostrar `full_name`
 * / `username`. Usa `service_role` (bypass RLS): `age_verifications`
 * sólo es legible por el dueño en cliente autenticado.
 *
 * Devuelve `[]` si el service role no está configurado o si falla la query;
 * la página renderiza un estado vacío/mensaje de config en su lugar.
 */
export async function listPendingVerifications(
  limit = 50,
): Promise<QueueRow[]> {
  const service = getServiceRoleClient();
  if (!service) return [];

  const { data, error } = await service
    .from("age_verifications")
    .select(
      "id,user_id,status,storage_path,mime_type,file_size_bytes,uploaded_at,created_at",
    )
    .eq("status", "pendiente")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) {
    console.error("[listPendingVerifications] select error", error);
    return [];
  }

  const userIds = Array.from(new Set(data.map((r) => r.user_id)));
  const profileMap = new Map<
    string,
    { username: string | null; full_name: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id,username,full_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id as string, {
        username: (p.username as string | null) ?? null,
        full_name: (p.full_name as string | null) ?? null,
      });
    }
  }

  // Firmamos URLs en paralelo.
  const rows = await Promise.all(
    data.map(async (r): Promise<QueueRow> => {
      let signed_url: string | null = null;
      if (r.storage_path) {
        const { data: signed } = await service.storage
          .from(BUCKET)
          .createSignedUrl(r.storage_path as string, SIGNED_URL_TTL_SECONDS);
        signed_url = signed?.signedUrl ?? null;
      }
      return {
        id: r.id as string,
        user_id: r.user_id as string,
        status: r.status as AgeVerificationStatus,
        storage_path: (r.storage_path as string | null) ?? null,
        mime_type: (r.mime_type as string | null) ?? null,
        file_size_bytes: (r.file_size_bytes as number | null) ?? null,
        uploaded_at: (r.uploaded_at as string | null) ?? null,
        created_at: r.created_at as string,
        signed_url,
        profile: profileMap.get(r.user_id as string) ?? null,
      };
    }),
  );

  return rows;
}
