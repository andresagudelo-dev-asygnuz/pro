import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const supabase = createClient();

type ProfileCore = {
  user_id: string;
  full_name: string | null;
  birth_date: string | null;
  city: string | null;
  slug: string;
  primary_sport_id: string | null;
  interests: string[];
  soft_skills_tags: string[];
  created_at: string;
};

export default function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<ProfileCore | null>(null);
  const [sport, setSport] = useState<{ name: string; icon: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles_core").select("*").eq("slug", slug).maybeSingle();
      if (!data) { setError("Perfil no encontrado"); setLoading(false); return; }
      const p = data as ProfileCore;
      setProfile(p);

      if (p.primary_sport_id) {
        const { data: sportData } = await supabase.from("sports").select("name, icon").eq("id", p.primary_sport_id).maybeSingle();
        setSport(sportData as { name: string; icon: string | null } | null);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;
  if (error || !profile) return <div className="p-6 bg-destructive/15 text-destructive rounded-xl">{error ?? "Perfil no encontrado"}</div>;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="text-lg">{initialsFromName(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{profile.full_name ?? "—"}</h1>
            <p className="text-sm text-muted-foreground">@{profile.slug} · {profile.city ?? "—"}</p>
          </div>
        </div>
      </header>

      <section className="rounded-xl border bg-background p-5 flex flex-wrap gap-2 items-center">
        {sport && <Badge variant="secondary">{sport.icon} {sport.name}</Badge>}
        {profile.interests?.map((i) => <Badge key={i} variant="outline">{i}</Badge>)}
        {!sport && profile.interests?.length === 0 && <p className="text-sm text-muted-foreground">Sin información adicional.</p>}
      </section>
    </div>
  );
}
