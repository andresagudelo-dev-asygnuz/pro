"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withAuth } from "@/lib/auth/with-auth";
import { mapDbError } from "@/lib/errors/map-db-error";
import {
  formDataToObject,
  onboardingSchema,
  zFieldErrors,
} from "@/lib/validation/schemas";

export type ProfileState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function saveOnboarding(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const parsed = onboardingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: zFieldErrors(parsed) ?? undefined,
    };
  }
  const input = parsed.data;

  return withAuth(async ({ user, supabase }) => {
    // Upsert: el trigger on_auth_user_created ya insertó un row, nosotros
    // actualizamos con los datos del onboarding (o creamos si faltase).
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username: input.username,
        full_name: input.full_name,
        city: input.city,
        bio: input.bio,
        primary_sport_id: input.primary_sport_id,
        primary_skill_level: input.primary_skill_level,
      },
      { onConflict: "id" },
    );

    if (error) {
      if (error.code === "23505") {
        return { error: "Ese username ya está tomado, probá otro." };
      }
      return { error: mapDbError(error, "saveOnboarding") };
    }

    revalidatePath("/", "layout");
    redirect("/feed");
  });
}
