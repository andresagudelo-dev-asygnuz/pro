import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { getTeamById, joinTeam, leaveTeam, deleteTeam, type TeamWithMembers } from "@/lib/teams/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { initialsFromName } from "@/lib/format";
import { SPORT_TYPE_LABELS } from "@/lib/types/db";
import { Users, MapPin, Crown, Shield, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";

const SPORT_EMOJIS: Record<string, string> = {
  futbol_5: "⚽", futbol_9: "⚽", futbol_11: "⚽", futbol_sala: "⚽",
  padel: "🎾", tenis: "🎾", basket: "🏀", voleibol: "🏐", otro: "🏟️",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="size-3 text-amber-500" />,
  captain: <Shield className="size-3 text-violet-500" />,
  player: null,
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Líder",
  captain: "Capitán",
  player: "Jugador",
};

const SKILL_LABELS: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  pro: "Pro",
};

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  const myMembership = team?.team_members.find((m) => m.user_id === user?.id);
  const isOwner = myMembership?.role === "owner";
  const isMember = !!myMembership;

  useEffect(() => {
    if (!id) return;
    getTeamById(id)
      .then((data) => setTeam(data))
      .catch(() => toast.error("No se pudo cargar el equipo."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleJoin() {
    if (!user || !id) return;
    setActionPending(true);
    try {
      await joinTeam(id, user.id);
      const updated = await getTeamById(id);
      setTeam(updated);
      toast.success("¡Te uniste al equipo!");
    } catch { toast.error("No se pudo unir al equipo."); }
    setActionPending(false);
  }

  async function handleLeave() {
    if (!user || !id || isOwner) return;
    setActionPending(true);
    try {
      await leaveTeam(id, user.id);
      toast.success("Saliste del equipo.");
      setLocation("/equipos");
    } catch { toast.error("No se pudo salir del equipo."); }
    setActionPending(false);
  }

  async function handleDelete() {
    if (!id || !isOwner) return;
    if (!confirm("¿Seguro que querés eliminar este equipo? Esta acción es irreversible.")) return;
    setActionPending(true);
    try {
      await deleteTeam(id);
      toast.success("Equipo eliminado.");
      setLocation("/equipos");
    } catch { toast.error("No se pudo eliminar el equipo."); }
    setActionPending(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <PageHeader title="Equipo" backHref="/equipos" />
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <PageHeader title="Equipo" backHref="/equipos" />
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <p className="font-semibold text-zinc-900 dark:text-white">Equipo no encontrado</p>
          <p className="text-sm text-muted-foreground">Puede que haya sido eliminado o no tenés acceso.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title={team.name}
        backHref="/equipos"
        actions={
          isOwner ? (
            <button
              onClick={handleDelete}
              disabled={actionPending}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-500"
              title="Eliminar equipo"
            >
              <Trash2 className="size-4" />
            </button>
          ) : undefined
        }
      />

      <main className="container mx-auto px-4 py-5 max-w-2xl space-y-4">

        {/* Team hero card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-br from-violet-600 to-violet-800" />
          <div className="px-5 pb-5 -mt-10">
            <div className="flex items-end gap-4 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-4xl shadow-lg border-4 border-white dark:border-zinc-900 shrink-0">
                {SPORT_EMOJIS[team.sport_type] ?? "🏟️"}
              </div>
              <div className="pb-1 min-w-0 flex-1">
                <h1 className="text-xl font-black text-zinc-900 dark:text-white truncate">{team.name}</h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" /> {team.city}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="size-3" /> {team.team_members.length}/{team.max_members}
                  </span>
                  <span className="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-medium">
                    {(SPORT_TYPE_LABELS as Record<string, string>)[team.sport_type] ?? team.sport_type}
                  </span>
                </div>
              </div>
            </div>

            {team.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{team.description}</p>
            )}

            {/* Action button */}
            {user && (
              isMember ? (
                !isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl gap-2 text-muted-foreground"
                    onClick={handleLeave}
                    disabled={actionPending}
                  >
                    <LogOut className="size-3.5" />
                    {actionPending ? "Saliendo…" : "Salir del equipo"}
                  </Button>
                )
              ) : (
                team.team_members.length < team.max_members && (
                  <Button
                    size="sm"
                    className="w-full rounded-xl gap-2 bg-violet-600 hover:bg-violet-700"
                    onClick={handleJoin}
                    disabled={actionPending}
                  >
                    <Users className="size-3.5" />
                    {actionPending ? "Uniéndome…" : "Unirme al equipo"}
                  </Button>
                )
              )
            )}
          </div>
        </div>

        {/* Members */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Miembros · {team.team_members.length}
          </p>
          <div className="divide-y divide-border/50">
            {team.team_members.map((member) => {
              const p = member.profile;
              return (
                <div key={member.user_id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="size-10 shrink-0">
                    {p?.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name ?? ""} />}
                    <AvatarFallback className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 text-xs font-bold">
                      {initialsFromName(p?.full_name ?? p?.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{p?.full_name ?? p?.username ?? "Jugador"}</p>
                      {ROLE_ICONS[member.role]}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {p?.username && <span className="text-xs text-muted-foreground">@{p.username}</span>}
                      {p?.primary_skill_level && (
                        <span className="text-xs text-muted-foreground capitalize">
                          · {SKILL_LABELS[p.primary_skill_level] ?? p.primary_skill_level}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{ROLE_LABELS[member.role]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
