import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicProfileView } from "@/components/profile/public-profile-view";
import {
  getIdentityProfileBySlug,
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
  getSkillTagsByCategories,
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

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getIdentityProfileBySlug(slug);
  if (!profile) return { title: "Perfil no encontrado" };
  return {
    title: `${profile.full_name} (@${profile.slug}) · Ficha PRO`,
  };
}

/**
 * Vista pública del perfil `/u/[slug]` — HU-003 PR D.
 *
 * 1. Resuelve el perfil por slug.
 * 2. Determina la audiencia del visitante (guest, auth, promotor, owner).
 * 3. Fetchea visibilidad y datos de los 4 bloques.
 * 4. Renderiza usando PublicProfileView filtrando por audiencia.
 */
export default async function PublicProfilePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const core = await getIdentityProfileBySlug(slug);
  if (!core) notFound();

  const supabase = await createClient();
  const { data: { user: viewer } } = await supabase.auth.getUser();

  // Determinar audiencia
  let audience: "publico" | "promotores" | "privado" = "publico";
  const isOwner = viewer?.id === core.user_id;

  if (isOwner) {
    audience = "privado";
  } else if (viewer) {
    const { data: viewerRoles } = await supabase
      .from("user_roles")
      .select("is_promoter")
      .eq("user_id", viewer.id)
      .maybeSingle();

    if (viewerRoles?.is_promoter) {
      audience = "promotores";
    } else {
      audience = "publico";
    }
  }

  // Fetch de todos los bloques para este usuario específico
  const userId = core.user_id;
  const [
    identityVisibility,
    softSkills,
    sportsRes,
    morphoProfile,
    morphoVisibility,
    conditionalProfile,
    conditionalVisibility,
    allConditionalTags,
    techProfile,
    techVisibility,
  ] = await Promise.all([
    getIdentityVisibility(userId),
    getSoftSkillsCatalog(),
    supabase
      .from("sports")
      .select("id,name")
      .order("name", { ascending: true }),
    getMorphoProfile(userId),
    getMorphoVisibility(userId),
    getConditionalProfile(userId),
    getConditionalVisibility(userId),
    getSkillTagsByCategories(["strength", "speed", "endurance", "flexibility"]),
    getTechnicalFootballProfile(userId),
    getTechnicalFootballVisibility(userId),
  ]);

  const strengthTags = allConditionalTags.filter((t) => t.category === "strength");
  const speedTags = allConditionalTags.filter((t) => t.category === "speed");
  const enduranceTags = allConditionalTags.filter((t) => t.category === "endurance");
  const flexibilityTags = allConditionalTags.filter((t) => t.category === "flexibility");

  const sports = (sportsRes.data as Pick<Sport, "id" | "name">[]) ?? [];
  const visibility: Record<ProfileFieldKey, VisibilityLevel> = {
    ...identityVisibility,
    ...morphoVisibility,
    ...conditionalVisibility,
    ...techVisibility,
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{core.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          @{core.slug} · Perfil deportivo
        </p>
      </header>

      <PublicProfileView
        core={core}
        morpho={morphoProfile}
        conditional={conditionalProfile}
        technicalFootball={techProfile}
        visibility={visibility}
        audience={audience}
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
    </div>
  );
}
