"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/admin";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import {
  formDataToObject,
  reviewVerificationSchema,
  zFieldErrors,
} from "@/lib/validation/schemas";

export type ReviewVerificationState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Timestamp (ms) de la última respuesta exitosa. Usado por el client para
   *  cerrar el diálogo de rechazo y limpiar el textarea. */
  reviewedAt?: number;
};

/**
 * Server Action — HU-002 §6 / PR D Sprint 1.
 *
 * Aprobar o rechazar una verificación de edad (`age_verifications`).
 *
 * Seguridad:
 *   1. `getAdminUser()` gatea por whitelist `ADMIN_EMAILS`. Un no-admin recibe
 *      error UX (no revelamos la existencia del action).
 *   2. El update pasa por `service_role` porque la policy
 *      `age_verifications_update_blocked` prohíbe updates desde el cliente
 *      autenticado (MVP: no hay rol admin en DB; ver migración
 *      `20260417130000`).
 *   3. El `check age_verifications_reviewed_requires_reviewer` exige que al
 *      pasar a `aprobada` / `rechazada` se seteen `reviewed_at` y
 *      `reviewed_by` — lo hacemos siempre en el mismo update.
 *   4. Sólo filas actualmente en `pendiente` son elegibles para evitar
 *      race conditions entre admins (whoever updates first wins; el segundo
 *      recibe "no hay cambios").
 */
export async function reviewVerification(
  _prev: ReviewVerificationState,
  formData: FormData,
): Promise<ReviewVerificationState> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Acción no permitida." };
  }

  const parsed = reviewVerificationSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: zFieldErrors(parsed) ?? undefined,
    };
  }
  const { verification_id, decision, rejection_reason } = parsed.data;

  const service = getServiceRoleClient();
  if (!service) {
    console.error(
      "[reviewVerification] SUPABASE_SERVICE_ROLE_KEY no configurada.",
    );
    return {
      error:
        "No podemos procesar la revisión en este momento. Probá de nuevo en unos minutos.",
    };
  }

  const nowIso = new Date().toISOString();
  const updatePayload =
    decision === "aprobada"
      ? {
          status: "aprobada" as const,
          reviewed_at: nowIso,
          reviewed_by: admin.id,
          rejection_reason: null as string | null,
          review_notes: null as string | null,
        }
      : {
          status: "rechazada" as const,
          reviewed_at: nowIso,
          reviewed_by: admin.id,
          rejection_reason,
          review_notes: null as string | null,
        };

  const { data, error } = await service
    .from("age_verifications")
    .update(updatePayload)
    .eq("id", verification_id)
    .eq("status", "pendiente")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[reviewVerification] update error", error);
    return {
      error:
        "No pudimos guardar la decisión. Verificá que la fila siga pendiente y probá de nuevo.",
    };
  }

  if (!data) {
    return {
      error:
        "La verificación ya fue revisada por otro admin o cambió de estado.",
    };
  }

  // Invalidamos la lista admin + el layout `(app)` completo (el banner del
  // usuario afectado queda stale hasta que revisite la app; en PRO futura
  // emitimos evento realtime). Mismo patrón que `uploadAgeVerification`.
  revalidatePath("/admin/verificaciones");
  revalidatePath("/", "layout");

  return {
    message:
      decision === "aprobada"
        ? "Verificación aprobada."
        : "Verificación rechazada. El usuario verá el motivo al revisar su estado.",
    reviewedAt: Date.now(),
  };
}
