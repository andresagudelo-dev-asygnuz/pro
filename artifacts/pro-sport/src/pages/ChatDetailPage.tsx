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
import { ArrowLeft, Send, Building2, Trophy, Users, User, MessageCircle, Check, ShieldCheck, ChevronRight, Info, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col h-[100dvh] bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 bg-white dark:bg-zinc-900 border-b border-border/50 shadow-xl z-30">
        <div className="flex items-center gap-4 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => setLocation("/chat")}
            className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Avatar Container */}
          <div className="relative shrink-0">
            <div className="relative">
              <Avatar className="size-11 border-2 border-brand-primary/20 p-0.5 bg-white dark:bg-zinc-800">
                {otherProfile?.avatar_url && <AvatarImage src={otherProfile.avatar_url} />}
                <AvatarFallback className="text-sm font-black italic bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  {initialsFromName(displayName)}
                </AvatarFallback>
              </Avatar>
              {/* Type badge */}
              {conv && (
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-lg",
                  conv.type === "booking" ? "bg-amber-100 dark:bg-amber-900/30" :
                  conv.type === "match" ? "bg-blue-100 dark:bg-blue-900/30" :
                  conv.type === "tournament" ? "bg-violet-100 dark:bg-violet-900/30" :
                  "bg-zinc-100 dark:bg-zinc-800"
                )}>
                  <span className="scale-[0.5]">{TYPE_ICONS[conv.type]}</span>
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-black italic tracking-tighter uppercase truncate leading-tight">{displayName}</p>
              {otherProfile && <ShieldCheck className="size-3.5 text-brand-primary" />}
            </div>
            {conv && (
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate leading-tight mt-1">
                {conv.subtitle ?? conv.title}
              </p>
            )}
          </div>

          {/* Action button (e.g. details) */}
          <button className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0">
            <Info className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 py-6 max-w-2xl w-full mx-auto space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="size-8 text-brand-primary animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cargando conversación...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
              <div className="w-20 h-20 rounded-[32px] bg-brand-primary/10 flex items-center justify-center shadow-xl shadow-brand-primary/10 border border-brand-primary/20">
                <MessageSquare className="size-10 text-brand-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-black italic tracking-tighter uppercase text-xl">Coordiná el juego</p>
                <p className="text-xs text-muted-foreground/80 max-w-[200px] leading-relaxed">
                  Iniciá la conversación con {displayName} para ultimar detalles.
                </p>
              </div>
            </div>
          ) : (
            grouped.map(({ label, messages: msgs }) => (
              <div key={label} className="space-y-1">
                {/* Date separator */}
                <div className="flex items-center gap-4 py-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-border/50 rounded-full shadow-sm">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
                </div>

                {/* Messages */}
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {msgs.map((m, i) => {
                      const isMe        = m.sender_id === user?.id;
                      const isOpt       = isOptimistic(m.id);
                      const prevMsg     = i > 0 ? msgs[i - 1] : null;
                      const nextMsg     = i < msgs.length - 1 ? msgs[i + 1] : null;
                      const isSamePrev  = prevMsg?.sender_id === m.sender_id;
                      const isSameNext  = nextMsg?.sender_id === m.sender_id;
                      const showAvatar  = !isSameNext; 
                      const showTime    = !isSameNext; 

                      const myBubbleClass   = cn(
                        "rounded-[20px]",
                        isSamePrev && "rounded-tr-[4px]",
                        isSameNext && "rounded-br-[4px]"
                      );
                      const herBubbleClass  = cn(
                        "rounded-[20px]",
                        isSamePrev && "rounded-tl-[4px]",
                        isSameNext && "rounded-bl-[4px]"
                      );

                      return (
                        <motion.div
                          key={m.id}
                          initial={isOpt ? { scale: 0.95, opacity: 0 } : false}
                          animate={{ scale: 1, opacity: 1 }}
                          className={cn(
                            "flex items-end gap-2",
                            isMe ? "justify-end" : "justify-start",
                            !isSamePrev && "mt-4"
                          )}
                        >
                          {/* Other person's avatar (left side) */}
                          {!isMe && (
                            <div className="w-8 shrink-0 mb-0.5">
                              {showAvatar && (
                                <Avatar className="size-8 border border-border/50 shadow-sm">
                                  {otherProfile?.avatar_url && <AvatarImage src={otherProfile.avatar_url} />}
                                  <AvatarFallback className="text-[10px] font-black italic bg-zinc-200 dark:bg-zinc-800">
                                    {initialsFromName(displayName)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}

                          {/* Bubble + timestamp */}
                          <div className={cn(
                            "flex flex-col gap-1 max-w-[80%] md:max-w-[70%]",
                            isMe ? "items-end" : "items-start"
                          )}>
                            <div
                              className={cn(
                                "px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap transition-all shadow-sm",
                                isMe
                                  ? `bg-brand-primary text-white shadow-brand-primary/20 ${myBubbleClass} ${isOpt && "opacity-60"}`
                                  : `bg-white dark:bg-zinc-900 text-foreground border border-border/40 ${herBubbleClass}`
                              )}
                            >
                              {m.content}
                            </div>
                            {showTime && (
                              <div className={cn(
                                "flex items-center gap-1 px-2",
                                isMe ? "justify-end" : "justify-start"
                              )}>
                                <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter tabular-nums">
                                  {formatTime(m.created_at)}
                                </span>
                                {isMe && (
                                  <div className="flex items-center">
                                    {isOpt ? (
                                      <Loader2 className="size-2.5 text-brand-primary animate-spin" />
                                    ) : (
                                      <Check className="size-2.5 text-brand-primary" />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* My avatar (right side) */}
                          {isMe && (
                            <div className="w-8 shrink-0 mb-0.5">
                              {showAvatar && (
                                <Avatar className="size-8 border-2 border-brand-primary/20 p-0.5 bg-white dark:bg-zinc-800 shadow-sm">
                                  {myProfile?.avatar_url && <AvatarImage src={myProfile.avatar_url} />}
                                  <AvatarFallback className="text-[10px] font-black italic bg-brand-primary/10 text-brand-primary">
                                    {initialsFromName(myProfile?.full_name ?? myProfile?.username ?? null)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* ── Input bar / Closed banner ── */}
      {chatClosed ? (
        <div className="shrink-0 bg-white dark:bg-zinc-900 border-t border-border/50 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-[24px] px-6 py-4 border border-border/50 shadow-inner">
              <Info className="size-5 text-muted-foreground/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 leading-tight">{chatClosed}</p>
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter leading-tight mt-0.5">No se pueden enviar mensajes en este hilo.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 bg-white dark:bg-zinc-900 border-t border-border/50 pb-safe shadow-2xl z-20">
          <div className="flex items-end gap-3 px-4 py-4 max-w-2xl mx-auto">
            {/* My avatar in input bar */}
            <div className="hidden sm:block mb-1">
              <Avatar className="size-9 border-2 border-brand-primary/20 p-0.5 bg-white dark:bg-zinc-800">
                {myProfile?.avatar_url && <AvatarImage src={myProfile.avatar_url} />}
                <AvatarFallback className="text-[10px] font-black italic bg-brand-primary/10 text-brand-primary">
                  {initialsFromName(myProfile?.full_name ?? myProfile?.username ?? null)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Textarea Container */}
            <div className="flex-1 flex items-end bg-zinc-100 dark:bg-zinc-800/80 rounded-[28px] border border-border/40 focus-within:border-brand-primary/40 focus-within:ring-4 focus-within:ring-brand-primary/10 transition-all duration-300 overflow-hidden shadow-inner group">
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
                className="flex-1 resize-none bg-transparent px-5 py-3.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none max-h-[120px] overflow-y-auto leading-relaxed font-medium"
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="shrink-0 w-12 h-12 rounded-[22px] bg-brand-primary hover:bg-brand-primary/90 active:bg-brand-primary/80 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-90 shadow-xl shadow-brand-primary/20 self-end mb-0.5"
            >
              {sending
                ? <Loader2 className="size-5 text-white animate-spin" />
                : <Send className="size-5 text-white" />}
            </button>
          </div>
          <p className="text-center text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] pb-3 -mt-1">
            Pulsa enter para enviar
          </p>
        </div>
      )}
    </div>
  );
}
