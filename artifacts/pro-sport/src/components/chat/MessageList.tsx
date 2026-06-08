import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initialsFromName } from "@/lib/format";
import type { MessageWithSender } from "@/lib/chat/api";

interface OtherProfile {
  avatar_url: string | null;
  full_name: string | null;
  username: string | null;
}

interface MyProfile {
  avatar_url: string | null;
  full_name: string | null;
  username: string | null;
}

interface MessageListProps {
  messages: MessageWithSender[];
  currentUserId: string;
  otherProfile?: OtherProfile | null;
  myProfile?: MyProfile | null;
  displayName: string;
  isLoading: boolean;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}

function isOptimistic(id: string) {
  return id.startsWith("opt-");
}

export function MessageList({
  messages,
  currentUserId,
  otherProfile,
  myProfile,
  displayName,
  isLoading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 0 ? "smooth" : "instant" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="size-8 text-brand-primary animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          Cargando conversación...
        </p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
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
    );
  }

  // Group messages by date
  const grouped: { label: string; messages: MessageWithSender[] }[] = [];
  messages.forEach((m) => {
    const label = formatDateLabel(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) last.messages.push(m);
    else grouped.push({ label, messages: [m] });
  });

  return (
    <>
      {grouped.map(({ label, messages: msgs }) => (
        <div key={label} className="space-y-1">
          {/* Date separator */}
          <div className="flex items-center gap-4 py-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-border/50 rounded-full shadow-sm">
              {label}
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
          </div>

          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {msgs.map((m, i) => {
                const isMe = m.sender_id === currentUserId;
                const isOpt = isOptimistic(m.id);
                const prevMsg = i > 0 ? msgs[i - 1] : null;
                const nextMsg = i < msgs.length - 1 ? msgs[i + 1] : null;
                const isSamePrev = prevMsg?.sender_id === m.sender_id;
                const isSameNext = nextMsg?.sender_id === m.sender_id;
                const showAvatar = !isSameNext;
                const showTime = !isSameNext;

                const myBubbleClass = cn(
                  "rounded-[20px]",
                  isSamePrev && "rounded-tr-[4px]",
                  isSameNext && "rounded-br-[4px]"
                );
                const herBubbleClass = cn(
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
                    {!isMe && (
                      <div className="w-8 shrink-0 mb-0.5">
                        {showAvatar && (
                          <Avatar className="size-8 ring-1 ring-border/60">
                            <AvatarImage src={otherProfile?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px] font-black italic bg-zinc-200 dark:bg-zinc-800">
                              {initialsFromName(displayName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div
                      className={cn(
                        "flex flex-col gap-1 max-w-[80%] md:max-w-[70%]",
                        isMe ? "items-end" : "items-start"
                      )}
                    >
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
                        <div
                          className={cn(
                            "flex items-center gap-1 px-2",
                            isMe ? "justify-end" : "justify-start"
                          )}
                        >
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

                    {isMe && (
                      <div className="w-8 shrink-0 mb-0.5">
                        {showAvatar && (
                          <Avatar className="size-8 ring-2 ring-brand-primary/25">
                            <AvatarImage src={myProfile?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px] font-black italic bg-brand-primary/10 text-brand-primary">
                              {initialsFromName(
                                myProfile?.full_name ?? myProfile?.username ?? null
                              )}
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
      ))}
      <div ref={bottomRef} className="h-4" />
    </>
  );
}
