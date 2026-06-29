import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPendingVerifications, createSignedVerificationUrl, reviewVerification, type VerificationWithUrl } from "@/lib/verifications/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function VerificationActions({
  verificationId,
  onReview,
}: {
  verificationId: string;
  onReview: (id: string, decision: "aprobada" | "rechazada", reason?: string) => Promise<void>;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function approve() {
    setSubmitting(true);
    await onReview(verificationId, "aprobada");
    setSubmitting(false);
  }

  async function reject() {
    if (!rejectionReason.trim()) return;
    setSubmitting(true);
    await onReview(verificationId, "rechazada", rejectionReason.trim());
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      {!showReject ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={approve} disabled={submitting}>Aprobar</Button>
          <Button size="sm" variant="destructive" onClick={() => setShowReject(true)}>Rechazar</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full border rounded-md p-2 text-sm bg-background min-h-[80px]"
            placeholder="Motivo del rechazo (mínimo 2 caracteres)…"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={reject} disabled={submitting || rejectionReason.trim().length < 2}>
              {submitting ? "Guardando…" : "Confirmar rechazo"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowReject(false); setRejectionReason(""); }}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminVerificationsPage() {
  const [rows, setRows] = useState<VerificationWithUrl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await getPendingVerifications(supabase);
      const rowsWithUrls = await Promise.all(
        data.map(async (row) => {
          const signed_url = row.storage_path
            ? await createSignedVerificationUrl(supabase, row.storage_path)
            : null;
          return { ...row, signed_url };
        })
      );
      setRows(rowsWithUrls);
      setLoading(false);
    })();
  }, []);

  async function handleReview(verificationId: string, decision: "aprobada" | "rechazada", reason?: string) {
    await reviewVerification(supabase, verificationId, decision, reason);
    setRows((prev) => prev.filter((r) => r.id !== verificationId));
  }

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;

  return (
    <>
    <div className="flex flex-col gap-6 max-w-4xl mx-auto px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Cola de verificaciones</h1>
        <p className="text-sm text-muted-foreground">Documentos subidos por usuarios pendientes de revisión. Las URLs expiran a los 60 minutos.</p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">No hay verificaciones pendientes.</div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => {
            const displayName = row.profile?.full_name ?? row.profile?.username ?? "(sin perfil)";
            const sizeKb = row.file_size_bytes ? `${(row.file_size_bytes / 1024).toFixed(0)} KB` : null;

            return (
              <li key={row.id} className="flex flex-col gap-4 rounded-xl border bg-background p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      user_id: <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{row.user_id}</code>
                    </p>
                  </div>
                  <Badge variant="secondary">Pendiente</Badge>
                </div>

                <dl className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div>
                    <dt className="font-medium text-foreground">Subido</dt>
                    <dd>{row.uploaded_at ? new Date(row.uploaded_at).toLocaleString("es-AR") : "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Formato</dt>
                    <dd>{row.mime_type ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Tamaño</dt>
                    <dd>{sizeKb ?? "—"}</dd>
                  </div>
                </dl>

                {row.signed_url ? (
                  <a href={row.signed_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary underline underline-offset-2">
                    Ver documento ↗
                  </a>
                ) : (
                  <p className="text-xs text-destructive">No se pudo generar URL firmada para el documento.</p>
                )}

                <VerificationActions verificationId={row.id} onReview={handleReview} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
    </>
  );
}
