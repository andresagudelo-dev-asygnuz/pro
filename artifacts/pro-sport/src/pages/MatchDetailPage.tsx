import { useEffect, useState, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Globe,
  Lock,
  Building2,
  AlertCircle,
  Mail,
  XCircle,
  Star,
  ArrowLeft,
  Send,
  Users,
  Timer,
  Zap,
  ShieldCheck,
  MessageCircle,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import type { Match, MatchParticipant, Profile, Sport, CanchaBooking, MatchInvitation } from "@/lib/types/db";
import { getMyMatchInvitation, respondToMatchInvitation, getMatchInvitations } from "@/lib/friends/api";

const supabase = createClient();

type ChatMessage = { id: string; sender_id: string; content: string; created_at: string };

function getSportGradient(sportName: string | undefined): {
  gradient: string;
  glow: string;
  accent: string;
  chipBg: string;
} {
  const n = (sportName ?? "").toLowerCase();
  if (n.includes("fut") || n.includes("soccer"))
    return {
      gradient: "from-emerald-950 via-emerald-900 to-zinc-950",
      glow: "shadow-emerald-500/30",
      accent: "#10b981",
      chipBg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
    };
  if (n.includes("pad"))
    return {
      gradient: "from-amber-950 via-amber-900 to-zinc-950",
      glow: "shadow-amber-500/30",
      accent: "#f59e0b",
      chipBg: "bg-amber-500/20 text-amber-200 border-amber-500/30",
    };
  if (n.includes("basket") || n.includes("básquet"))
    return {
      gradient: "from-orange-950 via-orange-900 to-zinc-950",
      glow: "shadow-orange-500/30",
      accent: "#f97316",
      chipBg: "bg-orange-500/20 text-orange-200 border-orange-500/30",
    };
  if (n.includes("tenis"))
    return {
      gradient: "from-lime-950 via-lime-900 to-zinc-950",
      glow: "shadow-lime-500/30",
      accent: "#84cc16",
      chipBg: "bg-lime-500/20 text-lime-200 border-lime-500/30",
    };
  if (n.includes("volei") || n.includes("vólei"))
    return {
      gradient: "from-blue-950 via-blue-900 to-zinc-950",
      glow: "shadow-blue-500/30",
      accent: "#3b82f6",
      chipBg: "bg-blue-500/20 text-blue-200 border-blue-500/30",
    };
  return {
    gradient: "from-violet-950 via-violet-900 to-zinc-950",
    glow: "shadow-violet-500/30",
    accent: "#7c3aed",
    chipBg: "bg-violet-500/20 text-violet-200 border-violet-500/30",
  };
}

export default function MatchDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [match, setMatch] = useState<Match | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<MatchParticipant[]>([]);
  const [profilesById, setProfilesById] = useState<Map<string, Profile>>(new Map());
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [canchaBooking, setCanchaBooking] = useState<CanchaBooking & { canchas?: { name: string } } | null>(null);
  const [myInvitation, setMyInvitation] = useState<MatchInvitation | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<(MatchInvitation & { profile?: Profile })[]>([]);
  const [respondingInvite, setRespondingInvite] = useState(false);
  const [cancellingMatch, setCancellingMatch] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [submittingRatings, setSubmittingRatings] = useState(false);
  const [ratingsSubmitted, setRatingsSubmitted] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: matchRaw } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
      if (!matchRaw) { setError("Partido no encontrado"); setLoading(false); return; }
      const m = matchRaw as Match;
      setMatch(m);

      const [{ data: sportData }, { data: orgData }, { data: partsData }, { data: messagesData }, { data: profileRaw }, bookingRes, invRes, allInvRes] = await Promise.all([
        supabase.from("sports").select("*").eq("id", m.sport_id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", m.organizer_id).maybeSingle(),
        supabase.from("match_participants").select("*").eq("match_id", m.id).order("joined_at"),
        supabase.from("messages").select("*").eq("match_id", m.id).order("created_at", { ascending: true }).limit(200),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        m.cancha_booking_id
          ? supabase.from("cancha_bookings").select("*, canchas(name)").eq("id", m.cancha_booking_id).maybeSingle()
          : Promise.resolve({ data: null }),
        getMyMatchInvitation(supabase, m.id, user.id),
        getMatchInvitations(supabase, m.id),
      ]);
      if (bookingRes.data) setCanchaBooking(bookingRes.data as typeof canchaBooking);
      if (invRes.data) setMyInvitation(invRes.data);

      if (allInvRes.data && allInvRes.data.length > 0) {
        const inviteeIds = allInvRes.data.map((inv) => inv.invitee_id);
        const { data: invProfiles } = await supabase.from("profiles").select("*").in("id", inviteeIds);
        const profileMap = new Map(((invProfiles ?? []) as Profile[]).map((p) => [p.id, p]));
        setPendingInvitations(allInvRes.data.map((inv) => ({ ...inv, profile: profileMap.get(inv.invitee_id) })));
      }

      setSport(sportData as Sport | null);
      setOrganizer(orgData as Profile | null);
      setCurrentUser(profileRaw as Profile | null);

      const parts = (partsData ?? []) as MatchParticipant[];
      setParticipants(parts);
      setMessages((messagesData ?? []) as ChatMessage[]);

      const pIds = Array.from(new Set(parts.map((p) => p.user_id).concat(m.organizer_id)));
      const { data: ppData } = await supabase.from("profiles").select("*").in("id", pIds);
      const map = new Map<string, Profile>();
      ((ppData ?? []) as Profile[]).forEach((p) => map.set(p.id, p));
      setProfilesById(map);

      if (m.status === "completed") {
        const { data: existingRatings } = await supabase
          .from("match_ratings")
          .select("id")
          .eq("match_id", m.id)
          .eq("rater_id", user.id);
        if (existingRatings && existingRatings.length > 0) setRatingsSubmitted(true);
      }

      setLoading(false);
    })();
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`match-rt-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${id}` },
        (payload: { new: Record<string, unknown> }) => {
          const newMsg = payload.new as unknown as ChatMessage;
          setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_participants", filter: `match_id=eq.${id}` },
        async (payload: { new: Record<string, unknown> }) => {
          const newPart = payload.new as unknown as MatchParticipant;
          setParticipants((prev) => prev.some((p) => p.user_id === newPart.user_id) ? prev : [...prev, newPart]);
          const { data } = await supabase.from("profiles").select("*").eq("id", newPart.user_id).maybeSingle();
          if (data) setProfilesById((prev) => new Map([...prev, [data.id, data as Profile]]));
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "match_participants", filter: `match_id=eq.${id}` },
        (payload: { old: Record<string, unknown> }) => {
          setParticipants((prev) => prev.filter((p) => p.user_id !== (payload.old as unknown as MatchParticipant).user_id));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleJoin() {
    if (!match || !user) return;
    setJoining(true);
    const myPart = participants.find((p) => p.user_id === user.id);
    if (myPart) {
      await supabase.from("match_participants").delete().eq("match_id", match.id).eq("user_id", user.id);
      setParticipants((prev) => prev.filter((p) => p.user_id !== user.id));
      toast.success("Saliste del partido.");
    } else {
      const { data: newPart } = await supabase.from("match_participants").insert({ match_id: match.id, user_id: user.id, status: "joined" }).select().single();
      if (newPart) {
        setParticipants((prev) => [...prev, newPart as MatchParticipant]);
        toast.success("¡Te uniste al partido! 🎉");
      }
    }
    setJoining(false);
  }

  async function handleRespondInvitation(status: "accepted" | "rejected") {
    if (!myInvitation) return;
    setRespondingInvite(true);
    const { error } = await respondToMatchInvitation(supabase, myInvitation.id, status);
    if (error) { toast.error(error); }
    else {
      setMyInvitation((prev) => prev ? { ...prev, status } : null);
      if (status === "accepted" && match && user) {
        const { data: newPart } = await supabase.from("match_participants").insert({ match_id: match.id, user_id: user.id, status: "joined" }).select().single();
        if (newPart) setParticipants((prev) => [...prev, newPart as MatchParticipant]);
        toast.success("¡Te uniste al partido!");
      } else if (status === "rejected") {
        toast.success("Rechazaste la invitación.");
      }
    }
    setRespondingInvite(false);
  }

  async function handleCancelMatch() {
    if (!match || !user) return;
    setCancellingMatch(true);
    const { error } = await supabase.from("matches").update({ status: "cancelled" }).eq("id", match.id);
    if (error) { toast.error("No se pudo cancelar el partido."); }
    else {
      toast.success("El partido fue cancelado.");
      setMatch((m) => (m ? { ...m, status: "cancelled" } : m));
      setShowCancelConfirm(false);
    }
    setCancellingMatch(false);
  }

  async function handleConfirm() {
    if (!match || !user) return;
    setConfirming(true);
    await supabase.from("match_participants").update({ confirmed_at: new Date().toISOString() }).eq("match_id", match.id).eq("user_id", user.id);
    setParticipants((prev) => prev.map((p) => p.user_id === user.id ? { ...p, confirmed_at: new Date().toISOString() } : p));
    toast.success("¡Asistencia confirmada!");
    setConfirming(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatMessage.trim() || !match || !user) return;
    setSendingMsg(true);
    const { data: msg } = await supabase.from("messages").insert({ match_id: match.id, sender_id: user.id, content: chatMessage.trim() }).select().single();
    if (msg) setMessages((prev) => prev.some((m) => m.id === (msg as ChatMessage).id) ? prev : [...prev, msg as ChatMessage]);
    setChatMessage("");
    setSendingMsg(false);
    setTimeout(() => chatInputRef.current?.focus(), 50);
  }

  async function handleSubmitRatings() {
    if (!user || !match) return;
    setSubmittingRatings(true);
    const ratingsToInsert = Object.entries(myRatings)
      .filter(([, rating]) => rating > 0)
      .map(([rated_id, rating]) => ({ match_id: match.id, rater_id: user.id, rated_id, rating }));

    if (ratingsToInsert.length === 0) {
      toast.error("Seleccioná al menos una calificación.");
      setSubmittingRatings(false);
      return;
    }

    const { error } = await supabase.from("match_ratings").upsert(ratingsToInsert, { onConflict: "match_id,rater_id,rated_id" });
    if (error) { toast.error("Error al guardar calificaciones: " + error.message); }
    else { toast.success("¡Calificaciones enviadas!"); setRatingsSubmitted(true); }
    setSubmittingRatings(false);
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
          <div className="h-64 rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
          <div className="h-48 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (error || !match) {
    return (
      <AppLayout>
        <div className="p-6 bg-destructive/15 text-destructive rounded-xl text-center">
          {error ?? "Partido no encontrado"}
        </div>
      </AppLayout>
    );
  }

  const joinedParts = participants.filter((p) => p.status === "joined");
  const joinedCount = joinedParts.length;
  const myPart = participants.find((p) => p.user_id === user?.id);
  const isJoined = !!myPart && myPart.status === "joined";
  const isConfirmed = isJoined && !!myPart?.confirmed_at;
  const isOrganizer = match.organizer_id === user?.id;
  const isFull = joinedCount >= match.max_players && !isJoined;
  const canChat = isJoined || isOrganizer;
  const isCompleted = match.status === "completed";
  const isCancelled = match.status === "cancelled";
  const othersToRate = joinedParts.filter((p) => p.user_id !== user?.id);
  const showRating = isCompleted && (isJoined || isOrganizer) && !ratingsSubmitted && othersToRate.length > 0;
  const occupancyPct = match.max_players > 0 ? joinedCount / match.max_players : 0;
  const theme = getSportGradient(sport?.name);

  const StatusBadge = () => {
    if (isCancelled) return <Badge variant="destructive" className="uppercase tracking-wide text-[10px]">Cancelado</Badge>;
    if (isCompleted) return <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide text-[10px]">Finalizado</Badge>;
    if (isFull) return <Badge className="bg-zinc-500/20 text-zinc-300 border border-zinc-500/30 uppercase tracking-wide text-[10px]">Lleno</Badge>;
    return null;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">

        {/* ── HERO HEADER ── */}
        <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${theme.gradient} shadow-2xl ${theme.glow}`}>
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')]" />

          {/* Back button */}
          <button
            onClick={() => setLocation("/feed")}
            className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center text-white z-10"
          >
            <ArrowLeft className="size-4" />
          </button>

          {/* Status badges */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <StatusBadge />
            {match.is_public ? (
              <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border ${theme.chipBg} uppercase tracking-wide`}>
                <Globe className="size-2.5" /> Abierto
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border bg-amber-500/20 text-amber-200 border-amber-500/30 uppercase tracking-wide">
                <Lock className="size-2.5" /> Privado
              </span>
            )}
          </div>

          {/* Content */}
          <div className="px-5 pt-16 pb-6">
            {/* Sport icon */}
            <div className="text-6xl mb-3 drop-shadow-lg" aria-hidden>
              {sport?.icon ?? "🏟️"}
            </div>

            {/* Sport + city */}
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">
              {sport?.name ?? "Partido"} · {match.city}
              {match.skill_level && ` · ${match.skill_level}`}
            </p>

            {/* Match title */}
            <h1 className="text-2xl font-black text-white leading-tight mb-4">
              {match.title}
            </h1>

            {/* Glassmorphism stats bar */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-white/90 text-xs font-medium border border-white/10">
                <Clock className="size-3.5 text-white/60" />
                {formatMatchDate(match.starts_at)}
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-white/90 text-xs font-medium border border-white/10">
                <Timer className="size-3.5 text-white/60" />
                {match.duration_minutes} min
              </div>
              {match.skill_level && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-white/90 text-xs font-medium border border-white/10 capitalize">
                  <Zap className="size-3.5 text-white/60" />
                  {match.skill_level}
                </div>
              )}
            </div>

            {/* Occupancy progress */}
            <div className="mb-1 flex items-center justify-between text-xs text-white/60">
              <span className="font-medium">{joinedCount} de {match.max_players} jugadores</span>
              <span className={`font-bold ${occupancyPct >= 0.9 ? "text-red-300" : occupancyPct >= 0.6 ? "text-amber-300" : "text-emerald-300"}`}>
                {match.max_players - joinedCount > 0
                  ? `${match.max_players - joinedCount} cupo${match.max_players - joinedCount !== 1 ? "s" : ""} libre${match.max_players - joinedCount !== 1 ? "s" : ""}`
                  : "¡Lleno!"}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(occupancyPct * 100, 100)}%`,
                  background: occupancyPct >= 0.9
                    ? "linear-gradient(90deg, #ef4444, #f87171)"
                    : occupancyPct >= 0.6
                    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                    : "linear-gradient(90deg, #10b981, #34d399)",
                }}
              />
            </div>

            {/* Organizer badge */}
            {organizer && (
              <div className="mt-4 flex items-center gap-2">
                <Crown className="size-3.5 text-white/40" />
                <Link href={`/profile/${organizer.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Avatar className="size-5 ring-1 ring-white/20">
                    {organizer.avatar_url && <AvatarImage src={organizer.avatar_url} />}
                    <AvatarFallback className="text-[9px] bg-white/20 text-white">{initialsFromName(organizer.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-white/60">
                    Organiza <span className="text-white/90 font-semibold">{organizer.full_name ?? organizer.username}</span>
                    {isOrganizer && " (vos)"}
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── LOCATION ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <MapPin className="size-4 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Dónde</p>
            <p className="text-sm font-semibold text-foreground">{match.location}</p>
          </div>
        </div>

        {/* ── CANCHA BOOKING ── */}
        {canchaBooking && (
          <div className={`rounded-2xl p-4 flex items-start gap-3 border ${
            canchaBooking.status === "pendiente"
              ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700"
              : canchaBooking.status === "confirmada"
              ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700"
              : "bg-muted border-border"
          }`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              canchaBooking.status === "pendiente" ? "bg-amber-100 dark:bg-amber-900/40" :
              canchaBooking.status === "confirmada" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-muted"
            }`}>
              {canchaBooking.status === "pendiente" ? <AlertCircle className="size-4 text-amber-600" />
                : canchaBooking.status === "confirmada" ? <CheckCircle2 className="size-4 text-emerald-600" />
                : <Building2 className="size-4 text-muted-foreground" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${
                canchaBooking.status === "pendiente" ? "text-amber-800 dark:text-amber-300" :
                canchaBooking.status === "confirmada" ? "text-emerald-800 dark:text-emerald-300" : "text-foreground"
              }`}>
                {canchaBooking.status === "pendiente" && "Cancha pendiente de aprobación"}
                {canchaBooking.status === "confirmada" && "Cancha confirmada ✓"}
                {canchaBooking.status === "cancelada" && "Reserva de cancha cancelada"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(canchaBooking as { canchas?: { name: string } }).canchas?.name}
                {" · "}{canchaBooking.start_time?.substring(0, 5)}–{canchaBooking.end_time?.substring(0, 5)}
                {" · "}{canchaBooking.booking_date}
              </p>
            </div>
          </div>
        )}

        {/* ── INVITATION ── */}
        {myInvitation && myInvitation.status === "pending" && !isJoined && (
          <div className="rounded-2xl border border-violet-200 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Mail className="size-4 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">Te invitaron a este partido</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={respondingInvite}
                onClick={() => handleRespondInvitation("accepted")}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex-1"
              >
                Aceptar e ingresar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={respondingInvite}
                onClick={() => handleRespondInvitation("rejected")}
                className="border-violet-300 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-xl"
              >
                Rechazar
              </Button>
            </div>
          </div>
        )}

        {myInvitation && myInvitation.status === "rejected" && !isJoined && (
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground text-center">
            Rechazaste la invitación a este partido.
          </div>
        )}

        {/* ── CTA: JOIN / LEAVE ── */}
        {!isOrganizer && match.status === "open" && (
          <div className={`rounded-2xl border overflow-hidden ${
            isJoined
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
              : isFull
              ? "border-border bg-muted/30"
              : "border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20"
          } p-5`}>
            {isJoined ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">¡Estás dentro!</p>
                    <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
                      {isConfirmed ? "Asistencia confirmada ✓" : "Confirmá tu asistencia antes del partido"}
                    </p>
                  </div>
                </div>
                {!isConfirmed && (
                  <Button
                    size="sm"
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="size-4 mr-2" />
                    {confirming ? "Confirmando…" : "Confirmar asistencia"}
                  </Button>
                )}
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  {joining ? "…" : "Salir del partido"}
                </button>
              </div>
            ) : isFull ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Users className="size-5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Partido lleno</p>
                  <p className="text-xs">Ya no hay cupos disponibles.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-bold text-violet-900 dark:text-violet-200 text-sm mb-0.5">¿Querés jugar?</p>
                  <p className="text-xs text-violet-700/70 dark:text-violet-400/70">
                    Quedan {match.max_players - joinedCount} cupos · Unite ahora
                  </p>
                </div>
                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white h-11"
                >
                  {joining ? "Uniéndote…" : "¡Unirme al partido!"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── CONFIRM ATTENDANCE (organizer: always confirmed) ── */}
        {isJoined && !isConfirmed && match.status === "open" && isOrganizer && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-sm">
              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
              <span><strong>Confirmá tu asistencia</strong> 3h antes del partido.</span>
            </div>
            <Button size="sm" variant="outline" disabled={confirming} onClick={handleConfirm} className="rounded-xl shrink-0">
              {confirming ? "…" : "Confirmar"}
            </Button>
          </div>
        )}

        {/* ── CANCEL MATCH ── */}
        {isOrganizer && match.status === "open" && (
          <div>
            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors text-center py-1"
              >
                Cancelar partido
              </button>
            ) : (
              <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 flex flex-col gap-3">
                <p className="text-sm font-bold text-red-800 dark:text-red-300">¿Cancelar el partido?</p>
                <p className="text-xs text-red-700/80 dark:text-red-400/70">Esta acción notificará a los jugadores y no se puede deshacer.</p>
                <div className="flex gap-2">
                  <Button size="sm" disabled={cancellingMatch} className="bg-red-600 hover:bg-red-700 text-white rounded-xl flex-1" onClick={handleCancelMatch}>
                    {cancellingMatch ? "Cancelando…" : "Sí, cancelar"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={cancellingMatch} onClick={() => setShowCancelConfirm(false)} className="rounded-xl">
                    No, volver
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DESCRIPTION ── */}
        {match.description && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-4">
            <p className="text-sm text-foreground/90 leading-relaxed">{match.description}</p>
          </div>
        )}

        {/* ── POST-MATCH RATING ── */}
        {showRating && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 px-5 py-4 border-b border-amber-200/60 dark:border-amber-800/40">
              <div className="flex items-center gap-2">
                <Star className="size-5 text-amber-500 fill-amber-500" />
                <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">Calificá a tus compañeros</h2>
              </div>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mt-0.5">Tu opinión construye la comunidad PRO.</p>
            </div>
            <div className="p-5">
              <ul className="flex flex-col divide-y divide-border/40">
                {othersToRate.map((p) => {
                  const pp = profilesById.get(p.user_id);
                  const currentRating = myRatings[p.user_id] ?? 0;
                  return (
                    <li key={p.user_id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-9">
                          {pp?.avatar_url && <AvatarImage src={pp.avatar_url} />}
                          <AvatarFallback className="text-xs bg-muted">{initialsFromName(pp?.full_name ?? null)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{pp?.full_name ?? pp?.username ?? "Jugador"}</p>
                          {pp?.rating_count > 0 && (
                            <p className="text-xs text-muted-foreground">★ {pp.rating_avg?.toFixed(1)} ({pp.rating_count})</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setMyRatings((prev) => ({ ...prev, [p.user_id]: star }))}
                            className="p-0.5 transition-transform active:scale-90"
                          >
                            <Star className={`size-6 transition-colors ${star <= currentRating ? "text-amber-400 fill-amber-400" : "text-zinc-200 dark:text-zinc-700"}`} />
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Button
                className="mt-4 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                disabled={submittingRatings || Object.keys(myRatings).length === 0}
                onClick={handleSubmitRatings}
              >
                {submittingRatings ? "Guardando…" : "Enviar calificaciones"}
              </Button>
            </div>
          </div>
        )}

        {isCompleted && ratingsSubmitted && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-5 shrink-0" />
            <p className="text-sm font-medium">Ya enviaste tus calificaciones para este partido.</p>
          </div>
        )}

        {/* ── PENDING INVITATIONS (organizer only) ── */}
        {isOrganizer && pendingInvitations.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
              <Mail className="size-4 text-violet-500" />
              <h2 className="text-sm font-bold">
                Invitaciones ({pendingInvitations.filter((i) => i.status === "pending").length} pendientes)
              </h2>
            </div>
            <ul className="divide-y divide-border/40">
              {pendingInvitations.map((inv) => {
                const pp = inv.profile;
                return (
                  <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        {pp?.avatar_url && <AvatarImage src={pp.avatar_url} />}
                        <AvatarFallback className="text-xs">{initialsFromName(pp?.full_name ?? null)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{pp?.full_name ?? pp?.username ?? "Usuario"}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      inv.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : inv.status === "accepted" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {inv.status === "pending" ? "Pendiente" : inv.status === "accepted" ? "Aceptó" : "Rechazó"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ── PLAYERS ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-bold">Jugadores</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              {joinedCount} / {match.max_players}
            </span>
          </div>

          {joinedParts.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nadie se unió todavía. ¡Sé el primero!
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {joinedParts.map((p) => {
                const pp = profilesById.get(p.user_id);
                if (!pp) return null;
                const isOrganizerRow = p.user_id === match.organizer_id;
                return (
                  <li key={p.user_id} className="flex items-center justify-between px-5 py-3">
                    <Link href={`/profile/${pp.id}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
                      <div className="relative">
                        <Avatar className="size-10">
                          {pp.avatar_url && <AvatarImage src={pp.avatar_url} />}
                          <AvatarFallback className="text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                            {initialsFromName(pp.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {isOrganizerRow && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                            <Crown className="size-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {pp.full_name ?? pp.username ?? "—"}
                          {isOrganizerRow && <span className="ml-1.5 text-[10px] text-violet-500 font-bold">ORGANIZA</span>}
                        </p>
                        {pp.rating_count > 0 && (
                          <p className="text-xs text-muted-foreground">
                            <Star className="size-2.5 inline fill-amber-400 text-amber-400 mr-0.5" />
                            {pp.rating_avg?.toFixed ? pp.rating_avg.toFixed(1) : pp.rating_avg} ({pp.rating_count})
                          </p>
                        )}
                      </div>
                    </Link>
                    {p.confirmed_at ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="size-3" /> Confirmado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        <Clock className="size-3" /> Pendiente
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Empty slots */}
          {joinedCount < match.max_players && (
            <div className="px-5 py-3 border-t border-border/40 flex items-center gap-2">
              {Array.from({ length: Math.min(match.max_players - joinedCount, 5) }).map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/40"
                >
                  <span className="text-lg">+</span>
                </div>
              ))}
              {match.max_players - joinedCount > 5 && (
                <span className="text-xs text-muted-foreground">+{match.max_players - joinedCount - 5} más</span>
              )}
            </div>
          )}
        </div>

        {/* ── CHAT ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
            <MessageCircle className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">Chat del partido</h2>
            {canChat && messages.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">{messages.length} mensaje{messages.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {canChat ? (
            <div>
              {/* Messages */}
              <div className="max-h-72 overflow-y-auto flex flex-col gap-1 p-4 bg-zinc-50/50 dark:bg-zinc-950/30">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">
                    Sin mensajes. ¡Rompé el hielo!
                  </p>
                )}
                {messages.map((msg) => {
                  const author = profilesById.get(msg.sender_id);
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      {!isMe && (
                        <Avatar className="size-6 shrink-0 mb-0.5">
                          {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                          <AvatarFallback className="text-[9px] bg-violet-100 dark:bg-violet-900/30 text-violet-700">{initialsFromName(author?.full_name)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                        {!isMe && (
                          <span className="text-[10px] text-muted-foreground pl-1 font-medium">
                            {author?.full_name?.split(" ")[0] ?? author?.username ?? ""}
                          </span>
                        )}
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? "bg-violet-600 text-white rounded-br-sm"
                            : "bg-white dark:bg-zinc-800 border border-border/60 text-foreground rounded-bl-sm shadow-sm"
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 px-1">
                          {new Date(msg.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2 p-3 border-t border-border/40 bg-white dark:bg-zinc-900">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Escribí un mensaje…"
                  className="flex-1 rounded-xl border border-input bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sendingMsg || !chatMessage.trim()}
                  className="rounded-xl w-10 h-10 bg-violet-600 hover:bg-violet-700 shrink-0"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="p-6 text-center">
              <MessageCircle className="size-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Unite al partido para chatear con los jugadores.</p>
            </div>
          )}
        </div>

        {/* Back */}
        <button
          onClick={() => setLocation("/feed")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start pb-2"
        >
          <ArrowLeft className="size-4" /> Volver al feed
        </button>
      </div>
    </AppLayout>
  );
}
