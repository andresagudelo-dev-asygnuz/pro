import Link from "next/link";
import { MatchCard } from "@/components/match/match-card";
import { Button } from "@/components/ui/button";
import { requireCompleteProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Match, Sport } from "@/lib/types/db";

export const metadata = {
  title: "Feed · PRO",
};

export const dynamic = "force-dynamic";

type MatchRow = Match & {
  match_participants: { user_id: string }[];
};

export default async function FeedPage() {
  const profile = await requireCompleteProfile();
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  const { data: matchesRaw } = await supabase
    .from("matches")
    .select("*, match_participants(user_id)")
    .in("status", ["open", "full", "in_progress"])
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(50);
  const matches = (matchesRaw ?? []) as MatchRow[];

  const { data: sportsRaw } = await supabase.from("sports").select("*");
  const sports = new Map<string, Sport>(
    (sportsRaw ?? []).map((s) => [s.id, s as Sport]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Próximos partidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Buscá con quién jugar en {profile.city ?? "tu ciudad"}, o creá uno
            vos.
          </p>
        </div>
        <Link href="/matches/new">
          <Button>Crear partido</Button>
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-background p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no hay partidos abiertos.
          </p>
          <Link
            href="/matches/new"
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Sé el primero en crear uno
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              sport={sports.get(m.sport_id) ?? null}
              joined={m.match_participants?.length ?? 0}
              isJoined={
                m.match_participants?.some((p) => p.user_id === profile.id) ??
                false
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
