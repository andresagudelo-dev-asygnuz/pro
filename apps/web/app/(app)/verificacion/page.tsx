import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { VerifyAgeForm } from "@/components/auth/verify-age-form";
import { getAgeVerification } from "@/lib/auth/age-verification";
import { requireUser } from "@/lib/auth/session";
import type { AgeVerification, AgeVerificationStatus } from "@/lib/types/db";

export const metadata: Metadata = {
  title: "Verificación de edad",
};

export default async function VerificationPage() {
  await requireUser();
  const av = await getAgeVerification();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Verificación de edad
        </h1>
        <p className="text-sm text-muted-foreground">
          Para inscribirte a torneos necesitamos confirmar que sos +18. Subí una
          foto nítida de tu documento donde se vea tu fecha de nacimiento.
        </p>
      </header>

      <StatusPanel av={av} />

      {shouldShowUploader(av) && (
        <section className="rounded-xl border bg-background p-5">
          <h2 className="mb-3 text-base font-medium">
            {av ? "Subir un nuevo documento" : "Subir documento de identidad"}
          </h2>
          <VerifyAgeForm />
          <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Tu documento sólo lo ven administradores.</li>
            <li>Nunca se muestra en tu perfil público.</li>
            <li>El archivo se borra automáticamente a los 90 días de aprobación.</li>
          </ul>
        </section>
      )}

      {av?.status === "aprobada" && (
        <div className="flex flex-col gap-2 rounded-xl border bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            Listo. Ya podés completar tu perfil e inscribirte a torneos.
          </p>
          <Link
            href="/feed"
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            Ir al feed
          </Link>
        </div>
      )}
    </div>
  );
}

function shouldShowUploader(av: AgeVerification | null): boolean {
  if (!av) return true;
  // aprobada: ya no hace falta.
  // menor_edad: bloqueo permanente MVP1.
  // pendiente: mostramos el uploader para permitir reemplazo
  //   (por ejemplo si subió un archivo equivocado y todavía no se revisó).
  // rechazada: debe poder subir uno nuevo.
  return av.status !== "aprobada" && av.status !== "menor_edad";
}

function StatusPanel({ av }: { av: AgeVerification | null }) {
  if (!av) {
    return (
      <div className="rounded-xl border bg-background p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Estado actual</p>
          <Badge variant="outline">Sin verificar</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Todavía no subiste ningún documento.
        </p>
      </div>
    );
  }

  const { label, description, variant } = statusCopy(av.status);

  return (
    <div className="rounded-xl border bg-background p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Estado actual</p>
        <Badge variant={variant}>{label}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      {av.status === "rechazada" && av.rejection_reason && (
        <p className="mt-3 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
          Motivo: {av.rejection_reason}
        </p>
      )}

      {av.uploaded_at && (
        <p className="mt-3 text-xs text-muted-foreground">
          Último documento subido:{" "}
          <time dateTime={av.uploaded_at}>
            {formatDate(av.uploaded_at)}
          </time>
          .
        </p>
      )}
    </div>
  );
}

type BadgeVariant = Parameters<typeof Badge>[0]["variant"];

function statusCopy(status: AgeVerificationStatus): {
  label: string;
  description: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case "pendiente":
      return {
        label: "Pendiente",
        description:
          "Tu documento está en revisión. Te avisamos por email cuando se resuelva.",
        variant: "secondary",
      };
    case "aprobada":
      return {
        label: "Aprobada",
        description:
          "Tu edad fue verificada. Ya podés inscribirte a torneos.",
        variant: "default",
      };
    case "rechazada":
      return {
        label: "Rechazada",
        description:
          "No pudimos aprobar tu documento. Subí uno nuevo con la fecha de nacimiento legible.",
        variant: "destructive",
      };
    case "menor_edad":
      return {
        label: "Menor de edad",
        description:
          "Por ahora PRO está abierto sólo a +18. Cuando cumplas 18 vas a poder reactivar tu cuenta.",
        variant: "destructive",
      };
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
