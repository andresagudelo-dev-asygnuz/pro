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

type ChatStatus = {
  rt: string;
  rtErr: string | null;
  polls: number;
  lastPollAt: number | null;
  lastPollErr: string | null;
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
  const [status, setStatus] = useState<ChatStatus>({
    rt: "init",
    rtErr: null,
    polls: 0,
    lastPollAt: null,
    lastPollErr: null,
  });
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Espejo síncrono de messages para consultarlo dentro del effect sin
  // depender de closures con estado viejo.
  const messagesRef = useRef<MessageWithAuthor[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Espejo del map de autores: así podemos cambiarlo sin que el effect se
  // tire abajo y reconecte el canal de Realtime en cada cambio de props.
  const authorsRef = useRef(authorsById);
  useEffect(() => {
    authorsRef.current = authorsById;
  }, [authorsById]);

  const scrollToBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Bloque principal: suscribe Realtime + pollea cada 2s. Dependencias
  // minimizadas a [supabase, matchId] para no reconectar en cada render.
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const addMessage = async (m: Message) => {
      if (messagesRef.current.some((x) => x.id === m.id)) return;
      let authorName = authorsRef.current[m.sender_id] ?? null;
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
    };

    const pollOnce = async () => {
      if (cancelled) return;
      const lastCreatedAt =
        messagesRef.current[messagesRef.current.length - 1]?.created_at ?? null;
      let q = supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (lastCreatedAt) q = q.gt("created_at", lastCreatedAt);
      const { data, error } = await q;
      setStatus((s) => ({
        ...s,
        polls: s.polls + 1,
        lastPollAt: Date.now(),
        lastPollErr: error?.message ?? null,
      }));
      if (error || !data) return;
      for (const row of data) {
        await addMessage(row as Message);
      }
    };

    // Polling every 2s. Pausado si la pestaña está oculta — al volver al
    // foco hacemos un fetch inmediato.
    pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") void pollOnce();
    }, 2000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void pollOnce();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    // Subscribe a Realtime (bonus: latencia sub-segundo cuando funciona).
    const subscribe = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      // Canal con sufijo random — evita reutilizar canales viejos que puedan
      // haber quedado colgados tras un HMR o navegación suave.
      const channelName = `match:${matchId}:messages:${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            void addMessage(payload.new as Message);
          },
        )
        .subscribe((s, err) => {
          setStatus((prev) => ({
            ...prev,
            rt: s,
            rtErr: err ? err.message : null,
          }));
        });
    };
    void subscribe();

    // Primer poll inmediato + otro al montar la suscripción (por si hubo un
    // mensaje entre SSR y mount).
    void pollOnce();

    const { data: authSub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
        }
      },
    );

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, matchId]);

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

  const lastPollLabel = status.lastPollAt
    ? new Date(status.lastPollAt).toLocaleTimeString()
    : "—";
  const rtOk = status.rt === "SUBSCRIBED";

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

      {/* Barra de diagnóstico. Nos permite ver en vivo si Realtime está
          conectado y si el polling está corriendo. Si el usuario reporta
          que no llegan mensajes podemos pedirle un screenshot de esta línea
          y vemos el estado real del cliente. */}
      <p className="text-[10px] font-mono text-muted-foreground/70">
        rt:{" "}
        <span className={rtOk ? "text-emerald-600" : "text-amber-600"}>
          {status.rt}
        </span>
        {status.rtErr && <span className="text-rose-600"> ({status.rtErr})</span>}
        {" · "}polls: {status.polls} · last: {lastPollLabel}
        {status.lastPollErr && (
          <span className="text-rose-600"> err={status.lastPollErr}</span>
        )}
        {" · "}msgs: {messages.length}
      </p>
    </div>
  );
}
