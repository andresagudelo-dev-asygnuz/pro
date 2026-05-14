import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialsFromName } from "@/lib/format";
import { type FriendWithProfile } from "@/lib/friends/api";
import type { Profile } from "@/lib/types/db";
import { Users, UserPlus, MessageSquare } from "lucide-react";

interface FriendsTabAmigosProps {
  friends: FriendWithProfile[];
  currentUserId: string | undefined;
  onStartChat: (friend: Profile) => void;
  onRemoveFriend: (friendshipId: string) => void;
  onGoSearch: () => void;
}

export function FriendsTabAmigos({
  friends,
  currentUserId,
  onStartChat,
  onRemoveFriend,
  onGoSearch,
}: FriendsTabAmigosProps) {
  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Users className="size-12 text-muted-foreground/30" />
        <div>
          <p className="font-medium">Todavía no tenés amigos</p>
          <p className="text-sm text-muted-foreground mt-1">
            Buscá usuarios y agregálos como amigos.
          </p>
        </div>
        <Button size="sm" onClick={onGoSearch}>
          <UserPlus className="size-4 mr-2" />
          Buscar usuarios
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {friends.map((f) => {
        const friendId = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
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
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStartChat(f.profile)}
                className="size-9 p-0 border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5"
              >
                <MessageSquare className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRemoveFriend(f.id)}
                className="text-[10px] uppercase font-black tracking-widest h-9 px-3 text-destructive border-destructive/20 hover:bg-destructive/5"
              >
                Eliminar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
