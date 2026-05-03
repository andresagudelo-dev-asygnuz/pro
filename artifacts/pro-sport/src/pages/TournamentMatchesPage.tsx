import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import {
  listMatches,
  type MatchRow,
  type MatchStatus,
} from "@/lib/tournaments/matches";
import {
  listRegistrations,
  type RegistrationRow,
} from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import type { Profile } from "@/lib/types/db";

const supabase = createClient();

function statusBadge(status: MatchStatus) {
  const palette: Record<MatchStatus, string> = {
    programado: "bg-muted text-muted-foreground",
    en_juego: "bg-amber-500/15 text-amber-600",
    finalizado: "bg-green-500/15 text-green-700",
    w_o: "bg-orange-500/15 text-orange-700",
    cancelado: "bg-destructive/15 text-destructive",
  };
  const labels: Record<MatchStatus, string> = {
    programado: "Programado",
    en_juego: "En juego",
    finalizado: "Finalizado",
    w_o: "W/O",
    cancelado: "Cancelado",
  };
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium ${palette[status]}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function displayRegistration(
  regId: string | null,
  registrations: RegistrationRow[],
  profilesMap: Map<string, Profile>,
): string {
  if (!regId) return "TBD";
  const r = registrations.find((x) => x.id === regId);
  if (!r) return "TBD";
  if (r.team_id) return `Equipo ${r.team_id.slice(0, 6)}`;
  if (r.user_id) {
    const p = profilesMap.get(r.user_id);
    if (p) return p.full_name ?? p.username ?? r.user_id.slice(0, 8);
    return r.user_id.slice(0, 8);
  }
  return regId.slice(0, 8);
}

export default function TournamentMatchesPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, Profile>>(
    new Map(),
  );
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: t } = await getTournamentById(supabase, id);
      if (!t) {
        setError("Torneo no encontrado");
        setLoading(false);
        return;
      }
      const tRow = t as TournamentRow;
      setTournament(tRow);
      setIsOwner(!!user && user.id === tRow.owner_id);

      const [{ data: ms, error: matchErr }, { data: regs }] = await Promise.all([
        listMatches(supabase, id),
        user
          ? listRegistrations(supabase, id)
          : { data: [] as RegistrationRow[] },
      ]);
      if (matchErr) setError(matchErr);
      setMatches(ms ?? []);
      const regList = (regs ?? []) as RegistrationRow[];
      setRegistrations(regList);

      const userIds = [
        ...new Set(regList.map((r) => r.user_id).filter(Boolean)),
      ] as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", userIds);
        const map = new Map<string, Profile>();
        ((profiles ?? []) as Profile[]).forEach((p) => map.set(p.id, p));
        setProfilesMap(map);
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }
  if (!tournament) {
    return (
      <AppLayout>
        <div className="container py-8 max-w-4xl mx-auto">
          <div className="bg-destructive/15 text-destructive p-4 rounded-2xl">
            {error ?? "Torneo no encontrado"}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Fixture — {tournament.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Partidos y resultados del torneo.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href={`/tournaments/${id}`}>Volver</Link>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href={`/tournaments/${id}/standings`}>Ver tabla</Link>
            </Button>
            {isOwner && (
              <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" asChild>
                <Link href={`/tournaments/${id}/matches/new`}>
                  Nuevo partido
                </Link>
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {matches.length === 0 && !error ? (
          <div className="border border-border/60 rounded-2xl p-10 text-center bg-white dark:bg-zinc-900 shadow-sm">
            <p className="text-muted-foreground mb-3">
              Todavía no hay partidos cargados.
            </p>
            {isOwner && (
              <Button className="rounded-xl" asChild>
                <Link href={`/tournaments/${id}/matches/new`}>
                  Crear el primer partido
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div
                key={m.id}
                className="border border-border/60 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-xs text-muted-foreground font-medium w-14 shrink-0">
                    J{m.round}
                    {m.group_code ? ` · ${m.group_code}` : ""}
                  </div>
                  <span className="font-semibold text-sm">
                    {displayRegistration(
                      m.home_registration_id,
                      registrations,
                      profilesMap,
                    )}
                  </span>
                  <div className="text-lg font-black tabular-nums text-violet-600 dark:text-violet-400">
                    {m.home_score ?? "–"} : {m.away_score ?? "–"}
                  </div>
                  <span className="font-semibold text-sm">
                    {displayRegistration(
                      m.away_registration_id,
                      registrations,
                      profilesMap,
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {statusBadge(m.status)}
                  {m.scheduled_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.scheduled_at).toLocaleString("es-CO", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      asChild
                    >
                      <Link href={`/tournaments/${id}/matches/${m.id}`}>
                        {m.status === "finalizado"
                          ? "Editar"
                          : "Cargar resultado"}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
