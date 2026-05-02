import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import type { AgeVerification, AgeVerificationStatus } from "@/lib/types/db";

const supabase = createClient();

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

function statusCopy(status: AgeVerificationStatus): { label: string; description: string; variant: BadgeVariant } {
  switch (status) {
    case "pendiente":
      return { label: "Pendiente", description: "Tu documento está en revisión. Te avisamos por email cuando se resuelva.", variant: "secondary" };
    case "aprobada":
      return { label: "Aprobada", description: "Tu edad fue verificada. Ya podés inscribirte a torneos.", variant: "default" };
    case "rechazada":
      return { label: "Rechazada", description: "No pudimos aprobar tu documento. Subí uno nuevo con la fecha de nacimiento legible.", variant: "destructive" };
    case "menor_edad":
      return { label: "Menor de edad", description: "Por ahora PRO está abierto sólo a +18.", variant: "destructive" };
  }
}

function shouldShowUploader(av: AgeVerification | null): boolean {
  if (!av) return true;
  return av.status !== "aprobada" && av.status !== "menor_edad";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function VerificationPage() {
  const [, navigate] = useLocation();
  const [av, setAv] = useState<AgeVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate("/login"); return; }

      const { data } = await supabase.from("age_verifications").select("*").eq("user_id", auth.user.id).maybeSingle();
      setAv(data as AgeVerification | null);
      setLoading(false);
    })();
  }, [navigate, uploadSuccess]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) { setUploadError("Formato no permitido. Subí JPG, PNG o PDF."); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError("El archivo supera los 5 MB."); return; }

    setUploading(true);
    setUploadError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setUploadError("No autenticado."); setUploading(false); return; }

    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${auth.user.id}/${Date.now()}.${ext}`;

    const { error: storageErr } = await supabase.storage.from("age-verifications").upload(path, file, { upsert: true });
    if (storageErr) { setUploadError("Error al subir el archivo. Intentá de nuevo."); setUploading(false); return; }

    const { error: dbErr } = await supabase.from("age_verifications").upsert({
      user_id: auth.user.id,
      storage_path: path,
      mime_type: file.type,
      file_size_bytes: file.size,
      status: "pendiente",
      uploaded_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (dbErr) { setUploadError("Error al registrar el documento."); setUploading(false); return; }

    setUploading(false);
    setUploadSuccess((prev) => !prev);
  }

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Verificación de edad</h1>
        <p className="text-sm text-muted-foreground">
          Para inscribirte a torneos necesitamos confirmar que sos +18. Subí una foto nítida de tu documento donde se vea tu fecha de nacimiento.
        </p>
      </header>

      {av ? (
        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Estado actual</p>
            <Badge variant={statusCopy(av.status).variant}>{statusCopy(av.status).label}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{statusCopy(av.status).description}</p>
          {av.status === "rechazada" && av.rejection_reason && (
            <p className="mt-3 rounded-md bg-destructive/10 p-3 text-xs text-destructive">Motivo: {av.rejection_reason}</p>
          )}
          {av.uploaded_at && (
            <p className="mt-3 text-xs text-muted-foreground">Último documento subido: <time dateTime={av.uploaded_at}>{formatDate(av.uploaded_at)}</time>.</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Estado actual</p>
            <Badge variant="outline">Sin verificar</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Todavía no subiste ningún documento.</p>
        </div>
      )}

      {shouldShowUploader(av) && (
        <section className="rounded-xl border bg-background p-5">
          <h2 className="mb-3 text-base font-medium">{av ? "Subir un nuevo documento" : "Subir documento de identidad"}</h2>

          {uploadError && <div className="mb-3 p-3 bg-destructive/15 text-destructive rounded-md text-sm">{uploadError}</div>}
          {uploadSuccess && <div className="mb-3 p-3 bg-green-50 text-green-800 border border-green-200 rounded-md text-sm">Documento subido correctamente. En revisión.</div>}

          <label className="flex flex-col gap-2 cursor-pointer">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <p className="text-sm text-muted-foreground">{uploading ? "Subiendo…" : "Hacé clic para seleccionar un archivo"}</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG o PDF · máx 5 MB</p>
            </div>
            <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>

          <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Tu documento sólo lo ven administradores.</li>
            <li>Nunca se muestra en tu perfil público.</li>
            <li>El archivo se borra automáticamente a los 90 días de aprobación.</li>
          </ul>
        </section>
      )}

      {av?.status === "aprobada" && (
        <div className="flex flex-col gap-2 rounded-xl border bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">Listo. Ya podés completar tu perfil e inscribirte a torneos.</p>
          <Link href="/feed" className="text-sm font-medium text-primary underline underline-offset-2">Ir al feed</Link>
        </div>
      )}
    </div>
  );
}
