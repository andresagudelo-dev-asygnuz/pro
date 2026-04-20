import Link from "next/link";
import { getAgeVerification } from "@/lib/auth/age-verification";

/**
 * Banner persistente en las rutas `(app)` mientras la verificación de edad
 * no esté aprobada (RF-007, wireframe 02).
 *
 * - Usuario sin fila: banner naranja "Subí tu documento".
 * - `pendiente`: banner gris "En revisión".
 * - `rechazada`: banner rojo "Subí un nuevo documento".
 * - `menor_edad`: banner rojo bloqueante (sin CTA).
 * - `aprobada`: no renderiza nada.
 */
export async function AgeVerificationBanner() {
  const av = await getAgeVerification();

  if (av?.status === "aprobada") return null;

  if (!av) {
    return (
      <BannerShell tone="warn">
        <span>
          Para inscribirte a torneos necesitamos verificar que sos +18.
        </span>
        <BannerCta href="/verificacion">Subí tu documento</BannerCta>
      </BannerShell>
    );
  }

  if (av.status === "pendiente") {
    return (
      <BannerShell tone="info">
        <span>Tu documento está en revisión. Te avisamos cuando se resuelva.</span>
        <BannerCta href="/verificacion">Ver estado</BannerCta>
      </BannerShell>
    );
  }

  if (av.status === "rechazada") {
    return (
      <BannerShell tone="error">
        <span>
          Tu verificación fue rechazada.
          {av.rejection_reason ? ` Motivo: ${av.rejection_reason}.` : ""}
        </span>
        <BannerCta href="/verificacion">Subí un nuevo documento</BannerCta>
      </BannerShell>
    );
  }

  // menor_edad
  return (
    <BannerShell tone="error">
      <span>
        Tu cuenta queda inactiva hasta los 18. No podés inscribirte a torneos por
        ahora.
      </span>
    </BannerShell>
  );
}

function BannerShell({
  tone,
  children,
}: {
  tone: "warn" | "info" | "error";
  children: React.ReactNode;
}) {
  const palette =
    tone === "warn"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
      : tone === "info"
        ? "border-border bg-muted text-foreground"
        : "border-destructive/40 bg-destructive/10 text-destructive";
  return (
    <div
      role="status"
      className={`flex flex-col items-start gap-2 border-b px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-between ${palette}`}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {children}
      </div>
    </div>
  );
}

function BannerCta({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="shrink-0 text-sm font-medium underline underline-offset-2"
    >
      {children}
    </Link>
  );
}
