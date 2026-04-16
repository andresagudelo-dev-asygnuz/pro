"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/match/actions";
import type { Message } from "@/lib/types/db";

type MessageWithAuthor = Message & {
  author_name: string | null;
};

export function MatchChat({
  matchId,
  currentUserId,
  initialMessages,
  authorsById,
}: {
  matchId: string;
  currentUserId: string;
  initialMessages: Message[];
  authorsById: Record<string, string | null>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<MessageWithAuthor[]>(() =>
    initialMessages.map((m) => ({
      ...m,
      author_name: authorsById[m.sender_id] ?? null,
    })),
  );
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}:messages`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          const m = payload.new as Message;
          let authorName = authorsById[m.sender_id] ?? null;
          if (!authorName) {
            const { data } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", m.sender_id)
              .maybeSingle();
            authorName = data?.full_name ?? data?.username ?? null;
          }
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, { ...m, author_name: authorName }],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, matchId, authorsById]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    startTransition(async () => {
      try {
        await sendMessage(matchId, content);
      } catch (err) {
        console.error(err);
        setDraft(content);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scrollerRef}
        className="flex h-80 flex-col gap-2 overflow-y-auto rounded-lg border bg-muted/40 p-3"
      >
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-muted-foreground">
            Todavía nadie escribió. Rompé el hielo.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={
                  mine
                    ? "self-end rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "self-start rounded-lg bg-background px-3 py-2 text-sm shadow-sm"
                }
              >
                {!mine && m.author_name && (
                  <p className="mb-0.5 text-xs font-medium text-muted-foreground">
                    {m.author_name}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Escribí un mensaje…"
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" disabled={pending || !draft.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
