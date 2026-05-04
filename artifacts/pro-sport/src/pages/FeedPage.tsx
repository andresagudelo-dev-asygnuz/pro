import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNotifCount } from "@/context/NotifContext";
import { formatMatchDate } from "@/lib/format";
import { initialsFromName } from "@/lib/format";
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
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Bell,
  Plus,
  SlidersHorizontal,
  X,
  Clock,
  Users,
  Flame,
  ChevronRight,
  Lock,
  Send,
} from "lucide-react";
import type { Match, Sport } from "@/lib/types/db";
import { ENABLED_CITIES } from "@/lib/types/db";

const supabase = createClient();

function getSportTheme(sportName: string | undefined): {
  accent: string;
  bg: string;
  iconBg: string;
  pill: string;
  bar: string;
} {
  const n = (sportName ?? "").toLowerCase();
  if (n.includes("fut") || n.includes("soccer"))
    return {
      accent: "border-l-emerald-500",
      bg: "from-emerald-50 to-white dark:from-emerald-950/30 dark:to-zinc-900",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      bar: "bg-emerald-500",
    };
  if (n.includes("pad"))
    return {
      accent: "border-l-amber-500",
      bg: "from-amber-50 to-white dark:from-amber-950/30 dark:to-zinc-900",
      iconBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      bar: "bg-amber-500",
    };
  if (n.includes("basket") || n.includes("básquet"))
    return {
      accent: "border-l-orange-500",
      bg: "from-orange-50 to-white dark:from-orange-950/30 dark:to-zinc-900",
      iconBg: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
      pill: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      bar: "bg-orange-500",
    };
  if (n.includes("tenis"))
    return {
      accent: "border-l-lime-500",
      bg: "from-lime-50 to-white dark:from-lime-950/30 dark:to-zinc-900",
      iconBg: "bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300",
      pill: "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
      bar: "bg-lime-500",
    };
  if (n.includes("volei") || n.includes("vólei"))
    return {
      accent: "border-l-blue-500",
      bg: "from-blue-50 to-white dark:from-blue-950/30 dark:to-zinc-900",
      iconBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
      pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      bar: "bg-blue-500",
    };
  return {
    accent: "border-l-violet-500",
    bg: "from-violet-50 to-white dark:from-violet-950/30 dark:to-zinc-900",
    iconBg: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
    pill: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    bar: "bg-violet-500",
  };
}

function getUrgencyInfo(
  joinedCount: number,
  maxPlayers: number,
): { label: string; color: string; urgent: boolean } {
  const remaining = maxPlayers - joinedCount;
  const pct = joinedCount / maxPlayers;
  if (remaining <= 0)
    return { label: "Lleno", color: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300", urgent: false };
  if (remaining === 1)
    return { label: "¡Último cupo!", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", urgent: true };
  if (pct >= 0.75)
    return { label: `${remaining} cupos`, color: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300", urgent: true };
  if (pct >= 0.5)
    return { label: `${remaining} cupos`, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", urgent: false };
  return { label: `${remaining} cupos`, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", urgent: false };
}

function getRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = then - now;
  const diffH = diffMs / 3600000;
  if (diffH < 0) return "En curso";
  if (diffH < 1) return `En ${Math.round(diffH * 60)} min`;
  if (diffH < 24) return `En ${Math.floor(diffH)}h`;
  if (diffH < 48) return "Mañana";
  if (diffH < 168) return `En ${Math.floor(diffH / 24)} días`;
  return formatMatchDate(iso);
}

function getBarColor(pct: number): string {
  if (pct >= 0.9) return "bg-red-500";
  if (pct >= 0.6) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function FeedPage() {
  const { profile, user } = useAuth();
  const { unreadCount } = useNotifCount();
  const [, setLocation] = useLocation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsMap, setSportsMap] = useState<Map<string, Sport>>(new Map());
  const [participantCounts, setParticipantCounts] = useState<Map<string, number>>(new Map());
  // match_id → participant status of current user ('joined' | 'requested' | etc.)
  const [myStatuses, setMyStatuses] = useState<Map<string, string>>(new Map());
  // set of user IDs that are friends of the current user (to check private match access)
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  // match_id being requested right now
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
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
      const ms = (matchesRes.data ?? []) as Match[];
      setMatches(ms);

      if (ms.length > 0) {
        const matchIds = ms.map((m) => m.id);

        // Joined counts + my participation statuses in parallel
        const [{ data: countData }, { data: myPartsData }, friendsRes] = await Promise.all([
          supabase
            .from("match_participants")
            .select("match_id")
            .in("match_id", matchIds)
            .eq("status", "joined"),
          user
            ? supabase
                .from("match_participants")
                .select("match_id, status")
                .in("match_id", matchIds)
                .eq("user_id", user.id)
            : Promise.resolve({ data: [] }),
          user
            ? supabase
                .from("friendships")
                .select("requester_id, addressee_id")
                .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
                .eq("status", "accepted")
            : Promise.resolve({ data: [] }),
        ]);

        const counts = new Map<string, number>();
        (countData ?? []).forEach((row: { match_id: string }) => {
          counts.set(row.match_id, (counts.get(row.match_id) ?? 0) + 1);
        });
        setParticipantCounts(counts);

        const statuses = new Map<string, string>();
        ((myPartsData ?? []) as { match_id: string; status: string }[]).forEach((row) => {
          statuses.set(row.match_id, row.status);
        });
        setMyStatuses(statuses);

        const friends = new Set<string>();
        ((friendsRes.data ?? []) as { requester_id: string; addressee_id: string }[]).forEach((f) => {
          if (f.requester_id !== user?.id) friends.add(f.requester_id);
          if (f.addressee_id !== user?.id) friends.add(f.addressee_id);
        });
        setFriendIds(friends);
      }

      setLoading(false);
    }
    load();
  }, [user]);

  async function handleSendRequest(matchId: string) {
    if (!user) return;
    setSendingRequest(matchId);
    const { error } = await supabase
      .from("match_participants")
      .insert({ match_id: matchId, user_id: user.id, status: "requested" });
    if (error) {
      toast.error("No se pudo enviar la solicitud.");
    } else {
      setMyStatuses((prev) => new Map([...prev, [matchId, "requested"]]));
      toast.success("¡Solicitud enviada! El organizador la revisará pronto.");
    }
    setSendingRequest(null);
  }

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
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
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
              onClick={() => setFilterSport(filterSport === sp.id ? "" : sp.id)}
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
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse border border-border/40" />
            ))}
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
                onClick={() => { setFilterSport(""); setFilterCity(""); }}
                className="text-sm text-violet-600 font-medium hover:underline"
              >
                Limpiar filtros
              </button>
            ) : (
              <Link href="/matches/new">
                <Button size="sm" className="rounded-xl">Crear partido</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((match) => {
              const sport = sportsMap.get(match.sport_id);
              const theme = getSportTheme(sport?.name);
              const joinedCount = participantCounts.get(match.id) ?? 0;
              const pct = match.max_players > 0 ? joinedCount / match.max_players : 0;
              const urgency = getUrgencyInfo(joinedCount, match.max_players);
              const relTime = getRelativeTime(match.starts_at);
              const barColor = getBarColor(pct);
              const isHot = urgency.urgent;

              // ── Privacy & access logic ──────────────────────────────────
              const myStatus = myStatuses.get(match.id) ?? null;
              const isMyMatch = match.organizer_id === user?.id;
              const isJoined = myStatus === "joined";
              const isFull = joinedCount >= match.max_players && !isJoined;
              // Public matches: anyone can request. Private: only friends of organizer.
              const canRequest = match.is_public || friendIds.has(match.organizer_id);
              const canEnterDetail = isMyMatch || isJoined;

              // ── CTA element ─────────────────────────────────────────────
              let ctaEl: React.ReactNode;
              if (isMyMatch) {
                ctaEl = (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLocation(`/matches/${match.id}`); }}
                    className="flex items-center gap-0.5 text-xs font-bold text-violet-600 dark:text-violet-400"
                  >
                    Gestionar <ChevronRight className="size-3.5" />
                  </button>
                );
              } else if (isJoined) {
                ctaEl = (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLocation(`/matches/${match.id}`); }}
                    className="flex items-center gap-0.5 text-xs font-bold text-violet-600 dark:text-violet-400"
                  >
                    Ver partido <ChevronRight className="size-3.5" />
                  </button>
                );
              } else if (myStatus === "requested") {
                ctaEl = (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Solicitud enviada
                  </span>
                );
              } else if (isFull) {
                ctaEl = (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    Sin cupos
                  </span>
                );
              } else if (!canRequest) {
                ctaEl = (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    <Lock className="size-3" /> Solo amigos
                  </span>
                );
              } else {
                ctaEl = (
                  <button
                    disabled={sendingRequest === match.id}
                    onClick={(e) => { e.stopPropagation(); handleSendRequest(match.id); }}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
                  >
                    <Send className="size-3" />
                    {sendingRequest === match.id ? "Enviando…" : "Enviar solicitud"}
                  </button>
                );
              }

              const cardInner = (
                <div
                  onClick={canEnterDetail ? () => setLocation(`/matches/${match.id}`) : undefined}
                  className={`group relative bg-gradient-to-br ${theme.bg} rounded-2xl border border-border/60 border-l-4 ${theme.accent} shadow-sm ${canEnterDetail ? "hover:shadow-lg cursor-pointer" : "cursor-default"} transition-all duration-300 overflow-hidden`}
                >
                  {/* Privacy badge */}
                  {!match.is_public && (
                    <div className="absolute top-3 left-16 flex items-center gap-1 bg-zinc-700/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Lock className="size-2.5" /> Privado
                    </div>
                  )}

                  {/* Hot badge overlay */}
                  {isHot && !myStatus && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                      <Flame className="size-2.5" />
                      HOT
                    </div>
                  )}

                  <div className="p-4 pb-3">
                    <div className="flex items-start gap-3">
                      {/* Sport icon */}
                      <div
                        className={`w-12 h-12 rounded-2xl ${theme.iconBg} flex items-center justify-center text-2xl shrink-0 shadow-sm ${canEnterDetail ? "group-hover:scale-105" : ""} transition-transform duration-200`}
                      >
                        {sport?.icon ?? "🏃"}
                      </div>

                      <div className="flex-1 min-w-0 pr-8">
                        {/* Metadata row */}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                          <span className="font-medium">{sport?.name ?? "Deporte"}</span>
                          <span>·</span>
                          <span>{match.city}</span>
                          {match.skill_level && (
                            <>
                              <span>·</span>
                              <span className="capitalize">{match.skill_level}</span>
                            </>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className={`font-bold text-[15px] leading-tight text-zinc-900 dark:text-white ${canEnterDetail ? "group-hover:text-violet-700 dark:group-hover:text-violet-300" : ""} transition-colors line-clamp-2`}>
                          {match.title}
                        </h3>

                        {/* Time row */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                            <Clock className="size-3 shrink-0" />
                            {relTime}
                          </span>
                          <span className="text-[11px] text-muted-foreground/70">
                            {new Date(match.starts_at).toLocaleString("es-CO", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    {match.location && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2.5 truncate">
                        <MapPin className="size-3 shrink-0 text-muted-foreground/70" />
                        {match.location}
                      </p>
                    )}
                  </div>

                  {/* Progress & CTA footer */}
                  <div className="px-4 pb-4">
                    {/* Occupancy bar */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(pct * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold tabular-nums text-muted-foreground whitespace-nowrap">
                        {joinedCount}/{match.max_players}
                      </span>
                    </div>

                    {/* Footer row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3 text-muted-foreground" />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${urgency.color}`}>
                          {urgency.label}
                        </span>
                      </div>
                      {ctaEl}
                    </div>
                  </div>
                </div>
              );

              return <div key={match.id}>{cardInner}</div>;
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
