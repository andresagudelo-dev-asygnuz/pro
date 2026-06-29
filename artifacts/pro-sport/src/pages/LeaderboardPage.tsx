import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getTopPlayers } from "@/lib/profiles/api";
import type { Profile } from "@/lib/types/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Star, Activity, Medal, Flame } from "lucide-react";
import { initialsFromName } from "@/lib/format";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<"rating" | "matches">("rating");
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await getTopPlayers(supabase, metric, 50);
      if (data) setPlayers(data);
      setLoading(false);
    }
    load();
  }, [metric]);

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2">
            <Trophy className="size-6 text-brand-primary" />
            Ranking Local
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Los mejores jugadores de la comunidad.</p>
        </div>

        <div className="flex bg-muted/50 p-1 rounded-xl w-full md:w-auto overflow-hidden">
          <button
            onClick={() => setMetric("rating")}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
              metric === "rating" ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Star className="size-4" /> Top Calificados
          </button>
          <button
            onClick={() => setMetric("matches")}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
              metric === "matches" ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Activity className="size-4" /> Más Activos
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-2 md:gap-4 h-48 animate-pulse bg-muted rounded-2xl" />
      ) : players.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-3xl">
          No hay suficientes datos todavía. ¡Jugá más partidos para aparecer!
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-2 md:gap-4 items-end pt-10">
              {/* Silver #2 */}
              {top3[1] && <PodiumPosition player={top3[1]} rank={2} metric={metric} />}
              {/* Gold #1 */}
              {top3[0] && <PodiumPosition player={top3[0]} rank={1} metric={metric} />}
              {/* Bronze #3 */}
              {top3[2] && <PodiumPosition player={top3[2]} rank={3} metric={metric} />}
            </div>
          )}

          {/* Rest of players */}
          {rest.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/60 shadow-sm overflow-hidden">
              <ul className="divide-y divide-border/40">
                {rest.map((player, idx) => (
                  <li key={player.id}>
                    <Link href={`/profile/${player.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors">
                      <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{idx + 4}</span>
                      <Avatar className="size-10 border border-border/50 shadow-sm">
                        {player.avatar_url && <AvatarImage src={player.avatar_url} />}
                        <AvatarFallback className="text-xs bg-muted font-bold">{initialsFromName(player.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{player.full_name ?? player.username}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {metric === "rating" ? (
                            <><Star className="size-3 text-amber-500 fill-amber-500" /> {player.rating_avg?.toFixed(1)} ({player.rating_count} votos)</>
                          ) : (
                            <><Flame className="size-3 text-orange-500" /> {player.matches_played} jugados</>
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PodiumPosition({ player, rank, metric }: { player: Profile; rank: number; metric: "rating" | "matches" }) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  
  const colors = {
    1: "from-amber-300 to-amber-500 border-amber-400 text-amber-900",
    2: "from-slate-200 to-slate-400 border-slate-300 text-slate-800",
    3: "from-orange-300 to-orange-500 border-orange-400 text-orange-950",
  };

  const heights = {
    1: "h-32 md:h-40",
    2: "h-24 md:h-32",
    3: "h-20 md:h-28",
  };

  return (
    <Link href={`/profile/${player.id}`} className="flex flex-col items-center group relative z-10">
      {isFirst && <Medal className="size-8 text-amber-500 fill-amber-300 drop-shadow-md mb-2 animate-bounce" />}
      <div className={cn("relative transition-transform group-hover:-translate-y-2", isFirst ? "mb-4" : "mb-2")}>
        <Avatar className={cn("border-4 shadow-xl bg-white", isFirst ? "size-20 border-amber-400" : isSecond ? "size-16 border-slate-300" : "size-14 border-orange-400")}>
          {player.avatar_url && <AvatarImage src={player.avatar_url} />}
          <AvatarFallback className="font-bold text-muted-foreground bg-muted">{initialsFromName(player.full_name)}</AvatarFallback>
        </Avatar>
        <div className={cn("absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full font-black flex items-center justify-center shadow-sm text-white", isFirst ? "size-7 text-sm bg-amber-500" : isSecond ? "size-6 text-xs bg-slate-400" : "size-5 text-[10px] bg-orange-500")}>
          {rank}
        </div>
      </div>

      <div className="text-center mt-3 mb-2 px-1">
        <p className="font-bold text-xs md:text-sm line-clamp-1">{player.full_name ?? player.username}</p>
        <p className="text-[10px] md:text-xs font-semibold text-muted-foreground mt-0.5">
          {metric === "rating" ? `${player.rating_avg?.toFixed(1)} ★` : `${player.matches_played} PJ`}
        </p>
      </div>

      <div className={cn("w-full rounded-t-xl bg-gradient-to-t shadow-inner opacity-90", colors[rank as 1|2|3], heights[rank as 1|2|3])} />
    </Link>
  );
}
