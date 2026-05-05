import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import {
  CheckCircle2, Clock, Globe, Lock, Building2,
  AlertCircle, Mail, Star, ArrowLeft, Send, Users,
  Timer, Zap, ShieldCheck, MessageCircle, Crown, UserPlus,
  ListOrdered, Phone, DollarSign, CalendarCheck, MapPin, X, Check, Trash2, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import type { Match, MatchParticipant, Profile, Sport, CanchaBooking, MatchInvitation, MatchWaitlist } from "@/lib/types/db";
import { getMyMatchInvitation, respondToMatchInvitation, getMatchInvitations, getFriends, sendMatchInvitations } from "@/lib/friends/api";
import { checkMatchConflict } from "@/lib/matches/conflicts";
import type { FriendWithProfile } from "@/lib/friends/api";
import { useMatchDetail, type ChatMessage, type FullBooking } from "@/hooks/useMatchDetail";

const supabase = createClient();

// Move logic to hook

// ─── Sport color theme ──────────────────────────────────────────────────────
function getSportGradient(sportName: string | undefined) {
  const n = (sportName ?? "").toLowerCase();
  if (n.includes("fut") || n.includes("soccer"))
    return { gradient: "from-emerald-950 via-emerald-900 to-zinc-950", glow: "shadow-emerald-500/20", accent: "#10b981", chipBg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30" };
  if (n.includes("pad"))
    return { gradient: "from-amber-950 via-amber-900 to-zinc-950", glow: "shadow-amber-500/20", accent: "#f59e0b", chipBg: "bg-amber-500/20 text-amber-200 border-amber-500/30" };
  if (n.includes("basket") || n.includes("básquet"))
    return { gradient: "from-orange-950 via-orange-900 to-zinc-950", glow: "shadow-orange-500/20", accent: "#f97316", chipBg: "bg-orange-500/20 text-orange-200 border-orange-500/30" };
  if (n.includes("tenis"))
    return { gradient: "from-lime-950 via-lime-900 to-zinc-950", glow: "shadow-lime-500/20", accent: "#84cc16", chipBg: "bg-lime-500/20 text-lime-200 border-lime-500/30" };
  if (n.includes("volei") || n.includes("vólei"))
    return { gradient: "from-blue-950 via-blue-900 to-zinc-950", glow: "shadow-blue-500/20", accent: "#3b82f6", chipBg: "bg-blue-500/20 text-blue-200 border-blue-500/30" };
  return { gradient: "from-violet-950 via-violet-900 to-zinc-950", glow: "shadow-violet-500/20", accent: "#7c3aed", chipBg: "bg-violet-500/20 text-violet-200 border-violet-500/30" };
}

// ─── Booking status helpers ─────────────────────────────────────────────────
const BOOKING_STATUS_MAP = {
  pendiente:  { label: "Pendiente de aprobación", color: "text-amber-700 dark:text-amber-300",  bg: "bg-amber-50 dark:bg-amber-950/40",   border: "border-amber-200 dark:border-amber-800",   dot: "bg-amber-500"  },
  confirmada: { label: "Cancha confirmada",        color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  cancelada:  { label: "Reserva cancelada",        color: "text-zinc-500",                       bg: "bg-zinc-50 dark:bg-zinc-800/40",      border: "border-zinc-200 dark:border-zinc-700",      dot: "bg-zinc-400"   },
};

export default function MatchDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const {
    match, sport, organizer, participants, profilesById, canchaBooking,
    loading, error, messages, sendingMsg, myInvitation, pendingInvitations, waitlist,
    sendMessage, joinMatch, leaveMatch, requestJoin, confirmAttendance, cancelMatch,
    joinWaitlist, acceptJoinRequest, rejectJoinRequest, respondInvitation, refresh
  } = useMatchDetail(id!, user?.id);

  // UI state
  const [chatMessage, setChatMessage]   = useState("");
  const [joining, setJoining]           = useState(false);
  const [requesting, setRequesting]     = useState(false);
  const [acceptingRequest, setAcceptingRequest] = useState<string | null>(null);
  const [confirming, setConfirming]     = useState(false);
  const [cancellingMatch, setCancellingMatch] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const chatBottomRef                   = useRef<HTMLDivElement>(null);
  const chatInputRef                    = useRef<HTMLInputElement>(null);

  // Invitation (my invite)
  const [respondingInvite, setRespondingInvite] = useState(false);

  // Invite friends panel
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [friends, setFriends]           = useState<FriendWithProfile[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [sendingInvites, setSendingInvites] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  // Waitlist
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  // Rating
  const [myRatings, setMyRatings]       = useState<Record<string, number>>({});
  const [submittingRatings, setSubmittingRatings] = useState(false);
  const [ratingsSubmitted, setRatingsSubmitted] = useState(false);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    setJoining(true);
    const isParticipating = participants.some((p) => p.user_id === user?.id && p.status === "joined");
    if (isParticipating) await leaveMatch();
    else await joinMatch();
    setJoining(false);
  };

  async function handleConfirm() {
    setConfirming(true);
    await confirmAttendance();
    setConfirming(false);
  }

  async function handleCancelMatch() {
    setCancellingMatch(true);
    await cancelMatch();
    setCancellingMatch(false);
    setShowCancelConfirm(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    await sendMessage(chatMessage);
    setChatMessage("");
    setTimeout(() => chatInputRef.current?.focus(), 50);
  }

  async function handleJoinWaitlist() {
    setJoiningWaitlist(true);
    await joinWaitlist();
    setJoiningWaitlist(false);
  }

  async function handleAcceptRequest(uid: string) {
    setAcceptingRequest(uid);
    await acceptJoinRequest(uid);
    setAcceptingRequest(null);
  }

  async function handleRejectRequest(uid: string) {
    setAcceptingRequest(uid);
    await rejectJoinRequest(uid);
    setAcceptingRequest(null);
  }

  async function handleRespondInvitation(status: "accepted" | "rejected") {
    if (!myInvitation) return;
    setRespondingInvite(true);
    await respondInvitation(myInvitation.id, status);
    setRespondingInvite(false);
  }

  async function handleRequestJoin() {
    setRequesting(true);
    const conflict = await checkMatchConflict(supabase, user!.id, match!);
    if (conflict.conflict) {
      toast.error(conflict.reason, { duration: 6000 });
    } else {
      await requestJoin();
    }
    setRequesting(false);
  }

  async function handleSubmitRatings() {
    if (!user || !match) return;
    setSubmittingRatings(true);
    const rows = Object.entries(myRatings)
      .filter(([, r]) => r > 0)
      .map(([rated_id, rating]) => ({
        match_id: match.id,
        rater_id: user.id,
        rated_id,
        rating,
      }));
    if (rows.length === 0) {
      toast.error("Seleccioná al menos una calificación.");
      setSubmittingRatings(false);
      return;
    }
    const { error } = await supabase.from("match_ratings").upsert(rows, { onConflict: "match_id,rater_id,rated_id" });
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("¡Calificaciones enviadas!");
      setRatingsSubmitted(true);
    }
    setSubmittingRatings(false);
  }

  async function handleOpenInvitePanel() {
    setShowInvitePanel(true);
    if (!friendsLoaded && user) {
      const { data } = await getFriends(supabase, user.id);
      const participantIds = new Set(participants.map((p) => p.user_id));
      const invitedIds = new Set(pendingInvitations.map((i) => i.invitee_id));
      setFriends((data ?? []).filter((f) => !participantIds.has(f.profile.id) && !invitedIds.has(f.profile.id)));
      setFriendsLoaded(true);
    }
  }

  async function handleSendInvites() {
    if (!match || !user || selectedFriendIds.size === 0) return;
    setSendingInvites(true);
    const { error } = await sendMatchInvitations(supabase, match.id, user.id, Array.from(selectedFriendIds));
    if (error) { toast.error("Error al enviar invitaciones."); }
    else {
      toast.success(`Invitaciones enviadas a ${selectedFriendIds.size} jugador${selectedFriendIds.size !== 1 ? "es" : ""}.`);
      setShowInvitePanel(false);
      setSelectedFriendIds(new Set());
    }
    setSendingInvites(false);
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return (
    <AppLayout>
      <div className="flex flex-col gap-3 max-w-2xl mx-auto">
        <div className="h-10 w-32 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="h-64 rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
      </div>
    </AppLayout>
  );

  if (error || !match) return (
    <AppLayout>
      <div className="p-6 bg-destructive/15 text-destructive rounded-xl text-center">{error ?? "Partido no encontrado"}</div>
    </AppLayout>
  );

  // ── Access guard: must be organizer or joined participant ──────────────────
  {
    const _isOrg = match.organizer_id === user?.id;
    const _myPart = participants.find((p) => p.user_id === user?.id);
    const _isJoined = _myPart?.status === "joined";

    if (!_isOrg && !_isJoined) {
      const _myStatus = _myPart?.status ?? null;
      const _hasPendingInvite = myInvitation?.status === "pending";

      // Pending invitation → show accept/reject screen
      if (_hasPendingInvite) {
        return (
          <AppLayout>
            <div className="flex flex-col gap-4 max-w-md mx-auto py-8">
              <button onClick={() => setLocation("/feed")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground self-start">
                <ArrowLeft className="size-4" /> Volver al feed
              </button>
              <div className="rounded-2xl border border-violet-200 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                    <Mail className="size-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="font-bold text-violet-900 dark:text-violet-200">Te invitaron a un partido</p>
                    <p className="text-xs text-violet-700/70 dark:text-violet-400/70">Aceptá para ver todos los detalles</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground mb-4">{match.title}</p>
                <div className="flex gap-2">
                  <Button disabled={respondingInvite} onClick={() => handleRespondInvitation("accepted")} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex-1">
                    Aceptar e ingresar
                  </Button>
                  <Button variant="outline" disabled={respondingInvite} onClick={() => handleRespondInvitation("rejected")} className="border-violet-300 text-violet-700 dark:text-violet-300 rounded-xl">
                    Rechazar
                  </Button>
                </div>
              </div>
            </div>
          </AppLayout>
        );
      }

      // Pending join request → show waiting screen
      if (_myStatus === "requested") {
        return (
          <AppLayout>
            <div className="flex flex-col gap-4 max-w-md mx-auto py-8">
              <button onClick={() => setLocation("/feed")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground self-start">
                <ArrowLeft className="size-4" /> Volver al feed
              </button>
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-4">
                  <Clock className="size-8 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="font-bold text-amber-900 dark:text-amber-200 text-lg mb-1">Solicitud enviada</p>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/70 mb-2">
                  Tu solicitud para <span className="font-semibold">{match.title}</span> está pendiente de aprobación.
                </p>
                <p className="text-xs text-muted-foreground">El organizador te aceptará pronto. Recibirás una notificación cuando sea aprobada.</p>
              </div>
            </div>
          </AppLayout>
        );
      }

      // No connection → access denied
      return (
        <AppLayout>
          <div className="flex flex-col gap-4 max-w-md mx-auto py-8">
            <button onClick={() => setLocation("/feed")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground self-start">
              <ArrowLeft className="size-4" /> Volver al feed
            </button>
            <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Lock className="size-8 text-muted-foreground/50" />
              </div>
              <p className="font-bold text-foreground text-lg mb-1">Acceso restringido</p>
              <p className="text-sm text-muted-foreground mb-4">
                {match.is_public
                  ? "Enviá una solicitud para unirte a este partido y ver todos sus detalles."
                  : "Este partido es privado. Solo los amigos del organizador pueden solicitar unirse."}
              </p>
              <Button onClick={() => setLocation("/feed")} variant="outline" className="rounded-xl">
                Volver al feed
              </Button>
            </div>
          </div>
        </AppLayout>
      );
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const joinedParts    = participants.filter((p) => p.status === "joined");
  const requestedParts = participants.filter((p) => p.status === "requested");
  const joinedCount    = joinedParts.length;
  const myPart         = participants.find((p) => p.user_id === user?.id);
  const isJoined       = !!myPart && myPart.status === "joined";
  const isConfirmed    = isJoined && !!myPart?.confirmed_at;
  const isOrganizer    = match.organizer_id === user?.id;
  const isFull         = joinedCount >= match.max_players && !isJoined;
  const canChat        = isJoined || isOrganizer;
  const isCompleted    = match.status === "completed";
  const isCancelled    = match.status === "cancelled";
  const matchPassed    = new Date(match.starts_at) < new Date();
  const spotsLeft      = match.max_players - joinedCount;
  const occupancyPct   = match.max_players > 0 ? joinedCount / match.max_players : 0;
  const othersToRate   = joinedParts.filter((p) => p.user_id !== user?.id);
  const showRating     = isCompleted && (isJoined || isOrganizer) && !ratingsSubmitted && othersToRate.length > 0;
  const myWaitEntry    = waitlist.find((w) => w.user_id === user?.id);
  const isOnWaitlist   = !!myWaitEntry;
  const myWaitPosition = isOnWaitlist ? waitlist.findIndex((w) => w.user_id === user?.id) + 1 : null;
  const canJoinWaitlist = !isJoined && !isOrganizer && isFull && !matchPassed && match.status === "open";
  const canInvite      = (isJoined || isOrganizer) && spotsLeft > 0 && match.status === "open";
  const theme          = getSportGradient(sport?.name);
  const bookingStatus  = canchaBooking ? BOOKING_STATUS_MAP[canchaBooking.status] ?? BOOKING_STATUS_MAP.cancelada : null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 max-w-2xl mx-auto">

        {/* ── 1. BACK BUTTON ROW ─────────────────────────────────────────── */}
        <button
          onClick={() => setLocation("/feed")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start px-1 py-1 -ml-1 rounded-lg hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Volver al feed
        </button>

        {/* ── 2. CANCHA CARD (if booking exists) ────────────────────────── */}
        {canchaBooking && bookingStatus && (
          <div className={`rounded-2xl border ${bookingStatus.border} ${bookingStatus.bg} overflow-hidden`}>
            {/* Status bar */}
            <div className={`px-4 py-2.5 flex items-center gap-2.5 border-b ${bookingStatus.border}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${bookingStatus.dot}`} />
              <p className={`text-xs font-bold uppercase tracking-wide ${bookingStatus.color}`}>
                {bookingStatus.label}
              </p>
              {canchaBooking.status === "confirmada" && (
                <CheckCircle2 className="size-3.5 text-emerald-500 ml-auto" />
              )}
              {canchaBooking.status === "pendiente" && (
                <AlertCircle className="size-3.5 text-amber-500 ml-auto animate-pulse" />
              )}
            </div>
            {/* Cancha details */}
            <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="col-span-2 flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-bold text-foreground">
                  {(canchaBooking as FullBooking).canchas?.name ?? "Cancha"}
                </span>
              </div>
              {(canchaBooking as FullBooking).canchas?.address && (
                <div className="col-span-2 flex items-center gap-2">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">{(canchaBooking as FullBooking).canchas?.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarCheck className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground font-medium">
                  {canchaBooking.booking_date}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground font-medium">
                  {canchaBooking.start_time?.substring(0, 5)} – {canchaBooking.end_time?.substring(0, 5)}
                </span>
              </div>
              {(canchaBooking as FullBooking).canchas?.price_per_hour != null && (
                <div className="flex items-center gap-2">
                  <DollarSign className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground font-medium">
                    ${(canchaBooking as FullBooking).canchas!.price_per_hour!.toLocaleString("es-CO")}/hora
                  </span>
                </div>
              )}
              {(canchaBooking as FullBooking).canchas?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <a
                    href={`tel:${(canchaBooking as FullBooking).canchas?.phone}`}
                    className="text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline"
                  >
                    {(canchaBooking as FullBooking).canchas?.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 3. HERO CARD ──────────────────────────────────────────────── */}
        <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${theme.gradient} shadow-2xl ${theme.glow}`}>
          <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')]" />

          {/* Badges top-right */}
          <div className="absolute top-4 right-4 flex flex-wrap items-center gap-1.5 z-10 justify-end">
            {isCancelled && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/30 text-red-200 border border-red-500/40 uppercase tracking-wide">Cancelado</span>}
            {isCompleted && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 uppercase tracking-wide">Finalizado</span>}
            {match.is_public
              ? <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${theme.chipBg} uppercase tracking-wide`}><Globe className="size-2.5" /> Abierto</span>
              : <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-amber-500/20 text-amber-200 border-amber-500/30 uppercase tracking-wide"><Lock className="size-2.5" /> Privado</span>
            }
            {isOrganizer && match.status === "open" && (
              <>
                <button
                  title="Editar partido"
                  onClick={() => setLocation(`/matches/${match.id}/edit`)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/15 border border-white/20 text-white/80 hover:bg-white/25 hover:text-white transition-all active:scale-90"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  title="Cancelar partido"
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/40 hover:text-red-100 transition-all active:scale-90"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="px-5 pt-8 pb-6">
            {/* Sport icon */}
            <div className="text-6xl mb-3 drop-shadow-lg">{sport?.icon ?? "🏟️"}</div>

            {/* Meta */}
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-1">
              {sport?.name ?? "Partido"} · {match.city}{match.skill_level && ` · ${match.skill_level}`}
            </p>

            {/* Title */}
            <h1 className="text-2xl font-black text-white leading-tight mb-3">{match.title}</h1>

            {/* Description */}
            {match.description && (
              <p className="text-sm text-white/70 leading-relaxed mb-4 border-l-2 border-white/20 pl-3">
                {match.description}
              </p>
            )}

            {/* Stat pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-white/90 text-xs font-medium border border-white/10">
                <Clock className="size-3.5 text-white/60" />{formatMatchDate(match.starts_at)}
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-white/90 text-xs font-medium border border-white/10">
                <Timer className="size-3.5 text-white/60" />{match.duration_minutes} min
              </div>
              {match.skill_level && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-white/90 text-xs font-medium border border-white/10 capitalize">
                  <Zap className="size-3.5 text-white/60" />{match.skill_level}
                </div>
              )}
            </div>

            {/* Occupancy */}
            <div className="mb-1.5 flex items-center justify-between text-xs text-white/60">
              <span className="font-medium">{joinedCount} de {match.max_players} jugadores</span>
              <span className={`font-bold ${occupancyPct >= 0.9 ? "text-red-300" : occupancyPct >= 0.6 ? "text-amber-300" : "text-emerald-300"}`}>
                {spotsLeft > 0 ? `${spotsLeft} cupo${spotsLeft !== 1 ? "s" : ""} libre${spotsLeft !== 1 ? "s" : ""}` : "¡Lleno!"}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(occupancyPct * 100, 100)}%`,
                  background: occupancyPct >= 0.9 ? "linear-gradient(90deg,#ef4444,#f87171)" : occupancyPct >= 0.6 ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "linear-gradient(90deg,#10b981,#34d399)",
                }}
              />
            </div>

            {/* Organizer */}
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

        {/* ── Cancel confirm dialog (organizer only) ────────────────────── */}
        {isOrganizer && showCancelConfirm && (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
            <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-1">¿Cancelar el partido?</p>
            <p className="text-xs text-red-700/80 dark:text-red-400/70 mb-3">Esta acción no se puede deshacer y los jugadores serán notificados.</p>
            <div className="flex gap-2">
              <Button size="sm" disabled={cancellingMatch} className="bg-red-600 hover:bg-red-700 text-white rounded-xl flex-1" onClick={handleCancelMatch}>
                {cancellingMatch ? "Cancelando…" : "Sí, cancelar partido"}
              </Button>
              <Button size="sm" variant="outline" disabled={cancellingMatch} onClick={() => setShowCancelConfirm(false)} className="rounded-xl">
                No, volver
              </Button>
            </div>
          </div>
        )}

        {/* ── 5. INVITATION ─────────────────────────────────────────────── */}
        {myInvitation && myInvitation.status === "pending" && !isJoined && (
          <div className="rounded-2xl border border-violet-200 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Mail className="size-4 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">Te invitaron a este partido</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={respondingInvite} onClick={() => handleRespondInvitation("accepted")} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex-1">
                Aceptar e ingresar
              </Button>
              <Button size="sm" variant="outline" disabled={respondingInvite} onClick={() => handleRespondInvitation("rejected")} className="border-violet-300 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-xl">
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

        {/* ── 6. CTA: JOIN / LEAVE / ORGANIZER CONTROLS ─────────────────── */}
        {match.status === "open" && !isCancelled && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
            {/* Non-organizer: joined state */}
            {!isOrganizer && isJoined && (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">¡Estás dentro!</p>
                    <p className="text-xs text-muted-foreground">
                      {isConfirmed ? "Asistencia confirmada ✓" : "Confirmá tu asistencia antes del partido"}
                    </p>
                  </div>
                </div>
                {!isConfirmed && (
                  <Button size="sm" onClick={handleConfirm} disabled={confirming} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white mb-2">
                    <CheckCircle2 className="size-4 mr-2" />{confirming ? "Confirmando…" : "Confirmar asistencia"}
                  </Button>
                )}
                <button onClick={handleJoin} disabled={joining} className="w-full text-xs text-muted-foreground hover:text-red-500 transition-colors text-center py-1">
                  {joining ? "…" : "Salir del partido"}
                </button>
              </div>
            )}

            {/* Non-organizer: not joined, not full → send request */}
            {!isOrganizer && !isJoined && !isFull && (
              <div className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20">
                <p className="font-bold text-violet-900 dark:text-violet-200 text-sm mb-0.5">¿Querés jugar?</p>
                <p className="text-xs text-violet-700/70 dark:text-violet-400/70 mb-3">
                  Quedan {spotsLeft} cupo{spotsLeft !== 1 ? "s" : ""} · Enviá tu solicitud al organizador
                </p>
                <Button onClick={handleRequestJoin} disabled={requesting} className="w-full rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white h-11">
                  <Send className="size-4 mr-2" />{requesting ? "Enviando solicitud…" : "Enviar solicitud para unirme"}
                </Button>
              </div>
            )}

            {/* Non-organizer: full */}
            {!isOrganizer && !isJoined && isFull && (
              <div className="p-5 flex items-center gap-3 text-muted-foreground bg-muted/30">
                <Users className="size-5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Partido lleno</p>
                  <p className="text-xs">Ya no hay cupos disponibles.</p>
                </div>
              </div>
            )}

            {/* Organizer controls */}
            {isOrganizer && isJoined && !isConfirmed && (
              <div className="p-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Panel del organizador</p>
                <Button size="sm" onClick={handleConfirm} disabled={confirming} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="size-4 mr-2" />{confirming ? "Confirmando…" : "Confirmar mi asistencia"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── 7. PENDING INVITATIONS (organizer) ────────────────────────── */}
        {isOrganizer && pendingInvitations.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
              <Mail className="size-4 text-violet-500" />
              <h2 className="text-sm font-bold">Invitaciones enviadas</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {pendingInvitations.filter((i) => i.status === "pending").length} pendientes
              </span>
            </div>
            <ul className="divide-y divide-border/40">
              {pendingInvitations.map((inv) => {
                const pp = inv.profile;
                return (
                  <li key={inv.id} className="flex items-center justify-between px-5 py-3">
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

        {/* ── 7b. PENDING JOIN REQUESTS (organizer only) ────────────────── */}
        {isOrganizer && requestedParts.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-violet-200 dark:border-violet-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-200/60 dark:border-violet-800/40 flex items-center gap-2 bg-violet-50/60 dark:bg-violet-950/20">
              <UserPlus className="size-4 text-violet-600 dark:text-violet-400" />
              <h2 className="text-sm font-bold text-violet-900 dark:text-violet-200">Solicitudes de ingreso</h2>
              <span className="ml-auto flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 animate-pulse">
                {requestedParts.length} pendiente{requestedParts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <ul className="divide-y divide-border/40">
              {requestedParts.map((p) => {
                const pp = profilesById.get(p.user_id);
                const isAccepting = acceptingRequest === p.user_id;
                return (
                  <li key={p.user_id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar className="size-9 shrink-0">
                      {pp?.avatar_url && <AvatarImage src={pp.avatar_url} />}
                      <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700">{initialsFromName(pp?.full_name ?? null)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{pp?.full_name ?? pp?.username ?? "Jugador"}</p>
                      {(pp?.rating_count ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          <Star className="size-2.5 inline fill-amber-400 text-amber-400 mr-0.5" />
                          {pp?.rating_avg?.toFixed(1)} ({pp?.rating_count})
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        disabled={isAccepting || isFull}
                        onClick={() => handleAcceptRequest(p.user_id)}
                        className="h-7 rounded-lg text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="size-3 mr-1" />
                        {isAccepting ? "…" : isFull ? "Lleno" : "Aceptar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isAccepting}
                        onClick={() => handleRejectRequest(p.user_id)}
                        className="h-7 rounded-lg text-xs px-2.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {isFull && (
              <div className="px-5 py-3 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200/60 dark:border-amber-800/40">
                <p className="text-xs text-amber-700 dark:text-amber-400">El partido está lleno. Liberá un cupo antes de aceptar nuevas solicitudes.</p>
              </div>
            )}
          </div>
        )}

        {/* ── 8. PLAYERS ────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">Jugadores</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              {joinedCount}/{match.max_players}
            </span>
            {canInvite && (
              <button
                onClick={handleOpenInvitePanel}
                className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
              >
                <UserPlus className="size-3.5" /> Invitar amigos
              </button>
            )}
          </div>

          {/* Invite friends panel */}
          {showInvitePanel && (
            <div className="border-b border-border/40 bg-violet-50/50 dark:bg-violet-950/20 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">Invitar amigos</p>
                <button onClick={() => { setShowInvitePanel(false); setSelectedFriendIds(new Set()); }} className="text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>
              {!friendsLoaded ? (
                <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : friends.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No hay amigos disponibles para invitar.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {friends.map((f) => {
                    const selected = selectedFriendIds.has(f.profile.id);
                    return (
                      <button
                        key={f.profile.id}
                        onClick={() => setSelectedFriendIds((prev) => {
                          const next = new Set(prev);
                          if (selected) next.delete(f.profile.id); else next.add(f.profile.id);
                          return next;
                        })}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${selected ? "bg-violet-100 dark:bg-violet-900/40" : "hover:bg-muted"}`}
                      >
                        <Avatar className="size-8 shrink-0">
                          {f.profile.avatar_url && <AvatarImage src={f.profile.avatar_url} />}
                          <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700">{initialsFromName(f.profile.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1">{f.profile.full_name ?? f.profile.username ?? "—"}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? "bg-violet-600 border-violet-600" : "border-zinc-300 dark:border-zinc-600"}`}>
                          {selected && <Check className="size-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedFriendIds.size > 0 && (
                <Button
                  size="sm"
                  className="w-full mt-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
                  disabled={sendingInvites}
                  onClick={handleSendInvites}
                >
                  <Mail className="size-3.5 mr-1.5" />
                  {sendingInvites ? "Enviando…" : `Invitar a ${selectedFriendIds.size} jugador${selectedFriendIds.size !== 1 ? "es" : ""}`}
                </Button>
              )}
            </div>
          )}

          {joinedParts.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nadie se unió todavía. ¡Sé el primero!</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {joinedParts.map((p) => {
                const pp = profilesById.get(p.user_id);
                if (!pp) return null;
                const isOrgRow = p.user_id === match.organizer_id;
                return (
                  <li key={p.user_id} className="flex items-center justify-between px-5 py-3">
                    <Link href={`/profile/${pp.id}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
                      <div className="relative">
                        <Avatar className="size-10">
                          {pp.avatar_url && <AvatarImage src={pp.avatar_url} />}
                          <AvatarFallback className="text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">{initialsFromName(pp.full_name)}</AvatarFallback>
                        </Avatar>
                        {isOrgRow && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                            <Crown className="size-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {pp.full_name ?? pp.username ?? "—"}
                          {isOrgRow && <span className="ml-1.5 text-[10px] text-violet-500 font-bold">ORGANIZA</span>}
                        </p>
                        {pp.rating_count > 0 && (
                          <p className="text-xs text-muted-foreground">
                            <Star className="size-2.5 inline fill-amber-400 text-amber-400 mr-0.5" />
                            {pp.rating_avg?.toFixed ? pp.rating_avg.toFixed(1) : pp.rating_avg} ({pp.rating_count})
                          </p>
                        )}
                      </div>
                    </Link>
                    {p.confirmed_at
                      ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full"><CheckCircle2 className="size-3" /> Confirmado</span>
                      : <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"><Clock className="size-3" /> Pendiente</span>
                    }
                  </li>
                );
              })}
            </ul>
          )}

          {/* Empty slot indicators */}
          {spotsLeft > 0 && (
            <div className="px-5 py-3 border-t border-border/40 flex items-center gap-2 flex-wrap">
              {Array.from({ length: Math.min(spotsLeft, 6) }).map((_, i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/40 text-sm font-light">+</div>
              ))}
              {spotsLeft > 6 && <span className="text-xs text-muted-foreground">+{spotsLeft - 6} cupos</span>}
            </div>
          )}
        </div>

        {/* ── 9. WAITLIST ───────────────────────────────────────────────── */}
        {!matchPassed && match.status === "open" && (isFull || waitlist.length > 0) && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
              <ListOrdered className="size-4 text-amber-500" />
              <h2 className="text-sm font-bold">Lista de espera</h2>
              <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {waitlist.length} en espera
              </span>
            </div>

            {waitlist.length === 0 ? (
              <div className="px-5 py-4 text-sm text-muted-foreground">Nadie en lista de espera todavía.</div>
            ) : (
              <ul className="divide-y divide-border/40">
                {waitlist.map((entry, idx) => {
                  const pp = entry.profile ?? profilesById.get(entry.user_id);
                  const isMe = entry.user_id === user?.id;
                  return (
                    <li key={entry.id} className={`flex items-center gap-3 px-5 py-3 ${isMe ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
                      <span className="text-xs font-black text-amber-500 w-5 text-right shrink-0">#{idx + 1}</span>
                      <Avatar className="size-8">
                        {pp?.avatar_url && <AvatarImage src={pp.avatar_url} />}
                        <AvatarFallback className="text-xs">{initialsFromName(pp?.full_name ?? null)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium flex-1">{pp?.full_name ?? pp?.username ?? "Jugador"}{isMe && <span className="ml-1.5 text-[10px] text-amber-600 font-bold">TÚ</span>}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(entry.joined_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* CTA for waitlist */}
            {canJoinWaitlist && !isOrganizer && (
              <div className="px-5 py-4 border-t border-border/40">
                {isOnWaitlist ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Estás en la lista · Posición #{myWaitPosition}</p>
                      <p className="text-xs text-muted-foreground">Te avisaremos si se libera un cupo.</p>
                    </div>
                    <button onClick={handleJoinWaitlist} disabled={joiningWaitlist} className="text-xs text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                      {joiningWaitlist ? "…" : "Salir"}
                    </button>
                  </div>
                ) : (
                  <Button size="sm" onClick={handleJoinWaitlist} disabled={joiningWaitlist} variant="outline" className="w-full rounded-xl border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                    <ListOrdered className="size-4 mr-2" />
                    {joiningWaitlist ? "Uniéndote…" : "Unirme a la lista de espera"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 10. CHAT ──────────────────────────────────────────────────── */}
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
              <div className="max-h-72 overflow-y-auto flex flex-col gap-1 p-4 bg-zinc-50/50 dark:bg-zinc-950/30">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">Sin mensajes. ¡Rompé el hielo!</p>
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
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isMe ? "bg-violet-600 text-white rounded-br-sm" : "bg-white dark:bg-zinc-800 border border-border/60 text-foreground rounded-bl-sm shadow-sm"}`}>
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
              <form onSubmit={handleSendMessage} className="flex gap-2 p-3 border-t border-border/40 bg-white dark:bg-zinc-900">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Escribí un mensaje…"
                  className="flex-1 rounded-xl border border-input bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                <Button type="submit" size="icon" disabled={sendingMsg || !chatMessage.trim()} className="rounded-xl w-10 h-10 bg-violet-600 hover:bg-violet-700 shrink-0">
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

        {/* ── 11. POST-MATCH RATING ─────────────────────────────────────── */}
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
                          {(pp?.rating_count ?? 0) > 0 && <p className="text-xs text-muted-foreground">★ {pp?.rating_avg?.toFixed(1)}</p>}
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} type="button" onClick={() => setMyRatings((prev) => ({ ...prev, [p.user_id]: star }))} className="p-0.5 transition-transform active:scale-90">
                            <Star className={`size-6 transition-colors ${star <= currentRating ? "text-amber-400 fill-amber-400" : "text-zinc-200 dark:text-zinc-700"}`} />
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Button className="mt-4 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold" disabled={submittingRatings || Object.keys(myRatings).length === 0} onClick={handleSubmitRatings}>
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

      </div>
    </AppLayout>
  );
}
