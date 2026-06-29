import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, X, Check, Ruler, Weight, Activity } from "lucide-react";
import { toast } from "sonner";
import type { Friendship } from "@/lib/types/db";
import {
  getFriendshipBetween,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "@/lib/friends/api";
import { useQuery } from "@tanstack/react-query";
import { getProfileBlocks } from "@/lib/profiles/api";
import { canViewBlock, type ViewerContext } from "@/lib/profiles/visibility";
import { ProfileSkeleton } from "@/components/ui/skeletons";

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
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileCore | null>(null);
  const [sport, setSport] = useState<{ name: string; icon: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [friendship, setFriendship] = useState<Friendship | null | undefined>(undefined);
  const [friendPending, setFriendPending] = useState(false);

  // Fetch viewer's roles to check if they are a promoter
  const { data: viewerRoles } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("is_promoter")
        .eq("user_id", user.id)
        .maybeSingle();
      return data as { is_promoter: boolean } | null;
    },
    enabled: Boolean(user?.id),
  });

  // Fetch profile blocks for the profile owner
  const { data: profileBlocksData } = useQuery({
    queryKey: ["profile-blocks", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return null;
      const result = await getProfileBlocks(supabase, profile.user_id);
      return result.data;
    },
    enabled: Boolean(profile?.user_id),
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles_core")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!data) {
        setError("Perfil no encontrado");
        setLoading(false);
        return;
      }
      const p = data as ProfileCore;
      setProfile(p);

      if (p.primary_sport_id) {
        const { data: sportData } = await supabase
          .from("sports")
          .select("name, icon")
          .eq("id", p.primary_sport_id)
          .maybeSingle();
        setSport(sportData as { name: string; icon: string | null } | null);
      }
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!user || !profile) return;
    if (user.id === profile.user_id) return;
    getFriendshipBetween(supabase, user.id, profile.user_id).then(({ data }) => {
      setFriendship(data);
    });
  }, [user, profile]);

  if (loading)
    return (
      <>
        <ProfileSkeleton />
      </>
    );
  if (error || !profile)
    return (
      <div className="p-6 bg-destructive/15 text-destructive rounded-xl">
        {error ?? "Perfil no encontrado"}
      </div>
    );

  const isMe = user?.id === profile.user_id;
  const amIRequester = friendship?.requester_id === user?.id;
  const amIAddressee = friendship?.addressee_id === user?.id;

  const viewerContext: ViewerContext = {
    viewerId: user?.id ?? null,
    isPromoter: viewerRoles?.is_promoter ?? false,
    isOwner: isMe,
  };

  async function handleSendRequest() {
    if (!user || !profile) return;
    setFriendPending(true);
    const { data, error: e } = await sendFriendRequest(supabase, user.id, profile.user_id);
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
    if (!user || isMe || friendship === undefined) return null;
    if (!friendship) {
      return (
        <Button size="sm" onClick={handleSendRequest} disabled={friendPending}>
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
    return null;
  }

  return (
    <>
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">
                {initialsFromName(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {profile.full_name ?? "—"}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{profile.slug} · {profile.city ?? "—"}
              </p>
            </div>
          </div>
          <FriendButton />
        </div>
      </header>

      <section className="rounded-xl border bg-background p-5 flex flex-wrap gap-2 items-center">
        {sport && (
          <Badge variant="secondary">
            {sport.icon} {sport.name}
          </Badge>
        )}
        {profile.interests?.map((i) => (
          <Badge key={i} variant="outline">
            {i}
          </Badge>
        ))}
        {!sport && profile.interests?.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin información adicional.</p>
        )}
      </section>

      {/* Profile blocks — shown based on visibility rules */}
      {profileBlocksData && (
        <div className="flex flex-col gap-4">
          {canViewBlock(profileBlocksData.morpho?.visibility ?? "privado", viewerContext) && profileBlocksData.morpho && (
            <div className="rounded-xl border bg-background p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Morfología</p>
              <div className="grid grid-cols-3 gap-4 mb-3">
                {profileBlocksData.morpho.height_m != null && (
                  <div className="flex flex-col items-center gap-1">
                    <Ruler className="size-4 text-muted-foreground" />
                    <span className="text-base font-bold">{profileBlocksData.morpho.height_m}m</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Altura</span>
                  </div>
                )}
                {profileBlocksData.morpho.weight_kg != null && (
                  <div className="flex flex-col items-center gap-1">
                    <Weight className="size-4 text-muted-foreground" />
                    <span className="text-base font-bold">{profileBlocksData.morpho.weight_kg}kg</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Peso</span>
                  </div>
                )}
                {profileBlocksData.morpho.wingspan_m != null && (
                  <div className="flex flex-col items-center gap-1">
                    <Activity className="size-4 text-muted-foreground" />
                    <span className="text-base font-bold">{profileBlocksData.morpho.wingspan_m}m</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Envergadura</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {profileBlocksData.morpho.laterality && (
                  <Badge variant="secondary" className="capitalize">{profileBlocksData.morpho.laterality}</Badge>
                )}
                {profileBlocksData.morpho.somatotype && (
                  <Badge variant="outline" className="capitalize">{profileBlocksData.morpho.somatotype}</Badge>
                )}
              </div>
            </div>
          )}

          {canViewBlock(profileBlocksData.conditional?.visibility ?? "privado", viewerContext) && profileBlocksData.conditional && (
            <div className="rounded-xl border bg-background p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Condición física</p>
              <div className="flex flex-col gap-2 text-sm">
                {profileBlocksData.conditional.strength_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground mr-1 text-xs">Fuerza:</span>
                    {profileBlocksData.conditional.strength_tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
                {profileBlocksData.conditional.speed_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground mr-1 text-xs">Velocidad:</span>
                    {profileBlocksData.conditional.speed_tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
                {profileBlocksData.conditional.endurance_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground mr-1 text-xs">Resistencia:</span>
                    {profileBlocksData.conditional.endurance_tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
                {profileBlocksData.conditional.flexibility_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground mr-1 text-xs">Flexibilidad:</span>
                    {profileBlocksData.conditional.flexibility_tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {canViewBlock(profileBlocksData.technical?.visibility ?? "privado", viewerContext) && profileBlocksData.technical && (
            <div className="rounded-xl border bg-background p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Técnica</p>
              <div className="flex flex-col gap-2 text-sm">
                {profileBlocksData.technical.position && (
                  <p>
                    <span className="text-muted-foreground mr-1">Posición:</span>
                    <span className="font-medium capitalize">{profileBlocksData.technical.position}</span>
                  </p>
                )}
                {profileBlocksData.technical.dominant_foot && (
                  <p>
                    <span className="text-muted-foreground mr-1">Pie dominante:</span>
                    <span className="font-medium capitalize">{profileBlocksData.technical.dominant_foot}</span>
                  </p>
                )}
                {profileBlocksData.technical.performance_notes && (
                  <p className="text-xs text-muted-foreground italic mt-1">"{profileBlocksData.technical.performance_notes}"</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
