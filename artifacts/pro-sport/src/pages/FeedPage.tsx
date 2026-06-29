import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNotifCount } from "@/context/NotifContext";
import { initialsFromName } from "@/lib/format";
import { formatMatchDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { toast } from "sonner";
import { Calendar, MapPin, Bell, Plus, SlidersHorizontal, X, Clock, Users, Flame, ChevronRight, Lock, Send, Loader2, Home, MessageCircle, Building2 } from "lucide-react";
import { NavDrawer } from "@/components/NavDrawer";
import type { Sport } from "@/lib/types/db";
import { checkMatchConflict } from "@/lib/matches/conflicts";
import { ENABLED_CITIES } from "@/lib/types/db";
import { useFeedData } from "@/hooks/useFeedData";
import type { FeedMatch } from "@/lib/feed/api";
import { getFeedEnrichmentData } from "@/lib/feed/api";
import { listSports } from "@/lib/sports/api";
import { listActiveCanchasBasic } from "@/lib/canchas/api";
import { requestJoinMatch, cancelJoinRequest } from "@/lib/matches/api";
import { sendNotification } from "@/lib/notifications/api";
import { FeedPostSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";

function getSportTheme(n = "") {
  n = n.toLowerCase();
  if (n.includes("fut") || n.includes("soccer")) return { accent: "border-l-emerald-500", bg: "from-emerald-50 to-white dark:from-emerald-950/30 dark:to-zinc-900", iconBg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" };
  if (n.includes("pad")) return { accent: "border-l-amber-500", bg: "from-amber-50 to-white dark:from-amber-950/30 dark:to-zinc-900", iconBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300", bar: "bg-amber-500" };
  if (n.includes("basket")) return { accent: "border-l-orange-500", bg: "from-orange-50 to-white dark:from-orange-950/30 dark:to-zinc-900", iconBg: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300", bar: "bg-orange-500" };
  if (n.includes("tenis")) return { accent: "border-l-lime-500", bg: "from-lime-50 to-white dark:from-lime-950/30 dark:to-zinc-900", iconBg: "bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300", bar: "bg-lime-500" };
  if (n.includes("volei")) return { accent: "border-l-blue-500", bg: "from-blue-50 to-white dark:from-blue-950/30 dark:to-zinc-900", iconBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300", bar: "bg-blue-500" };
  return { accent: "border-l-violet-500", bg: "from-violet-50 to-white dark:from-violet-950/30 dark:to-zinc-900", iconBg: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300", bar: "bg-violet-500" };
}

function getUrgency(joined: number, max: number) {
  const rem = max - joined; const pct = joined / max;
  if (rem <= 0) return { label: "Lleno", color: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300", urgent: false };
  if (rem === 1) return { label: "¡Último cupo!", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", urgent: true };
  if (pct >= 0.75) return { label: `${rem} cupos`, color: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300", urgent: true };
  if (pct >= 0.5) return { label: `${rem} cupos`, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", urgent: false };
  return { label: `${rem} cupos`, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", urgent: false };
}

function relTime(iso: string) {
  const h = (new Date(iso).getTime() - Date.now()) / 3600000;
  if (h < 0) return "En curso";
  if (h < 1) return `En ${Math.round(h * 60)} min`;
  if (h < 24) return `En ${Math.floor(h)}h`;
  if (h < 48) return "Mañana";
  if (h < 168) return `En ${Math.floor(h / 24)} días`;
  return formatMatchDate(iso);
}

import { CommunityFeedTab } from "@/components/social/CommunityFeedTab";

export default function FeedPage() {
  const { profile, user, roles } = useAuth();
  const { unreadCount } = useNotifCount();
  const [location, setLocation] = useLocation();

  const getCanchasHref = () => roles?.is_cancha ? "/mis-canchas" : "/canchas";

  const [activeTab, setActiveTab] = useState<"noticias" | "eventos">("noticias");

  const [filterSport, setFilterSport] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterPrivacy, setFilterPrivacy] = useState("");
  const [filterCanchaId, setFilterCanchaId] = useState("");
  const [filterFriendsOnly, setFilterFriendsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const { matches, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useFeedData({
    sport_id: filterSport || undefined,
    city: filterCity || undefined,
  });

  const { data: sports = [] } = useQuery<Sport[]>({
    queryKey: ["sports"],
    queryFn: async () => {
      const { data } = await listSports(supabase);
      return data ?? [];
    },
  });

  const { data: canchas = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["canchas-feed-filter"],
    queryFn: async () => {
      const { data } = await listActiveCanchasBasic(supabase);
      return data ?? [];
    },
  });

  const sportsMap = useMemo(() => new Map(sports.map((s) => [s.id, s])), [sports]);

  const matchIds = useMemo(() => matches.map(m => m.id), [matches]);
  const bookingIds = useMemo(() => matches.map(m => m.cancha_booking_id).filter(Boolean) as string[], [matches]);

  const { data: userData } = useQuery({
    queryKey: ["feed-user-data", matchIds, user?.id],
    queryFn: async () => {
      return getFeedEnrichmentData(supabase, matchIds, bookingIds, user?.id);
    },
    enabled: matches.length > 0,
  });

  const participantCounts = userData?.counts ?? new Map<string, number>();
  const matchParticipants = userData?.matchUsers ?? new Map<string, Set<string>>();
  const myStatuses = userData?.statuses ?? new Map<string, string>();
  const friendIds = userData?.friends ?? new Set<string>();
  const matchCanchas = userData?.m2c ?? new Map<string, string>();

  const queryClient = useQueryClient();

  async function handleSendRequest(matchId: string) {
    if (!user) return; setSendingRequest(matchId);
    const match = matches.find((m) => m.id === matchId);
    if (match) {
      const conflict = await checkMatchConflict(supabase, user.id, {
        id: match.id,
        title: match.title,
        starts_at: match.starts_at,
        duration_minutes: match.duration_minutes,
        city: match.city,
        location: match.location,
      });
      if (conflict.conflict) { toast.error(conflict.reason, { duration: 6000 }); setSendingRequest(null); return; }
    }
    const { error } = await requestJoinMatch(supabase, matchId, user.id);
    if (error) { toast.error("No se pudo enviar la solicitud."); }
    else {
      queryClient.setQueryData(["feed-user-data", matchIds, user.id], (old: any) => {
        if (!old) return old;
        const newStatuses = new Map(old.statuses);
        newStatuses.set(matchId, "requested");
        return { ...old, statuses: newStatuses };
      });
      toast.success("¡Solicitud enviada! El organizador la revisará pronto.");
      if (match && match.organizer_id !== user.id) {
        sendNotification(supabase, match.organizer_id, "match_request", {
          match_id: match.id,
          match_title: match.title,
          requester_id: user.id,
          requester_name: profile?.full_name ?? profile?.username ?? "Alguien",
        });
      }
    }
    setSendingRequest(null);
  }

  async function handleCancelRequest(matchId: string) {
    if (!user) return; setSendingRequest(matchId);
    const { error } = await cancelJoinRequest(supabase, matchId, user.id);
    if (error) toast.error("No se pudo cancelar la solicitud.");
    else { 
      queryClient.setQueryData(["feed-user-data", matchIds, user.id], (old: any) => {
        if (!old) return old;
        const newStatuses = new Map(old.statuses);
        newStatuses.delete(matchId);
        return { ...old, statuses: newStatuses };
      });
      toast.success("Solicitud cancelada."); 
    }
    setSendingRequest(null);
  }

  function clearFilters() { setFilterSport(""); setFilterCity(""); setFilterPrivacy(""); setFilterCanchaId(""); setFilterFriendsOnly(false); }

  const filtered = useMemo(() => matches.filter((m) => {
    if (filterPrivacy === "public" && !m.is_public) return false;
    if (filterPrivacy === "private" && m.is_public) return false;
    if (filterCanchaId && matchCanchas.get(m.id) !== filterCanchaId) return false;
    if (filterFriendsOnly) { const u = matchParticipants.get(m.id); if (!u) return false; let ok = false; for (const id of u) { if (friendIds.has(id)) { ok = true; break; } } if (!ok) return false; }
    return true;
  }), [matches, filterPrivacy, filterCanchaId, filterFriendsOnly, matchCanchas, matchParticipants, friendIds]);

  const hasFilters = !!filterSport || !!filterCity || !!filterPrivacy || !!filterCanchaId || filterFriendsOnly;
  const firstName = profile?.full_name?.split(" ")[0] ?? profile?.username ?? null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <header className={`sticky top-0 z-50 bg-white dark:bg-zinc-900 ${activeTab === "eventos" ? "border-b border-border/50" : ""}`}>
        <div className="container mx-auto px-4 h-14 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <NavDrawer />
            <span className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white">PRO<span className="text-violet-600">.</span></span>
            {firstName && <span className="text-sm text-muted-foreground hidden sm:block">Hola, {firstName}</span>}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <nav className="flex items-center gap-2">
              <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/feed">
                    <button className={`p-2 rounded-lg flex items-center justify-center transition-colors ${location === "/feed" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "text-muted-foreground hover:bg-muted"}`}>
                      <Home className="size-5" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Inicio</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/chat">
                    <button className={`p-2 rounded-lg flex items-center justify-center transition-colors ${location.startsWith("/chat") ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "text-muted-foreground hover:bg-muted"}`}>
                      <MessageCircle className="size-5" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Chat</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={getCanchasHref()}>
                    <button className={`p-2 rounded-lg flex items-center justify-center transition-colors ${location.startsWith(getCanchasHref()) ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "text-muted-foreground hover:bg-muted"}`}>
                      <Building2 className="size-5" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Canchas</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-border mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/matches/new">
                    <button className="p-2 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      <Plus className="size-5" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Crear Partido</TooltipContent>
              </Tooltip>
              </TooltipProvider>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/notificaciones">
              <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <Bell className="size-4" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-600 ring-2 ring-white dark:ring-zinc-900" />}
              </button>
            </Link>
            <Link href="/perfil">
              <Avatar className="size-8 cursor-pointer ring-2 ring-violet-100 dark:ring-violet-900">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                <AvatarFallback className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold">{initialsFromName(profile?.full_name ?? profile?.username)}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>

        <div className={`bg-white dark:bg-zinc-900 py-2 px-4 z-40 relative ${activeTab === "eventos" ? "border-b border-border/50 shadow-sm" : ""}`}>
          <div className="flex bg-muted p-1 rounded-xl w-full mx-auto">
            <button 
              onClick={() => setActiveTab("noticias")}
              className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === "noticias" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Noticias
            </button>
            <button 
              onClick={() => setActiveTab("eventos")}
              className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === "eventos" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Eventos
            </button>
          </div>
        </div>

        {activeTab === "eventos" && (
          <>
            <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
              <button onClick={() => setFilterSport("")} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${filterSport === "" ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-sm" : "bg-background border-border hover:border-foreground/30 text-muted-foreground"}`}>Todos</button>
              {sports.map((sp) => (
                <button key={sp.id} onClick={() => setFilterSport(filterSport === sp.id ? "" : sp.id)} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${filterSport === sp.id ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-sm" : "bg-background border-border hover:border-foreground/30 text-muted-foreground"}`}>
                  {sp.icon && <span>{sp.icon}</span>}{sp.name}
                </button>
              ))}
              <button onClick={() => setShowFilters(!showFilters)} className={`shrink-0 ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${hasFilters ? "bg-violet-600 text-white border-transparent" : "bg-background border-border text-muted-foreground hover:border-foreground/30"}`}>
                <SlidersHorizontal className="size-3" />Filtros{hasFilters ? " ✓" : ""}
              </button>
            </div>

            {showFilters && (
              <div className="px-4 pb-3 flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={filterCity} onValueChange={(v) => setFilterCity(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Ciudad" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todas</SelectItem>{ENABLED_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select value={filterCanchaId} onValueChange={(v) => setFilterCanchaId(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Complejo / Cancha" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todas</SelectItem>{canchas.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select value={filterPrivacy} onValueChange={(v) => setFilterPrivacy(v === "all" ? "" : v)}>
                      <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Privacidad" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="public">Públicos</SelectItem><SelectItem value="private">Privados</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-muted/50 rounded-xl p-2.5 px-3">
                  <div className="flex items-center gap-2"><Users className="size-4 text-violet-600" /><Label htmlFor="friends-toggle" className="text-xs font-semibold cursor-pointer">Juegan mis amigos</Label></div>
                  <Switch id="friends-toggle" checked={filterFriendsOnly} onCheckedChange={setFilterFriendsOnly} />
                </div>
                {hasFilters && <button onClick={clearFilters} className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-2 rounded-xl hover:bg-muted transition-colors border border-dashed border-border"><X className="size-3" /> Limpiar todos los filtros</button>}
              </div>
            )}
          </>
        )}
      </header>

      <main className={`w-full mx-auto px-0 sm:px-4 max-w-2xl ${activeTab === "noticias" ? "py-0" : "py-0 sm:py-4"}`}>
        {activeTab === "noticias" ? (
          <CommunityFeedTab />
        ) : (
          <div className="px-4 py-4 sm:px-0 sm:py-0">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Partidos</h1>
            {!isLoading && <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} {filtered.length === 1 ? "partido abierto" : "partidos abiertos"}{hasFilters ? " con filtros" : ""}</p>}
          </div>
          <div className="flex gap-2">
            <Link href="/mis-partidos"><Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5"><Calendar className="size-3.5" /> Mis partidos</Button></Link>
            <Link href="/matches/new"><Button size="sm" className="rounded-xl gap-1.5 bg-violet-600 hover:bg-violet-700"><Plus className="size-3.5" /> Crear</Button></Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <FeedPostSkeleton key={i} />)}</div>
        ) : filtered.length === 0 && !hasFilters ? (
          <EmptyState
            title="El feed está vacío"
            description="Seguí jugadores o canchas para ver actividad aquí"
          />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">{filterSport ? sportsMap.get(filterSport)?.icon ?? "⚽" : "🏟️"}</div>
            <div><p className="font-semibold text-foreground mb-1">No hay partidos abiertos</p><p className="text-sm text-muted-foreground">{hasFilters ? "Probá con otros filtros o limpiá la búsqueda." : "Sé el primero en crear uno."}</p></div>
            {hasFilters ? <button onClick={clearFilters} className="text-sm text-violet-600 font-medium hover:underline">Limpiar filtros</button> : <Link href="/matches/new"><Button size="sm" className="rounded-xl">Crear partido</Button></Link>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((match) => {
              const sport = match.sport;
              const theme = getSportTheme(sport?.name);
              const joinedCount = participantCounts.get(match.id) ?? match.participants_count;
              const pct = match.max_players > 0 ? joinedCount / match.max_players : 0;
              const urgency = getUrgency(joinedCount, match.max_players);
              const barColor = pct >= 0.9 ? "bg-red-500" : pct >= 0.6 ? "bg-amber-500" : "bg-emerald-500";
              const myStatus = myStatuses.get(match.id) ?? null;
              const isMyMatch = match.organizer_id === user?.id;
              const isJoined = myStatus === "joined";
              const isFull = joinedCount >= match.max_players && !isJoined;
              const canRequest = match.is_public || friendIds.has(match.organizer_id);
              const canEnterDetail = isMyMatch || isJoined;

              let ctaEl: React.ReactNode;
              if (isMyMatch) ctaEl = <button onClick={(e) => { e.stopPropagation(); setLocation(`/matches/${match.id}`); }} className="flex items-center gap-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">Gestionar <ChevronRight className="size-3.5" /></button>;
              else if (isJoined) ctaEl = <button onClick={(e) => { e.stopPropagation(); setLocation(`/matches/${match.id}`); }} className="flex items-center gap-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">Ver partido <ChevronRight className="size-3.5" /></button>;
              else if (myStatus === "requested") ctaEl = <button disabled={sendingRequest === match.id} onClick={(e) => { e.stopPropagation(); handleCancelRequest(match.id); }} className="group flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors dark:bg-amber-900/30 dark:text-amber-400"><span>{sendingRequest === match.id ? "Cancelando..." : "Solicitud enviada"}</span>{sendingRequest !== match.id && <X className="size-3.5 opacity-60 group-hover:opacity-100" />}</button>;
              else if (isFull) ctaEl = <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">Sin cupos</span>;
              else if (!canRequest) ctaEl = <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"><Lock className="size-3" /> Solo amigos</span>;
              else ctaEl = <button disabled={sendingRequest === match.id} onClick={(e) => { e.stopPropagation(); handleSendRequest(match.id); }} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"><Send className="size-3" />{sendingRequest === match.id ? "Enviando…" : "Enviar solicitud"}</button>;

              return (
                <div key={match.id}>
                  <div onClick={canEnterDetail ? () => setLocation(`/matches/${match.id}`) : undefined} className={`group relative bg-gradient-to-br ${theme.bg} rounded-2xl border border-border/60 shadow-sm ${canEnterDetail ? "hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 cursor-pointer" : "cursor-default"} transition-all duration-300 overflow-hidden`}>
                    {urgency.urgent && !myStatus && <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse"><Flame className="size-2.5" />HOT</div>}
                    <div className="p-4 pb-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-2xl ${theme.iconBg} flex items-center justify-center text-2xl shrink-0 shadow-sm ${canEnterDetail ? "group-hover:scale-105" : ""} transition-transform duration-200`}>{sport?.name ? (sportsMap.get(match.sport?.id ?? "")?.icon ?? "🏃") : "🏃"}</div>
                        <div className="flex-1 min-w-0 pr-8">
                          <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-muted-foreground mb-1">
                            <span className="font-medium">{sport?.name ?? "Deporte"}</span><span>·</span><span>{match.city}</span>
                            {match.skill_level && <><span>·</span><span className="capitalize">{match.skill_level}</span></>}
                            {!match.is_public && <span className="inline-flex items-center gap-0.5 bg-zinc-700/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"><Lock className="size-2.5" />Privado</span>}
                          </div>
                          <h3 className={`font-bold text-[15px] leading-tight text-zinc-900 dark:text-white ${canEnterDetail ? "group-hover:text-violet-700 dark:group-hover:text-violet-300" : ""} transition-colors line-clamp-2`}>{match.title}</h3>
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3 shrink-0" />
                            <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">{relTime(match.starts_at)}</span>
                          </div>
                        </div>
                      </div>
                      {match.location && <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2.5 truncate"><MapPin className="size-3 shrink-0 text-muted-foreground/70" />{match.location}</p>}
                    </div>
                    <div className="px-4 pb-4">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} /></div>
                        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground whitespace-nowrap">{joinedCount}/{match.max_players}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5"><Users className="size-3 text-muted-foreground" /><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${urgency.color}`}>{urgency.label}</span></div>
                        {ctaEl}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <InfiniteScrollSentinel
              enabled={!!hasNextPage && !isFetchingNextPage}
              onIntersect={fetchNextPage}
            />
            {isFetchingNextPage && (
              <div className="py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            )}
            {!hasNextPage && matches.length > 0 && (
              <p className="text-center text-muted-foreground text-sm py-6">Ya viste todo el feed</p>
            )}
          </div>
        )}
          </div>
        )}
      </main>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
