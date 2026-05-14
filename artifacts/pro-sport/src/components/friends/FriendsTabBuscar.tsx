import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialsFromName } from "@/lib/format";
import { type FriendWithProfile } from "@/lib/friends/api";
import type { Profile } from "@/lib/types/db";
import { Search, UserCheck, UserPlus, Clock } from "lucide-react";

interface FriendsTabBuscarProps {
  searchQuery: string;
  searchResults: Profile[];
  searching: boolean;
  friendIds: Set<string>;
  pendingReceivedMap: Map<string, FriendWithProfile>;
  pendingSentIds: Set<string>;
  onSearchChange: (q: string) => void;
  onSendRequest: (addresseeId: string) => void;
  onAccept: (friendshipId: string) => void;
}

export function FriendsTabBuscar({
  searchQuery,
  searchResults,
  searching,
  friendIds,
  pendingReceivedMap,
  pendingSentIds,
  onSearchChange,
  onSendRequest,
  onAccept,
}: FriendsTabBuscarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o usuario…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
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
                    onClick={() => receivedF && onAccept(receivedF.id)}
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
                    onClick={() => onSendRequest(p.id)}
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
  );
}
