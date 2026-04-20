import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { IdentityEditorForm } from "@/components/profile/identity-editor-form";
import { createClient } from "@/lib/supabase/server";
import { requireAgeVerificationAprobada } from "@/lib/auth/age-verification";
import {
  getIdentityProfile,
  getIdentityVisibility,
  getSoftSkillsCatalog,
} from "@/lib/profiles/identity";
import type { Sport } from "@/lib/types/db";

export const metadata: Metadata = {
  title: "Mi perfil · Bloque 1 Identidad",
};

export const dynamic = "force-dynamic";

/**
 * Ruta `/perfil` — HU-003 PR B.
 *
 * Gate: la verificación de edad debe estar aprobada. Si no, el helper
 * `requireAgeVerificationAprobada` redirige a `/verificacion` antes de
 * ejecutar nada más (UX sobre RLS/CHECK del server).
 *
 * Este PR entrega sólo el Bloque 1 (Identidad). Los bloques 2/3/4 llegan
 * en PR C per `tasks/sprint-week-02.md`. Dejamos el shell listo con una
 * tira de bloques + badges "Próximamente" para que el usuario vea el
 * roadmap y no se frustre.
 */
export default async function ProfileEditPage() {
  await requireAgeVerificationAprobada();
  const supabase = await createClient();

  const [profile, visibility, softSkills, sportsRes] = await Promise.all([
    getIdentityProfile(),
    getIdentityVisibility(),
    getSoftSkillsCatalog(),
    supabase.from("sports").select("id,name").order("name", { ascending: true }),
  ]);

  const sports =
    ((sportsRes.data as Pick<Sport, "id" | "name">[] | null) ?? []).length > 0
      ? (sportsRes.data as Pick<Sport, "id" | "name">[])
      : [{ id: "futbol", name: "Fútbol" }];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">
          Tu ficha deportiva. Elegí a quién mostrar cada dato:{" "}
          <strong>Público</strong> (cualquiera),{" "}
          <strong>Promotores</strong> (organizadores autenticados) o{" "}
          <strong>Privado</strong> (sólo vos).
        </p>
      </header>

      <nav
        aria-label="Bloques del perfil"
        className="flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3 text-xs"
      >
        <span className="font-medium text-foreground">Bloque activo:</span>
        <Badge>1 · Identidad</Badge>
        <span className="text-muted-foreground">·</span>
        <Badge variant="outline">2 · Morfológico (próx.)</Badge>
        <Badge variant="outline">3 · Capacidades (próx.)</Badge>
        <Badge variant="outline">4 · Destrezas fútbol (próx.)</Badge>
      </nav>

      <section className="rounded-xl border bg-background p-5">
        <IdentityEditorForm
          profile={profile}
          visibility={visibility}
          sports={sports}
          softSkills={softSkills.map((s) => ({ id: s.id, label: s.label }))}
        />
      </section>
    </div>
  );
}
