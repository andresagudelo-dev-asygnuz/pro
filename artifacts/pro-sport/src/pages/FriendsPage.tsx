import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialsFromName } from "@/lib/format";
import {
  getFriends,
  getPendingReceived,
  getPendingSent,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  type FriendWithProfile,
} from "@/lib/friends/api";
import type { Profile } from "@/lib/types/db";
import { Users, UserPlus, Search, UserCheck, Clock, X, Check } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";

const supabase = createClient();

type Tab = "amigos" | "solicitudes" | "buscar";

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("amigos");

  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [received, setReceived] = useState<FriendWithProfile[]>([]);
  const [sent, setSent] = useState<FriendWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [newlySentIds, setNewlySentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [fr, rc, sn] = await Promise.all([
      getFriends(supabase, user.id),
      getPendingReceived(supabase, user.id),
      getPendingSent(supabase, user.id),
    ]);
    setFriends(fr.data ?? []);
    setReceived(rc.data ?? []);
    setSent(sn.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!searchQuery.trim() || !user) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await searchUsers(supabase, searchQuery, user.id);
      setSearchResults(data ?? []);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, user]);

  async function handleSendRequest(addresseeId: string) {
    if (!user) return;
    const { error } = await sendFriendRequest(supabase, user.id, addresseeId);
    if (error) { toast.error(error); return; }
    setNewlySentIds((prev) => new Set([...prev, addresseeId]));
    toast.success("Solicitud enviada.");
  }

  async function handleAccept(friendshipId: string) {
    const { error } = await acceptFriendRequest(supabase, friendshipId);
    if (error) { toast.error(error); return; }
    toast.success("¡Ahora son amigos!");
    load();
  }

  async function handleReject(friendshipId: string) {
    const { error } = await rejectFriendRequest(supabase, friendshipId);
    if (error) { toast.error(error); return; }
    setReceived((prev) => prev.filter((f) => f.id !== friendshipId));
  }

  async function handleCancelSent(friendshipId: string) {
    const { error } = await removeFriend(supabase, friendshipId);
    if (error) { toast.error(error); return; }
    setSent((prev) => prev.filter((f) => f.id !== friendshipId));
  }

  async function handleRemoveFriend(friendshipId: string) {
    const { error } = await removeFriend(supabase, friendshipId);
    if (error) { toast.error(error); return; }
    setFriends((prev) => prev.filter((f) => f.id !== friendshipId));
    toast.success("Amigo eliminado.");
  }

  const friendIds = new Set(
    friends.map((f) => (f.requester_id === user?.id ? f.addressee_id : f.requester_id)),
  );
  const pendingReceivedMap = new Map(received.map((f) => [f.requester_id, f]));
  const pendingSentIds = new Set([...sent.map((f) => f.addressee_id), ...newlySentIds]);
  const pendingCount = received.length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader title="Amigos" />

      <div className="sticky top-14 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex">
            {(
              [
                { key: "amigos" as Tab, label: "Amigos", count: friends.length },
                { key: "solicitudes" as Tab, label: "Solicitudes", count: pendingCount },
                { key: "buscar" as Tab, label: "Buscar" },
              ] as const
            ).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-3 text-sm font-medium relative transition-colors ${
                  tab === key ? "text-brand-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {count !== undefined && count > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                      tab === key
                        ? "bg-brand-primary/15 text-brand-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
                {tab === key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === "amigos" && (
              <div className="flex flex-col gap-3">
                {friends.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-16 text-center">
                    <Users className="size-12 text-muted-foreground/30" />
                    <div>
                      <p className="font-medium">Todavía no tenés amigos</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Buscá usuarios y agregálos como amigos.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setTab("buscar")}>
                      <UserPlus className="size-4 mr-2" />
                      Buscar usuarios
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {friends.map((f) => {
                      const friendId =
                        f.requester_id === user?.id ? f.addressee_id : f.requester_id;
                      return (
                        <div
                          key={f.id}
                          className="flex items-center gap-3 rounded-xl border bg-white dark:bg-zinc-900 p-4"
                        >
                          <Link href={`/profile/${friendId}`}>
                            <Avatar className="size-10 cursor-pointer">
                              {f.profile.avatar_url && (
                                <AvatarImage src={f.profile.avatar_url} />
                              )}
                              <AvatarFallback>
                                {initialsFromName(f.profile.full_name ?? f.profile.username)}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <Link href={`/profile/${friendId}`} className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {f.profile.full_name ?? f.profile.username ?? "Usuario"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[f.profile.city, f.profile.username ? `@${f.profile.username}` : ""]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFriend(f.id)}
                            className="text-xs shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            Eliminar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "solicitudes" && (
              <div className="flex flex-col gap-6">
                {received.length === 0 && sent.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <UserCheck className="size-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No tenés solicitudes pendientes.</p>
                  </div>
                ) : (
                  <>
                    {received.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                          Recibidas
                        </p>
                        <div className="flex flex-col gap-2">
                          {received.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center gap-3 rounded-xl border bg-white dark:bg-zinc-900 p-4"
                            >
                              <Link href={`/profile/${f.requester_id}`}>
                                <Avatar className="size-10 cursor-pointer">
                                  {f.profile.avatar_url && (
                                    <AvatarImage src={f.profile.avatar_url} />
                                  )}
                                  <AvatarFallback>
                                    {initialsFromName(f.profile.full_name ?? f.profile.username)}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {f.profile.full_name ?? f.profile.username ?? "Usuario"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  quiere ser tu amigo
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button size="sm" onClick={() => handleAccept(f.id)}>
                                  <Check className="size-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReject(f.id)}
                                >
                                  <X className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sent.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                          Enviadas
                        </p>
                        <div className="flex flex-col gap-2">
                          {sent.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center gap-3 rounded-xl border bg-white dark:bg-zinc-900 p-4"
                            >
                              <Link href={`/profile/${f.addressee_id}`}>
                                <Avatar className="size-10 cursor-pointer">
                                  {f.profile.avatar_url && (
                                    <AvatarImage src={f.profile.avatar_url} />
                                  )}
                                  <AvatarFallback>
                                    {initialsFromName(f.profile.full_name ?? f.profile.username)}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {f.profile.full_name ?? f.profile.username ?? "Usuario"}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="size-3" />
                                  <span>Solicitud pendiente</span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelSent(f.id)}
                                className="text-xs shrink-0"
                              >
                                Cancelar
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === "buscar" && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o usuario…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>

                {searching && (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!searching && searchQuery && searchResults.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    Sin resultados para "{searchQuery}".
                  </p>
                )}

                {!searching && searchResults.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {searchResults.map((p) => {
                      const isFriend = friendIds.has(p.id);
                      const receivedF = pendingReceivedMap.get(p.id);
                      const isPendingReceived = !!receivedF;
                      const isPendingSent = pendingSentIds.has(p.id);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 rounded-xl border bg-white dark:bg-zinc-900 p-4"
                        >
                          <Link href={`/profile/${p.id}`}>
                            <Avatar className="size-10 cursor-pointer">
                              {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                              <AvatarFallback>
                                {initialsFromName(p.full_name ?? p.username)}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <Link href={`/profile/${p.id}`} className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {p.full_name ?? p.username ?? "Usuario"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[p.city, p.username ? `@${p.username}` : ""]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </Link>
                          {isFriend ? (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1 shrink-0">
                              <UserCheck className="size-3.5" /> Amigos
                            </span>
                          ) : isPendingReceived ? (
                            <Button
                              size="sm"
                              onClick={() => receivedF && handleAccept(receivedF.id)}
                            >
                              Aceptar
                            </Button>
                          ) : isPendingSent ? (
                            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                              <Clock className="size-3" /> Pendiente
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendRequest(p.id)}
                            >
                              <UserPlus className="size-3.5 mr-1" /> Agregar
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!searchQuery && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Search className="size-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">
                      Ingresá un nombre para buscar usuarios.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
