import { useEffect, useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getMyConversations, type Conversation } from "@/lib/chat/api";
import { PageHeader } from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import {
  MessageCircle, Building2, Trophy, Users, User, Search, Plus, UserPlus, X, ChevronRight, MessageSquare, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getFriends, FriendWithProfile } from "@/lib/friends/api";
import { getOrCreateConversation } from "@/lib/chat/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await getMyConversations(supabase, user.id);
    setConversations(data);
    setLoading(false);
  }, [user]);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);
    const { data } = await getFriends(supabase, user.id);
    setFriends(data ?? []);
    setLoadingFriends(false);
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function handleStartChat(friend: any) {
    if (!user) return;
    const { data, error } = await getOrCreateConversation(
      supabase,
      "friend",
      [user.id, friend.id].sort().join(":"),
      [user.id, friend.id],
      friend.full_name ?? friend.username ?? "Chat",
      undefined,
      { friend_id: friend.id }
    );

    if (error) {
      toast.error("No se pudo iniciar el chat.");
    } else if (data) {
      setIsNewChatOpen(false);
      setLocation(`/chat/${data.id}`);
    }
  }

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
          <div className="flex items-center gap-2">
            <span className="font-black italic tracking-tighter uppercase">Chat</span>
            {totalUnread > 0 && (
              <span className="text-[10px] font-black bg-brand-primary text-white px-1.5 py-0.5 rounded-full animate-pulse">
                {totalUnread}
              </span>
            )}
          </div>
        }
        actions={
          <Dialog open={isNewChatOpen} onOpenChange={(open) => {
            setIsNewChatOpen(open);
            if (open) loadFriends();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-full size-8 p-0 border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5">
                <Plus className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border-border rounded-[32px] p-0 overflow-hidden">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-xl font-black italic tracking-tighter uppercase">Nuevo Chat</DialogTitle>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Seleccioná un amigo para chatear</p>
              </DialogHeader>
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                {loadingFriends ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="size-6 text-brand-primary animate-spin" />
                  </div>
                ) : friends.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Users className="size-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No tenés amigos para chatear.</p>
                    <Link href="/amigos">
                      <Button size="sm" variant="link" className="text-brand-primary">Buscar amigos</Button>
                    </Link>
                  </div>
                ) : (
                  friends.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleStartChat(f.profile)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-border/50 text-left"
                    >
                      <Avatar className="size-10 border border-border/50">
                        {f.profile.avatar_url && <AvatarImage src={f.profile.avatar_url} />}
                        <AvatarFallback>{initialsFromName(f.profile.full_name ?? f.profile.username)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{f.profile.full_name ?? f.profile.username}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">@{f.profile.username}</p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/40" />
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
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
          <div className="flex flex-col border border-border/40 rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xl shadow-black/5 divide-y divide-border/30">
            <AnimatePresence initial={false}>
              {filtered.map((c, index) => {
                const other = c.other_participant;
                const avatarName = other?.full_name ?? other?.username ?? c.title;
                const hasUnread = (c.unread_count ?? 0) > 0;

                return (
                  <motion.button
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setLocation(`/chat/${c.id}`)}
                    className={cn(
                      "flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 group",
                      hasUnread && "bg-brand-primary/5 dark:bg-brand-primary/10"
                    )}
                  >
                    {/* Avatar / Type icon */}
                    <div className="relative shrink-0">
                      <div className="relative">
                        <Avatar className="size-14 border-2 border-transparent group-hover:border-brand-primary/20 transition-all duration-300">
                          {other?.avatar_url && <AvatarImage src={other.avatar_url} />}
                          <AvatarFallback className="text-base font-black italic bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {initialsFromName(avatarName)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Type badge */}
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300",
                          typeColor(c.type)
                        )}>
                          <span className="scale-[0.6]">{TYPE_ICONS[c.type] ?? <MessageCircle className="size-4" />}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={cn(
                          "text-sm truncate tracking-tight",
                          hasUnread ? "font-black text-foreground italic uppercase" : "font-bold text-foreground"
                        )}>
                          {other?.full_name ?? other?.username ?? c.title}
                        </p>
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter tabular-nums shrink-0">
                          {formatRelativeTime(c.last_message_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 truncate">{c.subtitle ?? c.title}</p>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className={cn(
                          "text-xs truncate",
                          hasUnread ? "text-brand-primary font-black italic tracking-tight" : "text-muted-foreground/80 font-medium"
                        )}>
                          {c.last_message_text || "Comenzá a chatear..."}
                        </p>
                        
                        {/* Unread badge */}
                        {hasUnread && (
                          <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="shrink-0"
                          >
                            <span className="min-w-[20px] h-5 rounded-full bg-brand-primary text-white text-[10px] font-black flex items-center justify-center px-1.5 shadow-lg shadow-brand-primary/20">
                              {c.unread_count! > 99 ? "99+" : c.unread_count}
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="size-4 text-muted-foreground/20 group-hover:text-brand-primary/40 transition-colors shrink-0" />
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
