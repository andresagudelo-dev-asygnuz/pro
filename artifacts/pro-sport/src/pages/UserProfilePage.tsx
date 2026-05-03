import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { UserPlus, UserCheck, Clock, X, Check } from "lucide-react";
import { toast } from "sonner";
import type { Match, Profile, Sport } from "@/lib/types/db";
import type { Friendship } from "@/lib/types/db";
import {
  getFriendshipBetween,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "@/lib/friends/api";

const supabase = createClient();

export default function UserProfilePage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [upcoming, setUpcoming] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [friendship, setFriendship] = useState<Friendship | null | undefined>(undefined);
  const [friendPending, setFriendPending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: profileRaw } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!profileRaw) {
        setError("Perfil no encontrado");
        setLoading(false);
        return;
      }
      const p = profileRaw as Profile;
      setProfile(p);

      const nowIso = new Date().toISOString();
      const [sportRes, matchesRes] = await Promise.all([
        p.primary_sport_id
          ? supabase.from("sports").select("*").eq("id", p.primary_sport_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("matches")
          .select("*")
          .eq("organizer_id", p.id)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(5),
      ]);

      setSport(sportRes.data as Sport | null);
      setUpcoming((matchesRes.data ?? []) as Match[]);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!user || !id || user.id === id) return;
    getFriendshipBetween(supabase, user.id, id).then(({ data }) => {
      setFriendship(data);
    });
  }, [user, id]);

  if (loading)
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Cargando…
      </div>
    );
  if (error || !profile)
    return (
      <div className="p-6 bg-destructive/15 text-destructive rounded-xl">
        {error ?? "Perfil no encontrado"}
      </div>
    );

  const isMe = user?.id === profile.id;
  const amIRequester = friendship?.requester_id === user?.id;
  const amIAddressee = friendship?.addressee_id === user?.id;

  async function handleSendRequest() {
    if (!user) return;
    setFriendPending(true);
    const { data, error: e } = await sendFriendRequest(supabase, user.id, profile!.id);
    if (e) { toast.error(e); }
    else { setFriendship(data); toast.success("Solicitud enviada."); }
    setFriendPending(false);
  }

  async function handleAccept() {
    if (!friendship) return;
    setFriendPending(true);
    const { data, error: e } = await acceptFriendRequest(supabase, friendship.id);
    if (e) { toast.error(e); }
    else { setFriendship(data); toast.success("¡Ahora son amigos!"); }
    setFriendPending(false);
  }

  async function handleReject() {
    if (!friendship) return;
    setFriendPending(true);
    const { error: e } = await rejectFriendRequest(supabase, friendship.id);
    if (e) { toast.error(e); }
    else { setFriendship(null); }
    setFriendPending(false);
  }

  async function handleRemove() {
    if (!friendship) return;
    setFriendPending(true);
    const { error: e } = await removeFriend(supabase, friendship.id);
    if (e) { toast.error(e); }
    else { setFriendship(null); toast.success("Amigo eliminado."); }
    setFriendPending(false);
  }

  function FriendButton() {
    if (isMe || friendship === undefined) return null;
    if (!friendship) {
      return (
        <Button size="sm" variant="outline" onClick={handleSendRequest} disabled={friendPending}>
          <UserPlus className="size-4 mr-1" /> Agregar amigo
        </Button>
      );
    }
    if (friendship.status === "accepted") {
      return (
        <Button size="sm" variant="outline" onClick={handleRemove} disabled={friendPending}
          className="text-destructive border-destructive/30 hover:bg-destructive/10">
          <UserCheck className="size-4 mr-1" /> Amigos · Eliminar
        </Button>
      );
    }
    if (friendship.status === "pending" && amIRequester) {
      return (
        <Button size="sm" variant="outline" disabled className="text-muted-foreground">
          <Clock className="size-4 mr-1" /> Solicitud enviada
        </Button>
      );
    }
    if (friendship.status === "pending" && amIAddressee) {
      return (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAccept} disabled={friendPending}>
            <Check className="size-3.5 mr-1" /> Aceptar
          </Button>
          <Button size="sm" variant="outline" onClick={handleReject} disabled={friendPending}>
            <X className="size-3.5" />
          </Button>
        </div>
      );
    }
    if (friendship.status === "rejected" && amIAddressee) {
      return (
        <Button size="sm" variant="outline" onClick={handleSendRequest} disabled={friendPending}>
          <UserPlus className="size-4 mr-1" /> Agregar amigo
        </Button>
      );
    }
    return null;
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-3xl mx-auto px-4 py-6">
        <header className="flex flex-col gap-4 rounded-xl border bg-background p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
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

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="text-lg font-semibold">
                  {profile.rating_count > 0 ? profile.rating_avg : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Rating ({profile.rating_count})</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{profile.matches_played}</p>
                <p className="text-xs text-muted-foreground">Partidos</p>
              </div>
            </div>
            {isMe ? (
              <Link href="/onboarding">
                <Button variant="outline" size="sm">Editar perfil</Button>
              </Link>
            ) : (
              <FriendButton />
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
    </AppLayout>
  );
}
