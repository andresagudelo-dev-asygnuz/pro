import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { Users } from "lucide-react";
import type { FriendWithProfile } from "@/lib/friends/api";

export interface StepFriendsInviteProps {
  friends: FriendWithProfile[];
  loadingFriends: boolean;
  selectedFriendIds: Set<string>;
  currentUserId: string;
  error: string | null;
  pending: boolean;
  onToggleFriend: (id: string) => void;
  onSubmit: () => void;
}

export function StepFriendsInvite({
  friends, loadingFriends, selectedFriendIds, currentUserId, error, pending,
  onToggleFriend, onSubmit,
}: StepFriendsInviteProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2"><Users className="size-4" /> Invitar amigos</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Seleccioná los amigos que querés invitar. Este paso es opcional.</p>
      </div>
      {loadingFriends ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : friends.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center rounded-xl bg-muted/40 border border-dashed">
          <Users className="size-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-sm">No tenés amigos todavía</p>
            <p className="text-xs text-muted-foreground mt-0.5">Agregá amigos desde la sección Amigos para poder invitarlos.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {selectedFriendIds.size > 0 && (
            <p className="text-xs font-medium text-brand-primary">{selectedFriendIds.size} amigo(s) seleccionado(s)</p>
          )}
          {friends.map((f) => {
            const friendId = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
            const isSelected = selectedFriendIds.has(friendId);
            return (
              <button
                key={f.id} type="button" onClick={() => onToggleFriend(friendId)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all w-full ${isSelected ? "border-brand-primary bg-brand-primary/5 shadow-sm" : "border-border bg-white dark:bg-zinc-900 hover:border-foreground/30"}`}
              >
                <div className="relative">
                  <Avatar className="size-10">
                    {f.profile.avatar_url && <AvatarImage src={f.profile.avatar_url} />}
                    <AvatarFallback>{initialsFromName(f.profile.full_name ?? f.profile.username)}</AvatarFallback>
                  </Avatar>
                  {isSelected && (
                    <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-brand-primary flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{f.profile.full_name ?? f.profile.username ?? "Usuario"}</p>
                  <p className="text-xs text-muted-foreground truncate">{[f.profile.city, f.profile.username ? `@${f.profile.username}` : ""].filter(Boolean).join(" · ")}</p>
                </div>
                <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-brand-primary bg-brand-primary" : "border-muted-foreground/30"}`}>
                  {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
      <Button onClick={onSubmit} disabled={pending} className="w-full" size="lg">
        {pending ? "Creando partido…" : selectedFriendIds.size > 0 ? `Crear partido e invitar ${selectedFriendIds.size} amigo(s)` : "Crear partido sin invitar"}
      </Button>
      {selectedFriendIds.size === 0 && friends.length > 0 && (
        <p className="text-xs text-center text-muted-foreground -mt-2">
          No seleccionaste ningún amigo — el partido se creará sin invitaciones privadas.
        </p>
      )}
    </div>
  );
}
