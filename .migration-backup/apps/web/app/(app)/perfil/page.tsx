import type { Metadata } from "next";
import { IdentityEditorForm } from "@/components/profile/identity-editor-form";
import { MorphoEditorForm } from "@/components/profile/morpho-editor-form";
import { ConditionalEditorForm } from "@/components/profile/conditional-editor-form";
import { TechnicalFootballEditorForm } from "@/components/profile/technical-football-editor-form";
import { ProfilePreview } from "@/components/profile/profile-preview";
import {
  ProfileTabs,
  resolveTab,
  type ProfileTabId,
} from "@/components/profile/profile-tabs";
import { createClient } from "@/lib/supabase/server";
import { requireAgeVerificationAprobada } from "@/lib/auth/age-verification";
import {
  getIdentityProfile,
  getIdentityVisibility,
  getSoftSkillsCatalog,
} from "@/lib/profiles/identity";
import {
  getMorphoProfile,
  getMorphoVisibility,
} from "@/lib/profiles/morpho";
import {
  getConditionalProfile,
  getConditionalVisibility,
  getSkillTagsByCategory,
} from "@/lib/profiles/conditional";
import {
  getTechnicalFootballProfile,
  getTechnicalFootballVisibility,
} from "@/lib/profiles/technical-football";
import type {
  ProfileFieldKey,
  SkillTag,
  Sport,
  VisibilityLevel,
} from "@/lib/types/db";

export const metadata: Metadata = {
  title: "Mi perfil · Bloques 1-4 + vista previa",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string | string[] }>;

const TITLES: Record<ProfileTabId, string> = {
  identidad: "Bloque 1 · Identidad y perfil personal",
  morfo: "Bloque 2 · Análisis morfológico y biométrico",
  condicional: "Bloque 3 · Capacidades condicionales",
  tecnico: "Bloque 4 · Destrezas técnicas (fútbol)",
  preview: "Vista previa por audiencia",
};

/**
 * Ruta `/perfil` — HU-003 PR C.
 *
 * Presenta los 4 bloques + vista previa como tabs URL-driven (`?tab=<id>`).
 * Siempre fetchea datos de los 4 bloques (queries cache()-enabled y RLS
 * self-only) para que la tab de preview vea el estado completo.
 *
 * Gate: verificación de edad aprobada — el helper redirige a /verificacion
 * si no lo está.
 */
export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAgeVerificationAprobada();
  const { tab: rawTab } = await searchParams;
  const active = resolveTab(rawTab);
  const supabase = await createClient();

  // Fetch en paralelo — todas cachean por request vía React `cache()`.
  const [
    identityProfile,
    identityVisibility,
    softSkills,
    sportsRes,
    morphoProfile,
    morphoVisibility,
    conditionalProfile,
    conditionalVisibility,
    strengthTags,
    speedTags,
    enduranceTags,
    flexibilityTags,
    techProfile,
    techVisibility,
  ] = await Promise.all([
    getIdentityProfile(),
    getIdentityVisibility(),
    getSoftSkillsCatalog(),
    supabase
      .from("sports")
      .select("id,name")
      .order("name", { ascending: true }),
    getMorphoProfile(),
    getMorphoVisibility(),
    getConditionalProfile(),
    getConditionalVisibility(),
    getSkillTagsByCategory("strength"),
    getSkillTagsByCategory("speed"),
    getSkillTagsByCategory("endurance"),
    getSkillTagsByCategory("flexibility"),
    getTechnicalFootballProfile(),
    getTechnicalFootballVisibility(),
  ]);

  const sports =
    ((sportsRes.data as Pick<Sport, "id" | "name">[] | null) ?? []).length > 0
      ? (sportsRes.data as Pick<Sport, "id" | "name">[])
      : [{ id: "futbol", name: "Fútbol" }];

  // Visibilidad unificada para la vista previa (incluye los 20 field_keys).
  const visibility: Record<ProfileFieldKey, VisibilityLevel> = {
    ...identityVisibility,
    ...morphoVisibility,
    ...conditionalVisibility,
    ...techVisibility,
  };

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

      <ProfileTabs active={active} />

      <section
        aria-label={TITLES[active]}
        className="rounded-xl border bg-background p-5"
      >
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          {TITLES[active]}
        </h2>

        {active === "identidad" ? (
          <IdentityEditorForm
            profile={identityProfile}
            visibility={identityVisibility}
            sports={sports}
            softSkills={softSkills.map((s: SkillTag) => ({
              id: s.id,
              label: s.label,
            }))}
          />
        ) : null}

        {active === "morfo" ? (
          <MorphoEditorForm
            profile={morphoProfile}
            visibility={morphoVisibility}
          />
        ) : null}

        {active === "condicional" ? (
          <ConditionalEditorForm
            profile={conditionalProfile}
            visibility={conditionalVisibility}
            strengthTags={strengthTags}
            speedTags={speedTags}
            enduranceTags={enduranceTags}
            flexibilityTags={flexibilityTags}
          />
        ) : null}

        {active === "tecnico" ? (
          <TechnicalFootballEditorForm
            profile={techProfile}
            visibility={techVisibility}
          />
        ) : null}

        {active === "preview" ? (
          <ProfilePreview
            core={identityProfile}
            morpho={morphoProfile}
            conditional={conditionalProfile}
            technicalFootball={techProfile}
            visibility={visibility}
            sportsById={Object.fromEntries(sports.map((s) => [s.id, s.name]))}
            softSkillsById={Object.fromEntries(
              softSkills.map((s: SkillTag) => [s.id, s.label]),
            )}
            strengthTagsById={Object.fromEntries(
              strengthTags.map((t) => [t.id, t.label]),
            )}
            speedTagsById={Object.fromEntries(
              speedTags.map((t) => [t.id, t.label]),
            )}
            enduranceTagsById={Object.fromEntries(
              enduranceTags.map((t) => [t.id, t.label]),
            )}
            flexibilityTagsById={Object.fromEntries(
              flexibilityTags.map((t) => [t.id, t.label]),
            )}
          />
        ) : null}
      </section>
    </div>
  );
}
