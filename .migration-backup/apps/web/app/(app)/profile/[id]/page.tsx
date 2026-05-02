import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCompleteProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import type { Match, Profile, Sport } from "@/lib/types/db";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function ProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const me = await requireCompleteProfile();
  const supabase = await createClient();

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const profile = profileRaw as Profile | null;
  if (!profile) notFound();

  const { data: sport } = profile.primary_sport_id
    ? await supabase
        .from("sports")
        .select("*")
        .eq("id", profile.primary_sport_id)
        .maybeSingle<Sport>()
    : { data: null };

  const nowIso = new Date().toISOString();
  const { data: upcomingRaw } = await supabase
    .from("matches")
    .select("*")
    .eq("organizer_id", profile.id)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(5);
  const upcoming = (upcomingRaw ?? []) as Match[];

  const isMe = me.id === profile.id;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-xl border bg-background p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt="" />
            )}
            <AvatarFallback className="text-lg">
              {initialsFromName(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {profile.full_name ?? profile.username ?? "Sin nombre"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile.username ? `@${profile.username}` : ""}
              {profile.city ? ` · ${profile.city}` : ""}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {sport && (
                <Badge variant="secondary">
                  {sport.icon} {sport.name}
                </Badge>
              )}
              {profile.primary_skill_level && (
                <Badge variant="outline" className="capitalize">
                  {profile.primary_skill_level}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="text-lg font-semibold">
                {profile.rating_count > 0 ? profile.rating_avg : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Rating ({profile.rating_count})
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{profile.matches_played}</p>
              <p className="text-xs text-muted-foreground">Partidos</p>
            </div>
          </div>
          {isMe && (
            <Link href="/onboarding">
              <Button variant="outline" size="sm">
                Editar perfil
              </Button>
            </Link>
          )}
        </div>
      </header>

      {profile.bio && (
        <section className="rounded-xl border bg-background p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold">Bio</h2>
          <p className="whitespace-pre-wrap text-sm">{profile.bio}</p>
        </section>
      )}

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Próximos partidos que organiza</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin partidos abiertos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/matches/${m.id}`}
                  className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted"
                >
                  <span>{m.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatMatchDate(m.starts_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
