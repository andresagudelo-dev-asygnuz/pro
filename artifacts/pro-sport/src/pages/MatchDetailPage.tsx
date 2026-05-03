import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppLayout } from "@/components/AppLayout";
import { CheckCircle2, Clock, MapPin, Globe, Lock, Building2, AlertCircle, Mail, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Match, MatchParticipant, Profile, Sport, CanchaBooking, MatchInvitation } from "@/lib/types/db";
import { getMyMatchInvitation, respondToMatchInvitation, getMatchInvitations } from "@/lib/friends/api";

const supabase = createClient();

export default function MatchDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<MatchParticipant[]>([]);
  const [profilesById, setProfilesById] = useState<Map<string, Profile>>(new Map());
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; sender_id: string; content: string; created_at: string }>>([]);
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
        setPendingInvitations(
          allInvRes.data.map((inv) => ({ ...inv, profile: profileMap.get(inv.invitee_id) })),
        );
      }

      setSport(sportData as Sport | null);
      setOrganizer(orgData as Profile | null);
      setCurrentUser(profileRaw as Profile | null);

      const parts = (partsData ?? []) as MatchParticipant[];
      setParticipants(parts);
      setMessages((messagesData ?? []) as typeof messages);

      const pIds = Array.from(new Set(parts.map((p) => p.user_id).concat(m.organizer_id)));
      const { data: ppData } = await supabase.from("profiles").select("*").in("id", pIds);
      const map = new Map<string, Profile>();
      ((ppData ?? []) as Profile[]).forEach((p) => map.set(p.id, p));
      setProfilesById(map);

      setLoading(false);
    })();
  }, [id, user]);

  async function handleJoin() {
    if (!match || !user) return;
    setJoining(true);
    const myPart = participants.find((p) => p.user_id === user.id);
    if (myPart) {
      await supabase.from("match_participants").delete().eq("match_id", match.id).eq("user_id", user.id);
      setParticipants((prev) => prev.filter((p) => p.user_id !== user.id));
    } else {
      const { data: newPart } = await supabase.from("match_participants").insert({ match_id: match.id, user_id: user.id, status: "joined" }).select().single();
      if (newPart) setParticipants((prev) => [...prev, newPart as MatchParticipant]);
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
        const { data: newPart } = await supabase
          .from("match_participants")
          .insert({ match_id: match.id, user_id: user.id, status: "joined" })
          .select()
          .single();
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
    const { error } = await supabase
      .from("matches")
      .update({ status: "cancelled" })
      .eq("id", match.id);
    if (error) {
      toast.error("No se pudo cancelar el partido.");
    } else {
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
    setConfirming(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatMessage.trim() || !match || !user) return;
    setSendingMsg(true);
    const { data: msg } = await supabase.from("messages").insert({ match_id: match.id, sender_id: user.id, content: chatMessage.trim() }).select().single();
    if (msg) setMessages((prev) => [...prev, msg as typeof messages[0]]);
    setChatMessage("");
    setSendingMsg(false);
  }

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;
  if (error || !match) return <div className="p-6 bg-destructive/15 text-destructive rounded-xl">{error ?? "Partido no encontrado"}</div>;

  const joinedParts = participants.filter((p) => p.status === "joined");
  const joinedCount = joinedParts.length;
  const myPart = participants.find((p) => p.user_id === user?.id);
  const isJoined = !!myPart && myPart.status === "joined";
  const isConfirmed = isJoined && !!myPart?.confirmed_at;
  const isOrganizer = match.organizer_id === user?.id;
  const isFull = joinedCount >= match.max_players && !isJoined;
  const canChat = isJoined || isOrganizer;

  return (
    <AppLayout>
    <div className="flex flex-col gap-6 max-w-3xl mx-auto px-4 py-6">
      <header className="flex flex-col gap-3 rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {sport?.icon && <span>{sport.icon}</span>}
          <span>{sport?.name ?? match.sport_id}</span>
          <span>·</span>
          <span>{match.city}</span>
          {match.skill_level && <><span>·</span><span className="capitalize">{match.skill_level}</span></>}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{match.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatMatchDate(match.starts_at)} · {match.duration_minutes} min</p>
          </div>
          <div className="flex items-center gap-2">
            {match.is_public ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50"><Globe className="mr-1 h-3 w-3" /> Abierto</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50"><Lock className="mr-1 h-3 w-3" /> Cerrado</Badge>
            )}
            {isOrganizer && <Badge variant="secondary">Organizás</Badge>}
            {isOrganizer && match.status === "open" && !showCancelConfirm && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={() => setShowCancelConfirm(true)}
              >
                <XCircle className="size-3.5 mr-1" /> Cancelar partido
              </Button>
            )}
            {!isOrganizer && (
              <Button size="sm" variant={isJoined ? "outline" : "default"} disabled={joining || isFull} onClick={handleJoin}>
                {joining ? "…" : isJoined ? "Salir" : isFull ? "Lleno" : "Unirse"}
              </Button>
            )}
          </div>
        </div>

        {/* Cancha booking status banner */}
        {/* Cancel confirmation banner */}
        {showCancelConfirm && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              ¿Cancelar el partido?
            </p>
            <p className="text-xs text-red-700 dark:text-red-400">
              Esta acción notificará a los jugadores y no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={cancellingMatch}
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancelMatch}
              >
                {cancellingMatch ? "Cancelando…" : "Sí, cancelar partido"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={cancellingMatch}
                onClick={() => setShowCancelConfirm(false)}
              >
                No, volver
              </Button>
            </div>
          </div>
        )}

        {canchaBooking && (
          <div className={`rounded-lg p-3 flex items-center gap-3 text-sm border ${
            canchaBooking.status === "pendiente"
              ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300"
              : canchaBooking.status === "confirmada"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300"
              : "bg-muted border-border text-muted-foreground"
          }`}>
            {canchaBooking.status === "pendiente" ? (
              <AlertCircle className="size-4 shrink-0" />
            ) : canchaBooking.status === "confirmada" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <Building2 className="size-4 shrink-0" />
            )}
            <div>
              <p className="font-medium">
                {canchaBooking.status === "pendiente" && "Cancha pendiente de aprobación"}
                {canchaBooking.status === "confirmada" && "Cancha confirmada"}
                {canchaBooking.status === "cancelada" && "Reserva de cancha cancelada"}
              </p>
              <p className="text-xs opacity-80">
                {(canchaBooking as { canchas?: { name: string } }).canchas?.name}
                {" · "}{canchaBooking.start_time?.substring(0, 5)}–{canchaBooking.end_time?.substring(0, 5)}
                {" · "}{canchaBooking.booking_date}
              </p>
            </div>
          </div>
        )}

        {/* Invitation banner — for users who were invited and haven't responded */}
        {myInvitation && myInvitation.status === "pending" && !isJoined && (
          <div className="rounded-lg p-4 flex flex-col gap-3 border bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700">
            <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
              <Mail className="size-4 shrink-0" />
              <p className="text-sm font-medium">Tenés una invitación para este partido</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={respondingInvite}
                onClick={() => handleRespondInvitation("accepted")}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Aceptar e ingresar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={respondingInvite}
                onClick={() => handleRespondInvitation("rejected")}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                Rechazar
              </Button>
            </div>
          </div>
        )}

        {myInvitation && myInvitation.status === "rejected" && !isJoined && (
          <div className="rounded-lg p-3 text-sm border bg-muted/40 text-muted-foreground">
            Rechazaste la invitación a este partido.
          </div>
        )}

        {isJoined && !isConfirmed && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <Clock className="h-4 w-4 text-amber-600" />
              <span><strong>¡Confirmá tu asistencia!</strong> Si no confirmás 3 horas antes, podrías perder tu cupo.</span>
            </div>
            <Button size="sm" variant="outline" disabled={confirming} onClick={handleConfirm}>
              {confirming ? "…" : "Confirmar"}
            </Button>
          </div>
        )}

        {match.description && <p className="text-sm text-foreground/90">{match.description}</p>}

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Dónde</p>
            <p className="text-sm flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />{match.location}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Organizador</p>
            {organizer ? (
              <Link href={`/profile/${organizer.id}`} className="inline-flex items-center gap-2 text-sm hover:underline">
                <Avatar className="size-6">
                  {organizer.avatar_url && <AvatarImage src={organizer.avatar_url} alt="" />}
                  <AvatarFallback>{initialsFromName(organizer.full_name)}</AvatarFallback>
                </Avatar>
                <span>{organizer.full_name ?? organizer.username ?? "—"}</span>
              </Link>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </header>

      {/* Pending invitations section — visible to organizer */}
      {isOrganizer && pendingInvitations.length > 0 && (
        <section className="rounded-xl border bg-background p-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Mail className="size-4 text-purple-500" />
            Invitaciones pendientes ({pendingInvitations.filter((i) => i.status === "pending").length})
          </h2>
          <ul className="flex flex-col gap-2">
            {pendingInvitations.map((inv) => {
              const pp = inv.profile;
              return (
                <li key={inv.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-7">
                      {pp?.avatar_url && <AvatarImage src={pp.avatar_url} />}
                      <AvatarFallback className="text-xs">{initialsFromName(pp?.full_name ?? null)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{pp?.full_name ?? pp?.username ?? "Usuario"}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    inv.status === "pending"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : inv.status === "accepted"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {inv.status === "pending" ? "Pendiente" : inv.status === "accepted" ? "Aceptó" : "Rechazó"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h2 className="text-sm font-semibold mb-4">Jugadores ({joinedCount}/{match.max_players})</h2>
        <ul className="flex flex-col gap-2">
          {joinedParts.length === 0 && <li className="text-sm text-muted-foreground">Nadie se unió todavía.</li>}
          {joinedParts.map((p) => {
            const pp = profilesById.get(p.user_id);
            if (!pp) return null;
            return (
              <li key={p.user_id} className="flex items-center justify-between pr-2">
                <Link href={`/profile/${pp.id}`} className="flex flex-1 items-center gap-3 rounded-md p-2 hover:bg-muted">
                  <Avatar className="size-8">
                    {pp.avatar_url && <AvatarImage src={pp.avatar_url} alt="" />}
                    <AvatarFallback>{initialsFromName(pp.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm">{pp.full_name ?? pp.username ?? "—"}</span>
                    {pp.rating_count > 0 && <span className="text-xs text-muted-foreground">★ {pp.rating_avg} ({pp.rating_count})</span>}
                  </div>
                </Link>
                {p.confirmed_at ? (
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="h-4 w-4" />Confirmado</div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-4 w-4" />Pendiente</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Chat del partido</h2>
        {canChat ? (
          <div className="flex flex-col gap-3">
            <div className="max-h-64 overflow-y-auto flex flex-col gap-2 text-sm">
              {messages.length === 0 && <p className="text-muted-foreground">Sin mensajes aún.</p>}
              {messages.map((msg) => {
                const author = profilesById.get(msg.sender_id);
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <Avatar className="size-6 shrink-0">
                      {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                      <AvatarFallback className="text-xs">{initialsFromName(author?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className={`rounded-lg px-3 py-2 max-w-[70%] ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Escribí un mensaje…"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm" disabled={sendingMsg || !chatMessage.trim()}>
                {sendingMsg ? "…" : "Enviar"}
              </Button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unite al partido para participar del chat.</p>
        )}
      </section>
    </div>
    </AppLayout>
  );
}
