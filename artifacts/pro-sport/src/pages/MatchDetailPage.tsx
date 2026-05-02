import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppLayout } from "@/components/AppLayout";
import { CheckCircle2, Clock, MapPin, Globe, Lock } from "lucide-react";
import type { Match, MatchParticipant, Profile, Sport } from "@/lib/types/db";

const supabase = createClient();

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const [match, setMatch] = useState<Match | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<MatchParticipant[]>([]);
  const [profilesById, setProfilesById] = useState<Map<string, Profile>>(new Map());
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; sender_id: string; content: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        navigate("/login");
        return;
      }
      setCurrentUserId(authData.user.id);

      const { data: matchRaw } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
      if (!matchRaw) { setError("Partido no encontrado"); setLoading(false); return; }
      const m = matchRaw as Match;
      setMatch(m);

      const [{ data: sportData }, { data: orgData }, { data: partsData }, { data: messagesData }, { data: profileRaw }] = await Promise.all([
        supabase.from("sports").select("*").eq("id", m.sport_id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", m.organizer_id).maybeSingle(),
        supabase.from("match_participants").select("*").eq("match_id", m.id).order("joined_at"),
        supabase.from("messages").select("*").eq("match_id", m.id).order("created_at", { ascending: true }).limit(200),
        supabase.from("profiles").select("*").eq("id", authData.user.id).maybeSingle(),
      ]);

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
  }, [id, navigate]);

  async function handleJoin() {
    if (!match || !currentUserId) return;
    setJoining(true);
    const myPart = participants.find((p) => p.user_id === currentUserId);
    if (myPart) {
      await supabase.from("match_participants").delete().eq("match_id", match.id).eq("user_id", currentUserId);
      setParticipants((prev) => prev.filter((p) => p.user_id !== currentUserId));
    } else {
      const { data: newPart } = await supabase.from("match_participants").insert({ match_id: match.id, user_id: currentUserId, status: "joined" }).select().single();
      if (newPart) setParticipants((prev) => [...prev, newPart as MatchParticipant]);
    }
    setJoining(false);
  }

  async function handleConfirm() {
    if (!match || !currentUserId) return;
    setConfirming(true);
    await supabase.from("match_participants").update({ confirmed_at: new Date().toISOString() }).eq("match_id", match.id).eq("user_id", currentUserId);
    setParticipants((prev) => prev.map((p) => p.user_id === currentUserId ? { ...p, confirmed_at: new Date().toISOString() } : p));
    setConfirming(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatMessage.trim() || !match || !currentUserId) return;
    setSendingMsg(true);
    const { data: msg } = await supabase.from("messages").insert({ match_id: match.id, sender_id: currentUserId, content: chatMessage.trim() }).select().single();
    if (msg) setMessages((prev) => [...prev, msg as typeof messages[0]]);
    setChatMessage("");
    setSendingMsg(false);
  }

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;
  if (error || !match) return <div className="p-6 bg-destructive/15 text-destructive rounded-xl">{error ?? "Partido no encontrado"}</div>;

  const joinedParts = participants.filter((p) => p.status === "joined");
  const joinedCount = joinedParts.length;
  const myPart = participants.find((p) => p.user_id === currentUserId);
  const isJoined = !!myPart && myPart.status === "joined";
  const isConfirmed = isJoined && !!myPart?.confirmed_at;
  const isOrganizer = match.organizer_id === currentUserId;
  const isFull = joinedCount >= match.max_players && !isJoined;
  const canChat = isJoined || isOrganizer;

  return (
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
            {!isOrganizer && (
              <Button size="sm" variant={isJoined ? "outline" : "default"} disabled={joining || isFull} onClick={handleJoin}>
                {joining ? "…" : isJoined ? "Salir" : isFull ? "Lleno" : "Unirse"}
              </Button>
            )}
          </div>
        </div>

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
                const isMe = msg.sender_id === currentUserId;
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
  );
}
