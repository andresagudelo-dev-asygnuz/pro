import { useEffect, useState } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatMatchDate } from "@/lib/format";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Calendar, Users } from "lucide-react";
import type { Match, Sport } from "@/lib/types/db";

const supabase = createClient();

type Tab = "organizados" | "participando";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  full: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  in_progress:
    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  completed: "bg-muted text-muted-foreground",
  cancelled:
    "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 line-through",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  full: "Lleno",
  in_progress: "En juego",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

export default function MisPartidosPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("organizados");
  const [organized, setOrganized] = useState<Match[]>([]);
  const [participating, setParticipating] = useState<Match[]>([]);
  const [sportsMap, setSportsMap] = useState<Map<string, Sport>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      const [sportsRes, organizedRes, participatingRes] = await Promise.all([
        supabase.from("sports").select("*"),
        supabase
          .from("matches")
          .select("*")
          .eq("organizer_id", user!.id)
          .order("starts_at", { ascending: false })
          .limit(50),
        supabase
          .from("match_participants")
          .select("match_id, matches(*)")
          .eq("user_id", user!.id)
          .neq("status", "left"),
      ]);

      if (sportsRes.data) {
        const map = new Map<string, Sport>();
        (sportsRes.data as Sport[]).forEach((s) => map.set(s.id, s));
        setSportsMap(map);
      }

      setOrganized((organizedRes.data ?? []) as Match[]);

      const raw = (participatingRes.data ?? []) as {
        match_id: string;
        matches: Match | null;
      }[];
      const joined = raw
        .map((r) => r.matches)
        .filter((m): m is Match => !!m)
        .filter((m) => m.organizer_id !== user!.id);
      setParticipating(joined);
      setLoading(false);
    }
    load();
  }, [user]);

  const list = tab === "organizados" ? organized : participating;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title="Mis Partidos"
        backHref="/perfil"
        actions={
          <Link href="/matches/new">
            <Button size="sm" className="gap-1.5 rounded-xl">
              <Plus className="size-3.5" /> Crear
            </Button>
          </Link>
        }
      />

      <div className="sticky top-14 z-40 bg-white dark:bg-zinc-900 border-b border-border/50 px-4 pb-3 pt-2 flex gap-2">
        <button
          onClick={() => setTab("organizados")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            tab === "organizados"
              ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Organizo ({organized.length})
        </button>
        <button
          onClick={() => setTab("participando")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            tab === "participando"
              ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Participo ({participating.length})
        </button>
      </div>

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Zap className="size-7 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                {tab === "organizados"
                  ? "No organizás ningún partido"
                  : "No participás en ningún partido"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tab === "organizados"
                  ? "Creá un partido y empezá a jugar."
                  : "Unite a un partido desde el feed principal."}
              </p>
            </div>
            <Link href={tab === "organizados" ? "/matches/new" : "/feed"}>
              <Button size="sm" className="rounded-xl">
                {tab === "organizados" ? "Crear partido" : "Ver partidos"}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((match) => {
              const sport = sportsMap.get(match.sport_id);
              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <div className="group bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-200 cursor-pointer">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-2xl shrink-0">
                          {sport?.icon ?? "⚽"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-tight group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                            {match.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {sport?.name ?? "Deporte"} · {match.city}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLORS[match.status] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {STATUS_LABELS[match.status] ?? match.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3" />
                        {formatMatchDate(match.starts_at)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3" />
                        {match.max_players} jug.
                      </span>
                    </div>
                    {match.location && (
                      <p className="text-xs text-muted-foreground mt-1.5 truncate">
                        📍 {match.location}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
