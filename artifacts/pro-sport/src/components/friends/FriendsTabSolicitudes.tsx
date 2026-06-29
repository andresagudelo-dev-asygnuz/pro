import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialsFromName } from "@/lib/format";
import { type FriendWithProfile } from "@/lib/friends/api";
import { UserCheck, Check, X, Clock } from "lucide-react";

interface FriendsTabSolicitudesProps {
  received: FriendWithProfile[];
  sent: FriendWithProfile[];
  onAccept: (friendshipId: string) => void;
  onReject: (friendshipId: string) => void;
  onCancelSent: (friendshipId: string) => void;
}

export function FriendsTabSolicitudes({
  received,
  sent,
  onAccept,
  onReject,
  onCancelSent,
}: FriendsTabSolicitudesProps) {
  if (received.length === 0 && sent.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <UserCheck className="size-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">No tenés solicitudes pendientes.</p>
      </div>
    );
  }

  return (
    <>
      {received.length > 0 && (
        <div className="border border-border/60 rounded-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-4 pt-4">
            Recibidas
          </p>
          <div className="flex flex-col divide-y divide-border/50 bg-white dark:bg-zinc-900 border-t border-border/60 overflow-hidden shadow-sm">
            {received.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
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
                  <Button size="sm" onClick={() => onAccept(f.id)}>
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReject(f.id)}
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
        <div className="border border-border/60 rounded-2xl mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-4 pt-4">
            Enviadas
          </p>
          <div className="flex flex-col divide-y divide-border/50 bg-white dark:bg-zinc-900 border-t border-border/60 overflow-hidden shadow-sm">
            {sent.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
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
                  onClick={() => onCancelSent(f.id)}
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
  );
}
