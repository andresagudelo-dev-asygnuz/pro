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
import { ArrowLeft, Send, Building2, Trophy, Users, User, MessageCircle } from "lucide-react";

const supabase = createClient();

const TYPE_ICONS: Record<string, React.ReactNode> = {
  booking:    <Building2 className="size-3.5 text-amber-500" />,
  match:      <Users className="size-3.5 text-blue-500" />,
  tournament: <Trophy className="size-3.5 text-violet-500" />,
  friend:     <User className="size-3.5 text-emerald-500" />,
  direct:     <MessageCircle className="size-3.5 text-zinc-400" />,
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

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherProfile, setOtherProfile] = useState<{
    id: string; full_name: string | null; username: string | null; avatar_url: string | null; city: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    if (!user || !id) return;

    const load = async () => {
      // Load conversation
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();
      if (!conv) { setLocation("/chat"); return; }
      setConversation(conv as Conversation);

      // Load other participant's profile
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", id)
        .neq("user_id", user.id);
      const otherId = parts?.[0]?.user_id as string | undefined;
      if (otherId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, city")
          .eq("id", otherId)
          .single();
        if (profile) setOtherProfile(profile as typeof otherProfile);
      }

      // Load messages
      const { data: msgs } = await getConversationMessages(supabase, id);
      setMessages(msgs);
      setLoading(false);

      // Mark as read
      await markConversationRead(supabase, id, user.id);
    };

    load();
  }, [user, id, setLocation]);

  useEffect(() => { if (!loading) scrollToBottom(); }, [loading, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    if (!id || !user) return;
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        async (payload: { new: ChatMessage }) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === payload.new.id);
            return exists ? prev : [...prev, payload.new];
          });
          setTimeout(() => scrollToBottom(true), 50);
          if (payload.new.sender_id !== user.id) {
            await markConversationRead(supabase, id, user.id);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user, scrollToBottom]);

  const handleSend = async () => {
    if (!text.trim() || !user || !id || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);

    // Optimistic update
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      conversation_id: id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollToBottom(true), 50);

    const { data, error } = await sendMessage(supabase, id, user.id, content);
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(content);
    } else if (data) {
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? data : m));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
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
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="shrink-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => setLocation("/chat")}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="relative shrink-0">
            {otherProfile ? (
              <Avatar className="size-9">
                {otherProfile.avatar_url && <AvatarImage src={otherProfile.avatar_url} />}
                <AvatarFallback className="text-xs font-semibold">
                  {initialsFromName(displayName)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="size-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                {conv ? (TYPE_ICONS[conv.type] ?? <MessageCircle className="size-4" />) : <MessageCircle className="size-4" />}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            {conv && (
              <div className="flex items-center gap-1">
                {TYPE_ICONS[conv.type]}
                <p className="text-xs text-muted-foreground truncate">{conv.subtitle ?? conv.title}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl w-full mx-auto space-y-1">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <MessageCircle className="size-6 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-sm mb-1">Iniciá la conversación</p>
              <p className="text-xs text-muted-foreground">
                Coordiná los detalles con {displayName}.
              </p>
            </div>
          </div>
        ) : (
          grouped.map(({ label, messages: msgs }) => (
            <div key={label}>
              {/* Date separator */}
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[11px] text-muted-foreground font-medium px-2">{label}</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>
              {/* Messages in group */}
              <div className="space-y-1">
                {msgs.map((m, i) => {
                  const isMe = m.sender_id === user?.id;
                  const isOpt = m.id.startsWith("opt-");
                  const prevMsg = i > 0 ? msgs[i - 1] : null;
                  const isSameSender = prevMsg?.sender_id === m.sender_id;

                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"} ${isSameSender ? "mt-0.5" : "mt-2"}`}>
                      {/* Other's avatar (show only for first in sequence) */}
                      {!isMe && (
                        <div className="w-7 shrink-0 mr-1.5 self-end mb-0.5">
                          {!isSameSender && otherProfile && (
                            <Avatar className="size-7">
                              {otherProfile.avatar_url && <AvatarImage src={otherProfile.avatar_url} />}
                              <AvatarFallback className="text-[10px]">{initialsFromName(displayName)}</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                        <div
                          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                            isMe
                              ? `bg-violet-600 text-white ${isSameSender ? "rounded-tr-md" : ""} ${isOpt ? "opacity-70" : ""}`
                              : `bg-white dark:bg-zinc-800 text-foreground border border-border/50 ${isSameSender ? "rounded-tl-md" : ""}`
                          }`}
                        >
                          {m.content}
                        </div>
                        {!isSameSender && (
                          <span className="text-[10px] text-muted-foreground px-1">
                            {formatTime(m.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-border/50 px-4 py-3">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Escribí un mensaje..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-border/60 bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 max-h-[120px] overflow-y-auto leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="shrink-0 w-10 h-10 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95 shadow-md shadow-violet-500/20"
          >
            <Send className="size-4 text-white" />
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/50 mt-1.5">
          Enter para enviar · Shift+Enter nueva línea
        </p>
      </div>
    </div>
  );
}
