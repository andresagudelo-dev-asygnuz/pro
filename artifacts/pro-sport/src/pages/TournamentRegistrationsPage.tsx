import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import {
  listRegistrations,
  type RegistrationRow,
} from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import type { Profile } from "@/lib/types/db";
import { Users, Clock } from "lucide-react";


const STATUS_CONFIG: Record<
  string,
  { label: string; style: string }
> = {
  confirmada: {
    label: "Confirmada",
    style:
      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
  },
  lista_espera: {
    label: "Lista de espera",
    style:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  },
  cancelada: {
    label: "Cancelada",
    style: "bg-muted text-muted-foreground border-border",
  },
};

function RegistrationCard({
  reg,
  profilesMap,
}: {
  reg: RegistrationRow;
  profilesMap: Map<string, Profile>;
}) {
  const profile = reg.user_id ? profilesMap.get(reg.user_id) : null;
  const displayName = reg.team_id
    ? `Equipo · ${reg.team_id.slice(0, 8)}`
    : profile?.full_name ?? profile?.username ?? reg.user_id?.slice(0, 8) ?? "—";

  const initials = profile
    ? initialsFromName(profile.full_name ?? profile.username)
    : "?";

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
          {reg.team_id ? "👥" : initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" />
          {new Date(reg.created_at).toLocaleString("es-CO", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </li>
  );
}

function Section({
  title,
  rows,
  profilesMap,
  statusKey,
}: {
  title: string;
  rows: RegistrationRow[];
  profilesMap: Map<string, Profile>;
  statusKey: string;
}) {
  const cfg = STATUS_CONFIG[statusKey];
  return (
    <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <header className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h2 className="font-semibold text-sm">{title}</h2>
        {cfg && (
          <span
            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.style}`}
          >
            {cfg.label}
          </span>
        )}
      </header>
      {rows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground text-center py-6">
          Sin inscripciones en esta categoría.
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {rows.map((r) => (
            <RegistrationCard key={r.id} reg={r} profilesMap={profilesMap} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function TournamentRegistrationsPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, Profile>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await getTournamentById(supabase, id);
      if (!t) {
        setError("Torneo no encontrado");
        setLoading(false);
        return;
      }
      const tRow = t as TournamentRow;

      if (tRow.owner_id !== user.id) {
        setError("Solo el promotor del torneo puede ver las inscripciones.");
        setTournament(tRow);
        setLoading(false);
        return;
      }
      setTournament(tRow);

      const { data: regs, error: err } = await listRegistrations(supabase, id);
      if (err) setError(err);
      const regList = (regs ?? []) as RegistrationRow[];
      setRegistrations(regList);

      const userIds = [
        ...new Set(regList.map((r) => r.user_id).filter(Boolean)),
      ] as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", userIds);
        const map = new Map<string, Profile>();
        ((profiles ?? []) as Profile[]).forEach((p) => map.set(p.id, p));
        setProfilesMap(map);
      }

      setLoading(false);
    })();
  }, [id, navigate]);

  if (loading)
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!tournament)
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="bg-destructive/15 text-destructive p-4 rounded-2xl">
          {error ?? "Torneo no encontrado"}
        </div>
      </div>
    );

  const confirmed = registrations.filter((r) => r.status === "confirmada");
  const waiting = registrations.filter((r) => r.status === "lista_espera");
  const cancelled = registrations.filter((r) => r.status === "cancelada");

  const pct = Math.min(
    100,
    Math.round(((tournament.slots_filled ?? 0) / tournament.slots) * 100),
  );

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Inscripciones
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {tournament.name}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href={`/tournaments/${id}`}>Volver al torneo</Link>
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* Slots summary */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Users className="size-4 text-muted-foreground" />
              Cupos
            </span>
            <span className="text-sm font-bold">
              {tournament.slots_filled ?? 0}/{tournament.slots}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 text-right">
            {pct}% ocupado
          </p>
        </div>

        <Section
          title={`Confirmadas (${confirmed.length})`}
          rows={confirmed}
          profilesMap={profilesMap}
          statusKey="confirmada"
        />
        <Section
          title={`Lista de espera (${waiting.length})`}
          rows={waiting}
          profilesMap={profilesMap}
          statusKey="lista_espera"
        />
        {cancelled.length > 0 && (
          <Section
            title={`Canceladas (${cancelled.length})`}
            rows={cancelled}
            profilesMap={profilesMap}
            statusKey="cancelada"
          />
        )}
      </div>
    </AppLayout>
  );
}
