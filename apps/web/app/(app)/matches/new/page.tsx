import { MatchForm } from "@/components/match/match-form";
import { requireCompleteProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getVenuesWithCourts } from "@/lib/venues/queries";
import type { Sport } from "@/lib/types/db";

export const metadata = {
  title: "Crear partido · PRO",
};

export default async function NewMatchPage() {
  const profile = await requireCompleteProfile();
  const supabase = await createClient();
  const [sportsRes, venues] = await Promise.all([
    supabase.from("sports").select("*").order("name"),
    getVenuesWithCourts(),
  ]);

  const sports = (sportsRes.data ?? []) as Sport[];

  return (
    <div className="mx-auto max-w-3xl rounded-xl border bg-background p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Crear un partido
        </h1>
        <p className="text-sm text-muted-foreground">
          Armá un partido abierto. Otros deportistas te van a poder encontrar y
          unirse.
        </p>
      </div>
      <MatchForm
        sports={sports}
        venues={venues}
        defaultCity={profile.city ?? ""}
      />
    </div>
  );
}
