import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
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
import { FriendsTabAmigos } from "@/components/friends/FriendsTabAmigos";
import { FriendsTabSolicitudes } from "@/components/friends/FriendsTabSolicitudes";
import { FriendsTabBuscar } from "@/components/friends/FriendsTabBuscar";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { getOrCreateConversation } from "@/lib/chat/api";


type Tab = "amigos" | "solicitudes" | "buscar";

export default function FriendsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("amigos");
  const [, setLocation] = useLocation();

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

  async function handleStartChat(friend: Profile) {
    if (!user) return;
    const { data, error } = await getOrCreateConversation(
      supabase,
      "friend",
      [user.id, friend.id].sort().join(":"), // reference_id for friend chats
      [user.id, friend.id],
      friend.full_name ?? friend.username ?? "Chat",
      undefined,
      { friend_id: friend.id }
    );

    if (error) {
      toast.error("No se pudo iniciar el chat.");
    } else if (data) {
      setLocation(`/chat/${data.id}`);
    }
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

      <div className="sticky top-14 z-40 bg-white dark:bg-zinc-900 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex">
            {(
              [
                { key: "amigos" as Tab, label: "Amigos", count: friends.length },
                { key: "solicitudes" as Tab, label: "Solicitudes", count: pendingCount },
                { key: "buscar" as Tab, label: "Buscar" },
              ] satisfies readonly { key: Tab; label: string; count?: number }[]
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
              <FriendsTabAmigos
                friends={friends}
                currentUserId={user?.id}
                onStartChat={handleStartChat}
                onRemoveFriend={handleRemoveFriend}
                onGoSearch={() => setTab("buscar")}
              />
            )}

            {tab === "solicitudes" && (
              <FriendsTabSolicitudes
                received={received}
                sent={sent}
                onAccept={handleAccept}
                onReject={handleReject}
                onCancelSent={handleCancelSent}
              />
            )}

            {tab === "buscar" && (
              <FriendsTabBuscar
                searchQuery={searchQuery}
                searchResults={searchResults}
                searching={searching}
                friendIds={friendIds}
                pendingReceivedMap={pendingReceivedMap}
                pendingSentIds={pendingSentIds}
                onSearchChange={setSearchQuery}
                onSendRequest={handleSendRequest}
                onAccept={handleAccept}
              />
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
