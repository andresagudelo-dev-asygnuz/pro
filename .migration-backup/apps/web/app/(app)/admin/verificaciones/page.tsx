import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { VerificationReviewForm } from "@/components/admin/verification-review-form";
import {
  listPendingVerifications,
  SIGNED_URL_TTL_SECONDS,
  type QueueRow,
} from "@/lib/admin/age-verification-queue";

export const metadata: Metadata = {
  title: "Cola de verificaciones — Admin",
};

// Cola dinámica: siempre buscamos lo último. No tiene sentido cachearlo.
export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  const rows = await listPendingVerifications();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Cola de verificaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Documentos subidos por usuarios pendientes de revisión. Las URLs de
          previsualización expiran a los{" "}
          {Math.round(SIGNED_URL_TTL_SECONDS / 60)} minutos.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
          No hay verificaciones pendientes.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <QueueItem key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function QueueItem({ row }: { row: QueueRow }) {
  const displayName = row.profile?.full_name ?? row.profile?.username ?? "(sin perfil)";
  const sizeKb = row.file_size_bytes
    ? `${(row.file_size_bytes / 1024).toFixed(0)} KB`
    : null;

  return (
    <li className="flex flex-col gap-4 rounded-xl border bg-background p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            user_id:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              {row.user_id}
            </code>
          </p>
        </div>
        <Badge variant="secondary">Pendiente</Badge>
      </div>

      <dl className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div>
          <dt className="font-medium text-foreground">Subido</dt>
          <dd>
            {row.uploaded_at ? (
              <time dateTime={row.uploaded_at}>
                {new Date(row.uploaded_at).toLocaleString("es-AR")}
              </time>
            ) : (
              "—"
            )}
          </dd>
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
        <a
          href={row.signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary underline underline-offset-2"
        >
          Ver documento ↗
        </a>
      ) : (
        <p className="text-xs text-destructive">
          No se pudo generar URL firmada para el documento.
        </p>
      )}

      <VerificationReviewForm verificationId={row.id} />
    </li>
  );
}
