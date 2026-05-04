import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  getConversationMessages, sendMessage, markConversationRead,
  type ChatMessage, type Conversation,
} from "@/lib/chat/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { ArrowLeft, Send, Building2, Trophy, Users, User, MessageCircle, Check } from "lucide-react";
import { toast } from "sonner";

const supabase = createClient();

const TYPE_ICONS: Record<string, React.ReactNode> = {
  booking:    <Building2 className="size-3 text-amber-500" />,
  match:      <Users className="size-3 text-blue-500" />,
  tournament: <Trophy className="size-3 text-violet-500" />,
  friend:     <User className="size-3 text-emerald-500" />,
  direct:     <MessageCircle className="size-3 text-zinc-400" />,
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

// Optimistic message has id that starts with "opt-"
function isOptimistic(id: string) { return id.startsWith("opt-"); }

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [chatClosed, setChatClosed] = useState<string | null>(null); // reason string or null

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  // ── Load conversation + profiles + messages ──
  useEffect(() => {
    if (!user || !id) return;

    const load = async () => {
      const [convRes, myProfRes] = await Promise.all([
        supabase.from("conversations").select("*").eq("id", id).single(),
        supabase.from("profiles").select("id, full_name, username, avatar_url").eq("id", user.id).single(),
      ]);

      if (!convRes.data) { setLocation("/chat"); return; }
      const conv = convRes.data as Conversation;
      setConversation(conv);
      if (myProfRes.data) setMyProfile(myProfRes.data as UserProfile);

      // For match-type conversations, check if the match is closed
      if (conv.type === "match" && conv.reference_id) {
        const { data: match } = await supabase
          .from("matches")
          .select("status")
          .eq("id", conv.reference_id)
          .single();
        if (match?.status === "cancelled") setChatClosed("Este partido fue cancelado.");
        else if (match?.status === "completed") setChatClosed("Este partido finalizó.");
      }

      // Other participant
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", id)
        .neq("user_id", user.id);

      const otherId = parts?.[0]?.user_id as string | undefined;
      if (otherId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", otherId)
          .single();
        if (profile) setOtherProfile(profile as UserProfile);
      }

      // Messages
      const { data: msgs } = await getConversationMessages(supabase, id);
      setMessages(msgs);
      setLoading(false);

      await markConversationRead(supabase, id, user.id);
    };

    load();
  }, [user, id, setLocation]);

  useEffect(() => { if (!loading) scrollToBottom(); }, [loading, scrollToBottom]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!id || !user) return;

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        async (payload: { new: ChatMessage }) => {
          const newMsg = payload.new;

          setMessages((prev) => {
            // Already have the real message
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            // If it's MY message — replace the matching optimistic placeholder
            // (match by content since opt-IDs don't match real IDs)
            if (newMsg.sender_id === user.id) {
              const optIdx = prev.findIndex(
                (m) => isOptimistic(m.id) && m.content === newMsg.content
              );
              if (optIdx !== -1) {
                const next = [...prev];
                next[optIdx] = newMsg;
                return next;
              }
            }

            return [...prev, newMsg];
          });

          setTimeout(() => scrollToBottom(true), 60);

          if (newMsg.sender_id !== user.id) {
            await markConversationRead(supabase, id, user.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user, scrollToBottom]);

  // ── Send ──
  const handleSend = async () => {
    const content = text.trim();
    if (!content || !user || !id || sending) return;

    setText("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setSending(true);

    // Optimistic bubble
    const tempId = `opt-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      conversation_id: id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(true), 60);

    const { error } = await sendMessage(supabase, id, user.id, content);

    if (error) {
      // INSERT truly failed — remove optimistic immediately and restore text
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        autoResize(textareaRef.current);
      }
      if (error.includes("match_closed")) {
        setChatClosed("Este partido fue cancelado.");
        toast.error("No se pueden enviar mensajes a un partido cerrado.");
      } else {
        toast.error("No se pudo enviar. Revisá tu conexión.");
      }
    }
    // If no error: realtime replaces the optimistic when it arrives

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // ── Group messages by date ──
  const grouped: { label: string; messages: ChatMessage[] }[] = [];
  messages.forEach((m) => {
    const label = formatDateLabel(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) last.messages.push(m);
    else grouped.push({ label, messages: [m] });
  });

  const displayName = otherProfile?.full_name ?? otherProfile?.username ?? conversation?.title ?? "Chat";
  const conv = conversation;

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-50 dark:bg-zinc-950">

      {/* ── Header ── */}
      <div className="shrink-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-border/50 shadow-sm z-10">
        <div className="flex items-center gap-3 px-3 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => setLocation("/chat")}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Avatar */}
          <div className="relative shrink-0">
            {otherProfile ? (
              <Avatar className="size-10 ring-2 ring-violet-200 dark:ring-violet-800">
                {otherProfile.avatar_url && <AvatarImage src={otherProfile.avatar_url} />}
                <AvatarFallback className="text-sm font-semibold bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                  {initialsFromName(displayName)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="size-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                {conv ? (TYPE_ICONS[conv.type] ?? <MessageCircle className="size-5" />) : <MessageCircle className="size-5" />}
              </div>
            )}
            {/* Type badge */}
            {conv && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-950 bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                {TYPE_ICONS[conv.type]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{displayName}</p>
            {conv && (
              <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                {conv.subtitle ?? conv.title}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-3 py-4 max-w-2xl w-full mx-auto space-y-0.5">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-7 h-7 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-900/20 flex items-center justify-center shadow-sm">
                <MessageCircle className="size-7 text-violet-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Iniciá la conversación</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  Coordiná los detalles con {displayName}.
                </p>
              </div>
            </div>
          ) : (
            grouped.map(({ label, messages: msgs }) => (
              <div key={label}>
                {/* Date separator */}
                <div className="flex items-center gap-3 py-4">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[11px] text-muted-foreground font-medium px-3 py-1 bg-muted/40 rounded-full">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>

                {/* Messages */}
                <div className="space-y-0.5">
                  {msgs.map((m, i) => {
                    const isMe        = m.sender_id === user?.id;
                    const isOpt       = isOptimistic(m.id);
                    const prevMsg     = i > 0 ? msgs[i - 1] : null;
                    const nextMsg     = i < msgs.length - 1 ? msgs[i + 1] : null;
                    const isSamePrev  = prevMsg?.sender_id === m.sender_id;
                    const isSameNext  = nextMsg?.sender_id === m.sender_id;
                    const showAvatar  = !isSameNext; // show avatar at the bottom of each sequence
                    const showTime    = !isSameNext; // show time at the bottom of each sequence

                    // Bubble shape: rounded on all sides, flatten the corner near consecutive same-sender
                    const myBubbleClass   = `${isSamePrev ? "rounded-tr-md" : ""} ${isSameNext ? "rounded-br-md" : ""}`;
                    const herBubbleClass  = `${isSamePrev ? "rounded-tl-md" : ""} ${isSameNext ? "rounded-bl-md" : ""}`;

                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-1.5 ${isMe ? "justify-end" : "justify-start"} ${isSamePrev ? "mt-0.5" : "mt-3"}`}
                      >
                        {/* Other person's avatar (left side) */}
                        {!isMe && (
                          <div className="w-7 shrink-0 self-end">
                            {showAvatar && otherProfile ? (
                              <Avatar className="size-7">
                                {otherProfile.avatar_url && <AvatarImage src={otherProfile.avatar_url} />}
                                <AvatarFallback className="text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-700">
                                  {initialsFromName(displayName)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="size-7" /> // spacer
                            )}
                          </div>
                        )}

                        {/* Bubble + timestamp */}
                        <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                          <div
                            className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap transition-opacity ${
                              isMe
                                ? `bg-violet-600 text-white shadow-md shadow-violet-500/20 ${myBubbleClass} ${isOpt ? "opacity-60" : "opacity-100"}`
                                : `bg-white dark:bg-zinc-800 text-foreground border border-border/50 shadow-sm ${herBubbleClass}`
                            }`}
                          >
                            {m.content}
                          </div>
                          {showTime && (
                            <div className={`flex items-center gap-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                              <span className="text-[10px] text-muted-foreground/70">
                                {formatTime(m.created_at)}
                              </span>
                              {isMe && !isOpt && (
                                <Check className="size-3 text-violet-400" />
                              )}
                              {isMe && isOpt && (
                                <div className="size-3 border border-muted-foreground/40 border-t-transparent rounded-full animate-spin" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* My avatar (right side) */}
                        {isMe && (
                          <div className="w-7 shrink-0 self-end">
                            {showAvatar && myProfile ? (
                              <Avatar className="size-7">
                                {myProfile.avatar_url && <AvatarImage src={myProfile.avatar_url} />}
                                <AvatarFallback className="text-[10px] font-semibold bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300">
                                  {initialsFromName(myProfile.full_name ?? myProfile.username ?? null)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="size-7" /> // spacer
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* ── Input bar / Closed banner ── */}
      {chatClosed ? (
        <div className="shrink-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-border/50">
          <div className="flex items-center justify-center gap-2 px-4 py-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 w-full justify-center">
              <span className="text-sm text-muted-foreground">{chatClosed}</span>
              <span className="text-xs text-muted-foreground/60">· No se pueden enviar mensajes.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-border/50">
          <div className="flex items-end gap-2 px-3 py-3 max-w-2xl mx-auto">
            {/* My avatar in input bar */}
            {myProfile && (
              <Avatar className="size-8 shrink-0 self-end mb-1">
                {myProfile.avatar_url && <AvatarImage src={myProfile.avatar_url} />}
                <AvatarFallback className="text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                  {initialsFromName(myProfile.full_name ?? myProfile.username ?? null)}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Textarea */}
            <div className="flex-1 flex items-end bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-border/40 focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-400/30 transition-all overflow-hidden">
              <textarea
                ref={(el) => {
                  (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                  (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                }}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  autoResize(e.target);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Escribí un mensaje..."
                rows={1}
                className="flex-1 resize-none bg-transparent px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none max-h-[120px] overflow-y-auto leading-relaxed"
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="shrink-0 w-10 h-10 rounded-2xl bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95 shadow-md shadow-violet-500/25 self-end"
            >
              {sending
                ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="size-4 text-white" />}
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/40 pb-2 -mt-1">
            Enter para enviar · Shift+Enter nueva línea
          </p>
        </div>
      )}
    </div>
  );
}
