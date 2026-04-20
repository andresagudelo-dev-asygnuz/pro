"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  AGE_VERIFICATION_ALLOWED_MIME,
  verifyAgeFileSchema,
  zFieldErrors,
} from "@/lib/validation/schemas";

export type VerifyAgeState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /**
   * Timestamp (ms) de la última respuesta exitosa. Le sirve al client para
   * detectar uploads consecutivos aunque `message` sea idéntico y así
   * poder resetear el form en cada éxito.
   */
  uploadedAt?: number;
};

const BUCKET = "age-verifications";

/**
 * Rate limit suave para el upload de verificación: 3 intentos por usuario
 * cada 10 minutos. Sube el piso contra abuso del bucket sin bloquear el
 * reintento legítimo tras un rechazo.
 */
const UPLOAD_RATE_LIMIT = {
  max: 3,
  windowSeconds: 10 * 60,
} as const;

/**
 * Server Action — HU-002 / RF-007.
 *
 * 1. Verifica sesión + rate-limit.
 * 2. Valida el File (mime + size) con Zod antes de tocar nada.
 * 3. Sube el archivo al bucket privado `age-verifications` usando
 *    service_role (las policies sólo permiten service_role; ver migración
 *    `20260417130000`). Nombre: `<user_id>/<timestamp>_<rand>.<ext>`.
 * 4. Inserta fila en `public.age_verifications` con status `pendiente`
 *    (insertada desde la sesión del usuario; las RLS lo permiten porque
 *    `auth.uid() = user_id and status = 'pendiente'`).
 * 5. Revalida `/verificacion` para que la UI muestre el nuevo estado.
 *
 * Si algo falla tras el upload exitoso, intenta limpiar el objeto para no
 * dejar basura en el bucket (mejor intento; si el cleanup falla, quedará
 * huérfano pero nunca accesible fuera del admin).
 */
export async function uploadAgeVerification(
  _prev: VerifyAgeState,
  formData: FormData,
): Promise<VerifyAgeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Tu sesión expiró. Volvé a iniciar sesión." };
  }

  const rl = await checkRateLimit(supabase, {
    key: `age_verification:${user.id}`,
    ...UPLOAD_RATE_LIMIT,
  });
  if (!rl.ok) return { error: rl.error };

  const rawFile = formData.get("document");
  if (!(rawFile instanceof File) || rawFile.size === 0) {
    return {
      error: "Elegí un archivo para subir.",
      fieldErrors: { document: "Archivo requerido." },
    };
  }

  const parsed = verifyAgeFileSchema.safeParse({
    mime_type: rawFile.type,
    file_size_bytes: rawFile.size,
  });
  if (!parsed.success) {
    return {
      error: "Revisá el archivo.",
      fieldErrors: zFieldErrors(parsed) ?? undefined,
    };
  }
  const { mime_type, file_size_bytes } = parsed.data;

  const admin = getServiceRoleClient();
  if (!admin) {
    // Error de configuración, no del usuario. Log y fallback UX.
     
    console.error(
      "[uploadAgeVerification] SUPABASE_SERVICE_ROLE_KEY no configurada.",
    );
    return {
      error:
        "No podemos procesar tu documento en este momento. Probá de nuevo en unos minutos.",
    };
  }

  const ext = extensionForMime(mime_type);
  const rand = cryptoRandomHex(8);
  const ts = Date.now();
  const storagePath = `${user.id}/${ts}_${rand}.${ext}`;

  const buffer = Buffer.from(await rawFile.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mime_type,
      upsert: false,
    });
  if (uploadErr) {
     
    console.error("[uploadAgeVerification] upload error", uploadErr);
    return {
      error: "No pudimos subir tu documento. Probá de nuevo.",
    };
  }

  // Insert desde la sesión del usuario: las policies exigen auth.uid() =
  // user_id y status = 'pendiente', así que no podemos insertar "aprobada"
  // por accidente desde acá.
  const { error: insertErr } = await supabase.from("age_verifications").insert({
    user_id: user.id,
    status: "pendiente",
    storage_path: storagePath,
    mime_type,
    file_size_bytes,
    uploaded_at: new Date().toISOString(),
  });

  if (insertErr) {
    // Intento de limpieza — no bloqueante.
    await admin.storage
      .from(BUCKET)
      .remove([storagePath])
      .catch(() => undefined);
     
    console.error("[uploadAgeVerification] insert error", insertErr);
    return {
      error: "No pudimos registrar tu solicitud. Probá de nuevo.",
    };
  }

  // Revalidar el layout completo: el `AgeVerificationBanner` vive en
  // `app/(app)/layout.tsx`, así que todas las rutas de ese grupo (`/feed`,
  // `/matches/*`, etc.) muestran data stale hasta una navegación hard si
  // sólo revalidamos `/verificacion`. Mismo patrón que `signUpWithPassword`
  // y `updateProfile`.
  revalidatePath("/", "layout");
  return {
    message:
      "Documento subido. Lo vamos a revisar y te avisamos por email cuando esté aprobado.",
    uploadedAt: Date.now(),
  };
}

function extensionForMime(mime: (typeof AGE_VERIFICATION_ALLOWED_MIME)[number]) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "application/pdf":
      return "pdf";
  }
}

function cryptoRandomHex(bytes: number) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
