import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Mail, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { getFriends, sendMatchInvitations } from "@/lib/friends/api";
import { sendNotification } from "@/lib/notifications/api";
import { checkMatchConflict } from "@/lib/matches/conflicts";
import { upsertMatchRatings } from "@/lib/matches/api";
import type { FriendWithProfile } from "@/lib/friends/api";
import { useMatchDetail, type FullBooking } from "@/hooks/useMatchDetail";
import { MatchCanchaCard } from "@/components/matches/MatchCanchaCard";
import { MatchHeroCard } from "@/components/matches/MatchHeroCard";
import { MatchActionsPanel } from "@/components/matches/MatchActionsPanel";
import { MatchPlayersSection } from "@/components/matches/MatchPlayersSection";
import { MatchChatSection } from "@/components/matches/MatchChatSection";
import { PaymentPendingModal } from "@/components/canchas/PaymentPendingModal";
import { PostMatchModal } from "@/components/matches/PostMatchModal";

export default function MatchDetailPage() {
  const { user, profile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const {
    match, sport, organizer, participants, profilesById, canchaBooking,
    loading, error, messages, sendingMsg, myInvitation, pendingInvitations, waitlist,
    sendMessage, leaveMatch, requestJoin, confirmAttendance, cancelMatch,
    joinWaitlist, acceptJoinRequest, rejectJoinRequest, respondInvitation, updateAttendance,
  } = useMatchDetail(id!, user?.id);

  const [chatMessage, setChatMessage]             = useState("");
  const [requesting, setRequesting]               = useState(false);
  const [acceptingRequest, setAcceptingRequest]   = useState<string | null>(null);
  const [confirming, setConfirming]               = useState(false);
  const [cancellingMatch, setCancellingMatch]     = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [respondingInvite, setRespondingInvite]   = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef  = useRef<HTMLInputElement>(null);

  const [showInvitePanel, setShowInvitePanel]     = useState(false);
  const [showPaymentModal, setShowPaymentModal]   = useState(false);
  const [friends, setFriends]                     = useState<FriendWithProfile[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [sendingInvites, setSendingInvites]       = useState(false);
  const [friendsLoaded, setFriendsLoaded]         = useState(false);

  const [joiningWaitlist, setJoiningWaitlist]     = useState(false);
  const [submittingRatings, setSubmittingRatings] = useState(false);
  const [ratingsSubmitted, setRatingsSubmitted]   = useState(false);
  const [showRatingModal, setShowRatingModal]     = useState(false);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleCancelRequest = async () => {
    setRequesting(true);
    await leaveMatch();
    setRequesting(false);
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

  async function handleSubmitRatings(ratings: Record<string, number>) {
    if (!user || !match) return;
    setSubmittingRatings(true);
    const rows = Object.entries(ratings)
      .filter(([, r]) => r > 0)
      .map(([rated_id, rating]) => ({ match_id: match.id, rater_id: user.id, rated_id, rating }));
    if (rows.length === 0) {
      toast.error("Seleccioná al menos una calificación.");
      setSubmittingRatings(false);
      return;
    }
    const { error: ratingErr } = await upsertMatchRatings(supabase, rows);
    if (ratingErr) { toast.error("Error: " + ratingErr); }
    else { toast.success("¡Calificaciones enviadas!"); setRatingsSubmitted(true); }
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
    const inviteeIds = Array.from(selectedFriendIds);
    const { error: invErr } = await sendMatchInvitations(supabase, match.id, user.id, inviteeIds);
    if (invErr) { toast.error("Error al enviar invitaciones."); }
    else {
      const inviterName = profile?.full_name ?? organizer?.full_name ?? "Alguien";
      await Promise.allSettled(
        inviteeIds.map((inviteeId) =>
          sendNotification(supabase, inviteeId, "match_invite", {
            match_id: match.id,
            match_title: match.title,
            inviter_id: user.id,
            inviter_name: inviterName,
          })
        )
      );
      toast.success(`Invitaciones enviadas a ${inviteeIds.length} jugador${inviteeIds.length !== 1 ? "es" : ""}.`);
      setShowInvitePanel(false);
      setSelectedFriendIds(new Set());
    }
    setSendingInvites(false);
  }

  if (loading) return (
    <>
      <div className="flex flex-col gap-3 max-w-2xl mx-auto">
        <div className="h-10 w-32 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="h-64 rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
      </div>
    </>
  );

  if (error || !match) return (
    <>
      <div className="p-6 bg-destructive/15 text-destructive rounded-xl text-center">{error ?? "Partido no encontrado"}</div>
    </>
  );

  // ── Access guard ───────────────────────────────────────────────────────────
  {
    const _isOrg    = match.organizer_id === user?.id;
    const _myPart   = participants.find((p) => p.user_id === user?.id);
    const _isJoined = _myPart?.status === "joined";

    if (!_isOrg && !_isJoined) {
      const _myStatus        = _myPart?.status ?? null;
      const _hasPendingInvite = myInvitation?.status === "pending";

      if (_hasPendingInvite) {
        return (
          <>
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
                  <Button disabled={respondingInvite} onClick={() => handleRespondInvitation("accepted")} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex-1">Aceptar e ingresar</Button>
                  <Button variant="outline" disabled={respondingInvite} onClick={() => handleRespondInvitation("rejected")} className="border-violet-300 text-violet-700 dark:text-violet-300 rounded-xl">Rechazar</Button>
                </div>
              </div>
            </div>
          </>
        );
      }

      if (_myStatus === "requested") {
        return (
          <>
            <div className="flex flex-col gap-4 max-w-md mx-auto py-8">
              <button onClick={() => setLocation("/feed")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground self-start">
                <ArrowLeft className="size-4" /> Volver al feed
              </button>
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-4">
                  <Clock className="size-8 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="font-bold text-amber-900 dark:text-amber-200 text-lg mb-1">Solicitud enviada</p>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/70 mb-2">Tu solicitud para <span className="font-semibold">{match.title}</span> está pendiente de aprobación.</p>
                <p className="text-xs text-muted-foreground mb-6">El organizador te aceptará pronto. Recibirás una notificación cuando sea aprobada.</p>
                <Button variant="outline" disabled={requesting} onClick={handleCancelRequest} className="w-full rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700/50 dark:text-amber-400 dark:hover:bg-amber-900/40">
                  <X className="size-4 mr-2" />{requesting ? "Cancelando…" : "Cancelar solicitud"}
                </Button>
              </div>
            </div>
          </>
        );
      }

      return (
        <>
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
                {match.is_public ? "Enviá una solicitud para unirte a este partido y ver todos sus detalles." : "Este partido es privado. Solo los amigos del organizador pueden solicitar unirse."}
              </p>
              <Button onClick={() => setLocation("/feed")} variant="outline" className="rounded-xl">Volver al feed</Button>
            </div>
          </div>
        </>
      );
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const joinedParts     = participants.filter((p) => p.status === "joined");
  const requestedParts  = participants.filter((p) => p.status === "requested");
  const joinedCount     = joinedParts.length;
  const myPart          = participants.find((p) => p.user_id === user?.id);
  const isJoined        = !!myPart && myPart.status === "joined";
  const isConfirmed     = isJoined && !!myPart?.confirmed_at;
  const isOrganizer     = match.organizer_id === user?.id;
  const isFull          = joinedCount >= match.max_players && !isJoined;
  const isCompleted     = match.status === "completed";
  const isCancelled     = match.status === "cancelled";
  const matchPassed     = new Date(match.starts_at) < new Date();
  const spotsLeft       = match.max_players - joinedCount;
  const occupancyPct    = match.max_players > 0 ? joinedCount / match.max_players : 0;
  const othersToRate    = joinedParts.filter((p) => p.user_id !== user?.id);
  const showRating      = isCompleted && (isJoined || isOrganizer) && !ratingsSubmitted && othersToRate.length > 0;
  const isOnWaitlist    = waitlist.some((w) => w.user_id === user?.id);
  const myWaitPosition  = isOnWaitlist ? waitlist.findIndex((w) => w.user_id === user?.id) + 1 : null;
  const canJoinWaitlist = !isJoined && !isOrganizer && isFull && !matchPassed && match.status === "open";
  const canInvite       = (isJoined || isOrganizer) && spotsLeft > 0 && match.status === "open";
  const canChat         = isJoined || isOrganizer;

  // Auto-open rating modal if eligible
  useEffect(() => {
    if (showRating && !showRatingModal && !ratingsSubmitted) {
      setShowRatingModal(true);
    }
  }, [showRating, showRatingModal, ratingsSubmitted]);

  return (
    <>
      <div className="flex flex-col gap-3 max-w-2xl mx-auto">
        <button
          onClick={() => setLocation("/feed")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start px-1 py-1 -ml-1 rounded-lg hover:bg-muted"
        >
          <ArrowLeft className="size-4" /> Volver al feed
        </button>

        {canchaBooking && (
          <MatchCanchaCard 
            canchaBooking={canchaBooking as FullBooking} 
            isOrganizer={isOrganizer}
            onOpenPayment={() => setShowPaymentModal(true)}
          />
        )}

        <MatchHeroCard
          match={match}
          sport={sport}
          organizer={organizer}
          joinedCount={joinedCount}
          spotsLeft={spotsLeft}
          occupancyPct={occupancyPct}
          isOrganizer={isOrganizer}
          isCancelled={isCancelled}
          isCompleted={isCompleted}
          showCancelConfirm={showCancelConfirm}
          cancellingMatch={cancellingMatch}
          onEdit={() => setLocation(`/matches/${match.id}/edit`)}
          onShowCancelConfirm={() => setShowCancelConfirm(true)}
          onHideCancelConfirm={() => setShowCancelConfirm(false)}
          onCancelMatch={handleCancelMatch}
        />

        <MatchActionsPanel
          match={match}
          isOrganizer={isOrganizer}
          isJoined={isJoined}
          isConfirmed={isConfirmed}
          isFull={isFull}
          isCancelled={isCancelled}
          spotsLeft={spotsLeft}
          myInvitation={myInvitation}
          pendingInvitations={pendingInvitations}
          requestedParts={requestedParts}
          profilesById={profilesById}
          acceptingRequest={acceptingRequest}
          respondingInvite={respondingInvite}
          requesting={requesting}
          confirming={confirming}
          onCancelRequest={handleCancelRequest}
          onConfirm={handleConfirm}
          onRequestJoin={handleRequestJoin}
          onRespondInvitation={handleRespondInvitation}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
        />

        <MatchPlayersSection
          match={match}
          joinedParts={joinedParts}
          waitlist={waitlist}
          profilesById={profilesById}
          userId={user?.id}
          canInvite={canInvite}
          isFull={isFull}
          spotsLeft={spotsLeft}
          isOrganizer={isOrganizer}
          matchPassed={matchPassed}
          isCompleted={isCompleted}
          canJoinWaitlist={canJoinWaitlist}
          isOnWaitlist={isOnWaitlist}
          myWaitPosition={myWaitPosition}
          joiningWaitlist={joiningWaitlist}
          showInvitePanel={showInvitePanel}
          friends={friends}
          friendsLoaded={friendsLoaded}
          selectedFriendIds={selectedFriendIds}
          sendingInvites={sendingInvites}
          onOpenInvitePanel={handleOpenInvitePanel}
          onCloseInvitePanel={() => { setShowInvitePanel(false); setSelectedFriendIds(new Set()); }}
          onToggleFriend={(fid) => setSelectedFriendIds((prev) => {
            const next = new Set(prev);
            if (next.has(fid)) next.delete(fid); else next.add(fid);
            return next;
          })}
          onSendInvites={handleSendInvites}
          onJoinWaitlist={handleJoinWaitlist}
          onUpdateAttendance={updateAttendance}
        />

        <MatchChatSection
          messages={messages}
          profilesById={profilesById}
          userId={user?.id}
          canChat={canChat}
          chatMessage={chatMessage}
          sendingMsg={sendingMsg}
          chatBottomRef={chatBottomRef}
          chatInputRef={chatInputRef}
          onChatMessageChange={setChatMessage}
          onSendMessage={handleSendMessage}
        />

        <PostMatchModal 
          open={showRatingModal}
          onOpenChange={setShowRatingModal}
          othersToRate={othersToRate}
          profilesById={profilesById}
          onSubmit={handleSubmitRatings}
          submitting={submittingRatings}
        />

        {canchaBooking && (
          <PaymentPendingModal
            open={showPaymentModal}
            onClose={() => { setShowPaymentModal(false); window.location.reload(); }}
            bookingId={canchaBooking.id}
            userId={user!.id}
            canchaName={canchaBooking.canchas?.name ?? ""}
            bookingDate={canchaBooking.booking_date}
            startTime={canchaBooking.start_time ?? ""}
            endTime={canchaBooking.end_time ?? ""}
            totalPrice={canchaBooking.total_price}
            paymentMethods={[]}
            paymentInstructions={null}
            expiresAt={canchaBooking.expires_at ?? new Date(Date.now() + 15 * 60000).toISOString()}
            matchId={match?.id}
          />
        )}
      </div>
    </>
  );
}
