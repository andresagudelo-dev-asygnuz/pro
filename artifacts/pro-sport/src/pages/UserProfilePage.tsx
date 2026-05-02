import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import type { Match, Profile, Sport } from "@/lib/types/db";

const supabase = createClient();

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [upcoming, setUpcoming] = useState<Match[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate("/login"); return; }
      setCurrentUserId(auth.user.id);

      const { data: profileRaw } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (!profileRaw) { setError("Perfil no encontrado"); setLoading(false); return; }
      const p = profileRaw as Profile;
      setProfile(p);

      const nowIso = new Date().toISOString();
      const [sportRes, matchesRes] = await Promise.all([
        p.primary_sport_id ? supabase.from("sports").select("*").eq("id", p.primary_sport_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("matches").select("*").eq("organizer_id", p.id).gte("starts_at", nowIso).order("starts_at", { ascending: true }).limit(5),
      ]);

      setSport(sportRes.data as Sport | null);
      setUpcoming((matchesRes.data ?? []) as Match[]);
      setLoading(false);
    })();
  }, [id, navigate]);

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;
  if (error || !profile) return <div className="p-6 bg-destructive/15 text-destructive rounded-xl">{error ?? "Perfil no encontrado"}</div>;

  const isMe = currentUserId === profile.id;

  return (
    <AppLayout>
    <div className="flex flex-col gap-6 max-w-3xl mx-auto px-4 py-6">
      <header className="flex flex-col gap-4 rounded-xl border bg-background p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback className="text-lg">{initialsFromName(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">{profile.full_name ?? profile.username ?? "Sin nombre"}</h1>
            <p className="text-sm text-muted-foreground">
              {profile.username ? `@${profile.username}` : ""}{profile.city ? ` · ${profile.city}` : ""}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {sport && <Badge variant="secondary">{sport.icon} {sport.name}</Badge>}
              {profile.primary_skill_level && <Badge variant="outline" className="capitalize">{profile.primary_skill_level}</Badge>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="text-lg font-semibold">{profile.rating_count > 0 ? profile.rating_avg : "—"}</p>
              <p className="text-xs text-muted-foreground">Rating ({profile.rating_count})</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{profile.matches_played}</p>
              <p className="text-xs text-muted-foreground">Partidos</p>
            </div>
          </div>
          {isMe && (
            <Link href="/onboarding">
              <Button variant="outline" size="sm">Editar perfil</Button>
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
                <Link href={`/matches/${m.id}`} className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted">
                  <span>{m.title}</span>
                  <span className="text-xs text-muted-foreground">{formatMatchDate(m.starts_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
