import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Users,
  MapPin,
  Bell,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Match, Sport } from "@/lib/types/db";
import { ENABLED_CITIES } from "@/lib/types/db";

const supabase = createClient();

const STATUS_LABEL: Record<string, string> = {
  open: "Abierto",
  full: "Lleno",
  in_progress: "En juego",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

export default function FeedPage() {
  const { profile, user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsMap, setSportsMap] = useState<Map<string, Sport>>(new Map());
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filterSport, setFilterSport] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");

  useEffect(() => {
    async function load() {
      const [sportsRes, matchesRes] = await Promise.all([
        supabase.from("sports").select("*").order("name"),
        supabase
          .from("matches")
          .select("*")
          .eq("status", "open")
          .order("starts_at", { ascending: true })
          .limit(40),
      ]);
      if (sportsRes.data) {
        const sp = sportsRes.data as Sport[];
        setSports(sp);
        const map = new Map<string, Sport>();
        sp.forEach((s) => map.set(s.id, s));
        setSportsMap(map);
      }
      setMatches((matchesRes.data ?? []) as Match[]);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .is("read_at", null)
      .then(({ count }: { count: number | null }) => setUnreadCount(count ?? 0));
  }, [user]);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (filterSport && m.sport_id !== filterSport) return false;
      if (filterCity && m.city !== filterCity) return false;
      return true;
    });
  }, [matches, filterSport, filterCity]);

  const hasFilters = !!filterSport || !!filterCity;
  const firstName = profile?.full_name?.split(" ")[0] ?? profile?.username ?? null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">
              PRO<span className="text-violet-600">.</span>
            </span>
            {firstName && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                Hola, {firstName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/notificaciones">
              <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-600 ring-2 ring-white dark:ring-zinc-900" />
                )}
              </button>
            </Link>
            <Link href="/perfil">
              <Avatar className="size-8 cursor-pointer ring-2 ring-violet-100 dark:ring-violet-900">
                {profile?.avatar_url && (
                  <AvatarFallback className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold">
                    {initialsFromName(profile.full_name ?? profile.username)}
                  </AvatarFallback>
                )}
                <AvatarFallback className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold">
                  {initialsFromName(profile?.full_name ?? profile?.username)}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>

        {/* Sport filter chips */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterSport("")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
              filterSport === ""
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-sm"
                : "bg-background border-border hover:border-foreground/30 text-muted-foreground"
            }`}
          >
            Todos
          </button>
          {sports.map((sp) => (
            <button
              key={sp.id}
              onClick={() =>
                setFilterSport(filterSport === sp.id ? "" : sp.id)
              }
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                filterSport === sp.id
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-sm"
                  : "bg-background border-border hover:border-foreground/30 text-muted-foreground"
              }`}
            >
              {sp.icon && <span>{sp.icon}</span>}
              {sp.name}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`shrink-0 ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
              hasFilters
                ? "bg-violet-600 text-white border-transparent"
                : "bg-background border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            <SlidersHorizontal className="size-3" />
            Filtros{hasFilters ? " ✓" : ""}
          </button>
        </div>

        {/* City filter */}
        {showFilters && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={filterCity}
                onValueChange={(v) => setFilterCity(v === "all" ? "" : v)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Filtrar por ciudad…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las ciudades</SelectItem>
                  {ENABLED_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <button
                onClick={() => {
                  setFilterSport("");
                  setFilterCity("");
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="size-3" /> Limpiar
              </button>
            )}
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        {/* Hero section */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
              Partidos
            </h1>
            {!loading && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {filtered.length}{" "}
                {filtered.length === 1 ? "partido abierto" : "partidos abiertos"}
                {hasFilters ? " con filtros" : ""}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/mis-partidos">
              <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                <Calendar className="size-3.5" /> Mis partidos
              </Button>
            </Link>
            <Link href="/matches/new">
              <Button size="sm" className="rounded-xl gap-1.5 bg-violet-600 hover:bg-violet-700">
                <Plus className="size-3.5" /> Crear
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">
              {filterSport ? sportsMap.get(filterSport)?.icon ?? "⚽" : "🏟️"}
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                No hay partidos abiertos
              </p>
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "Probá con otros filtros o limpiá la búsqueda."
                  : "Sé el primero en crear uno."}
              </p>
            </div>
            {hasFilters ? (
              <button
                onClick={() => {
                  setFilterSport("");
                  setFilterCity("");
                }}
                className="text-sm text-violet-600 font-medium hover:underline"
              >
                Limpiar filtros
              </button>
            ) : (
              <Link href="/matches/new">
                <Button size="sm" className="rounded-xl">
                  Crear partido
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((match) => {
              const sport = sportsMap.get(match.sport_id);
              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <div className="group bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-200 cursor-pointer overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Sport icon */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/10 flex items-center justify-center text-2xl shrink-0 border border-violet-100 dark:border-violet-800">
                          {sport?.icon ?? "🏃"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
                                {sport?.name ?? "Deporte"} · {match.city}
                                {match.skill_level && (
                                  <span className="ml-1.5 capitalize">
                                    · {match.skill_level}
                                  </span>
                                )}
                              </p>
                              <h3 className="font-semibold text-[15px] leading-tight text-zinc-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors truncate">
                                {match.title}
                              </h3>
                            </div>
                            {match.status !== "open" && (
                              <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {STATUS_LABEL[match.status] ?? match.status}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3 shrink-0" />
                              {formatMatchDate(match.starts_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {match.location && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2.5 truncate">
                          <MapPin className="size-3 shrink-0" />
                          {match.location}
                        </p>
                      )}
                    </div>

                    {/* Footer bar */}
                    <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-t border-border/40 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="size-3" />
                        Máx. {match.max_players} jugadores
                      </span>
                      <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 group-hover:underline">
                        Ver partido →
                      </span>
                    </div>
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
