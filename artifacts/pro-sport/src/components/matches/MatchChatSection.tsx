import type { RefObject } from "react";
import { Lock, MessageSquare, Send, Check, Star, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initialsFromName } from "@/lib/format";
import type { ChatMessage } from "@/hooks/useMatchDetail";
import type { MatchParticipant, Profile } from "@/lib/types/db";

interface Props {
  messages: ChatMessage[];
  profilesById: Map<string, Profile>;
  userId: string | undefined;
  canChat: boolean;
  chatMessage: string;
  sendingMsg: boolean;
  chatBottomRef: RefObject<HTMLDivElement | null>;
  chatInputRef: RefObject<HTMLInputElement | null>;
  onChatMessageChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  showRating: boolean;
  othersToRate: MatchParticipant[];
  myRatings: Record<string, number>;
  submittingRatings: boolean;
  ratingsSubmitted: boolean;
  isCompleted: boolean;
  onSetRating: (userId: string, rating: number) => void;
  onSubmitRatings: () => void;
}

export function MatchChatSection({
  messages, profilesById, userId, canChat,
  chatMessage, sendingMsg, chatBottomRef, chatInputRef,
  onChatMessageChange, onSendMessage,
  showRating, othersToRate, myRatings, submittingRatings, ratingsSubmitted, isCompleted,
  onSetRating, onSubmitRatings,
}: Props) {
  return (
    <>
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 overflow-hidden shadow-xl shadow-black/5">
        <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
              <MessageSquare className="size-4 text-brand-primary" />
            </div>
            <h2 className="text-sm font-black italic tracking-tighter uppercase">Chat del partido</h2>
          </div>
          {canChat && messages.length > 0 && (
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{messages.length} MENSAJES</span>
          )}
        </div>

        {canChat ? (
          <div className="flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col gap-1.5 p-5 bg-zinc-50/30 dark:bg-zinc-950/20">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center opacity-40">
                  <MessageSquare className="size-8" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin mensajes. ¡Rompé el hielo!</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const author = profilesById.get(msg.sender_id);
                const isMe = msg.sender_id === userId;
                const isSameAuthor = i > 0 && messages[i - 1].sender_id === msg.sender_id;
                return (
                  <div key={msg.id} className={cn("flex items-end gap-2", isMe ? "flex-row-reverse" : "flex-row", !isSameAuthor && "mt-3")}>
                    {!isMe && (
                      <div className="w-6 shrink-0 mb-0.5">
                        <Avatar className="size-6 border border-border/50">
                          {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                          <AvatarFallback className="text-[8px] font-black italic bg-zinc-100 dark:bg-zinc-800">{initialsFromName(author?.full_name)}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    <div className={cn("flex flex-col gap-1 max-w-[80%]", isMe ? "items-end" : "items-start")}>
                      {!isMe && !isSameAuthor && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                          {author?.full_name?.split(" ")[0] ?? author?.username ?? "Jugador"}
                        </span>
                      )}
                      <div className={cn(
                        "px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                        isMe ? "bg-brand-primary text-white rounded-[18px] rounded-br-[4px]" : "bg-white dark:bg-zinc-800 border border-border/40 text-foreground rounded-[18px] rounded-bl-[4px]"
                      )}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1.5 px-1.5">
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter tabular-nums">
                          {new Date(msg.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isMe && <Check className="size-2.5 text-brand-primary/40" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-border/30 shadow-2xl">
              <form onSubmit={onSendMessage} className="flex gap-2 items-end">
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-[22px] border border-border/40 focus-within:border-brand-primary/40 focus-within:ring-4 focus-within:ring-brand-primary/10 transition-all duration-300 overflow-hidden shadow-inner">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatMessage}
                    onChange={(e) => onChatMessageChange(e.target.value)}
                    placeholder="Escribí un mensaje…"
                    className="w-full bg-transparent px-5 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingMsg || !chatMessage.trim()}
                  className="shrink-0 w-11 h-11 rounded-[18px] bg-brand-primary hover:bg-brand-primary/90 active:bg-brand-primary/80 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-90 shadow-xl shadow-brand-primary/20"
                >
                  {sendingMsg ? <Loader2 className="size-4 text-white animate-spin" /> : <Send className="size-4 text-white" />}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-[24px] bg-muted/30 flex items-center justify-center border border-dashed border-border/60">
              <Lock className="size-6 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black italic tracking-tighter uppercase">Chat Bloqueado</p>
              <p className="text-xs text-muted-foreground/80 max-w-[200px] leading-relaxed mx-auto">Unite al partido para chatear con los jugadores y coordinar el juego.</p>
            </div>
          </div>
        )}
      </div>

      {/* Post-match rating */}
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
                        <button key={star} type="button" onClick={() => onSetRating(p.user_id, star)} className="p-0.5 transition-transform active:scale-90">
                          <Star className={`size-6 transition-colors ${star <= currentRating ? "text-amber-400 fill-amber-400" : "text-zinc-200 dark:text-zinc-700"}`} />
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
            <Button className="mt-4 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold" disabled={submittingRatings || Object.keys(myRatings).length === 0} onClick={onSubmitRatings}>
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
    </>
  );
}
