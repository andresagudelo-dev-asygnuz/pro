import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getMyConversations, type Conversation } from "@/lib/chat/api";
import { PageHeader } from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import {
  MessageCircle, Building2, Trophy, Users, User, Search,
} from "lucide-react";

const supabase = createClient();

type Filter = "all" | "booking" | "match" | "tournament" | "friend";

const FILTER_LABELS: Record<Filter, string> = {
  all: "Todos", booking: "Reservas", match: "Partidos", tournament: "Torneos", friend: "Amigos",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  booking:    <Building2 className="size-4 text-amber-500" />,
  match:      <Users className="size-4 text-blue-500" />,
  tournament: <Trophy className="size-4 text-violet-500" />,
  friend:     <User className="size-4 text-emerald-500" />,
  direct:     <MessageCircle className="size-4 text-zinc-400" />,
};

function typeColor(type: string): string {
  if (type === "booking")    return "bg-amber-100 dark:bg-amber-900/30";
  if (type === "match")      return "bg-blue-100 dark:bg-blue-900/30";
  if (type === "tournament") return "bg-violet-100 dark:bg-violet-900/30";
  if (type === "friend")     return "bg-emerald-100 dark:bg-emerald-900/30";
  return "bg-muted";
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)    return "ahora";
  if (mins < 60)   return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)    return `${days}d`;
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export default function ChatListPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await getMyConversations(supabase, user.id);
    setConversations(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const filtered = conversations.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.subtitle ?? "").toLowerCase().includes(q) ||
        (c.last_message_text ?? "").toLowerCase().includes(q) ||
        (c.other_participant?.full_name ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countFor = (f: Filter) =>
    f === "all" ? conversations.length : conversations.filter((c) => c.type === f).length;

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title={
          <>
            Chat
            {totalUnread > 0 && (
              <span className="ml-2 text-xs font-semibold bg-violet-600 text-white px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </>
        }
      />

      <main className="container mx-auto px-4 py-4 max-w-2xl space-y-3">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversación..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-border/60 bg-white dark:bg-zinc-900 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Filtros */}
        {conversations.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
              const count = countFor(f);
              if (f !== "all" && count === 0) return null;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    filter === f
                      ? "bg-violet-600 text-white border-violet-600"
                      : "border-border/60 hover:border-violet-400 hover:text-violet-600 bg-white dark:bg-zinc-900"
                  }`}
                >
                  {FILTER_LABELS[f]}{count > 0 ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <MessageCircle className="size-7 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold mb-1">
                {search ? "Sin resultados" : conversations.length === 0 ? "Sin conversaciones" : "Sin conversaciones en esta categoría"}
              </p>
              <p className="text-sm text-muted-foreground">
                {conversations.length === 0
                  ? "Los chats se crean automáticamente cuando reservás una cancha, creás un partido o empezás a coordinar."
                  : "Probá con otro filtro."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col border border-border/60 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm divide-y divide-border/50">
            {filtered.map((c) => {
              const other = c.other_participant;
              const avatarName = other?.full_name ?? other?.username ?? c.title;
              const hasUnread = (c.unread_count ?? 0) > 0;

              return (
                <button
                  key={c.id}
                  onClick={() => setLocation(`/chat/${c.id}`)}
                  className={`flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 ${hasUnread ? "bg-violet-50/40 dark:bg-violet-900/10" : ""}`}
                >
                  {/* Avatar / Type icon */}
                  <div className="relative shrink-0">
                    {other ? (
                      <Avatar className="size-11">
                        {other.avatar_url && <AvatarImage src={other.avatar_url} />}
                        <AvatarFallback className="text-sm font-semibold">
                          {initialsFromName(avatarName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={`size-11 rounded-full flex items-center justify-center ${typeColor(c.type)}`}>
                        {TYPE_ICONS[c.type] ?? <MessageCircle className="size-4" />}
                      </div>
                    )}
                    {/* Type badge */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center ${typeColor(c.type)}`}>
                      <span className="scale-75">{TYPE_ICONS[c.type]}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${hasUnread ? "font-semibold" : "font-medium"}`}>
                        {other?.full_name ?? other?.username ?? c.title}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatRelativeTime(c.last_message_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.subtitle ?? c.title}</p>
                    {c.last_message_text && (
                      <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {c.last_message_text}
                      </p>
                    )}
                  </div>

                  {/* Unread badge */}
                  {hasUnread && (
                    <div className="shrink-0">
                      <span className="min-w-[20px] h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
                        {c.unread_count! > 99 ? "99+" : c.unread_count}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
