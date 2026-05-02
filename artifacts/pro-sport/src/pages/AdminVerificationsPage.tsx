import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const supabase = createClient();

type QueueRow = {
  id: string;
  user_id: string;
  status: string;
  storage_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  rejection_reason: string | null;
  signed_url?: string | null;
  profile?: { full_name: string | null; username: string | null } | null;
};

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
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate("/login"); return; }

      const { data } = await supabase
        .from("age_verifications")
        .select("*, profile:profiles(full_name, username)")
        .eq("status", "pendiente")
        .order("uploaded_at", { ascending: true });

      const rowsWithUrls = await Promise.all(
        ((data ?? []) as QueueRow[]).map(async (row) => {
          if (!row.storage_path) return { ...row, signed_url: null };
          const { data: urlData } = await supabase.storage
            .from("age-verifications")
            .createSignedUrl(row.storage_path, 3600);
          return { ...row, signed_url: urlData?.signedUrl ?? null };
        })
      );
      setRows(rowsWithUrls);
      setLoading(false);
    })();
  }, [navigate]);

  async function handleReview(verificationId: string, decision: "aprobada" | "rechazada", reason?: string) {
    const update: Record<string, unknown> = {
      status: decision,
      reviewed_at: new Date().toISOString(),
    };
    if (decision === "rechazada" && reason) update.rejection_reason = reason;
    await supabase.from("age_verifications").update(update).eq("id", verificationId);
    setRows((prev) => prev.filter((r) => r.id !== verificationId));
  }

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;

  return (
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
  );
}
