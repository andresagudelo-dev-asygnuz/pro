import { OnboardingForm } from "@/components/profile/onboarding-form";
import { getProfile, isProfileComplete, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Sport } from "@/lib/types/db";

export const metadata = {
  title: "Armá tu perfil · PRO",
};

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile();
  const isEditing = isProfileComplete(profile);

  const supabase = await createClient();
  const { data: sportsRaw } = await supabase
    .from("sports")
    .select("*")
    .order("name");
  const sports = (sportsRaw ?? []) as Sport[];

  return (
    <div className="mx-auto max-w-2xl rounded-xl border bg-background p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEditing ? "Editá tu perfil deportivo" : "Armá tu perfil deportivo"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditing
            ? "Actualizá tu información — así otros deportistas saben con quién están jugando."
            : "Esto ayuda a que otros deportistas te encuentren y te inviten a jugar."}
        </p>
      </div>
      <OnboardingForm
        sports={sports}
        defaults={{
          username: profile?.username ?? "",
          full_name:
            profile?.full_name ??
            (typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : ""),
          city: profile?.city ?? "",
          bio: profile?.bio ?? "",
          primary_sport_id: profile?.primary_sport_id ?? "",
          primary_skill_level: profile?.primary_skill_level ?? "",
        }}
      />
    </div>
  );
}
