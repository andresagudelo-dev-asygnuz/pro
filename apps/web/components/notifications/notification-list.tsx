"use client";

import { useTransition } from "react";
import { markAsRead, markAllAsRead } from "@/lib/notifications/actions";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, MessageSquare, UserPlus } from "lucide-react";
import Link from "next/link";

type Notification = {
    id: string;
    type: string;
    data: Record<string, unknown>;
    created_at: string;
    read_at: string | null;
};

export function NotificationList({ notifications }: { notifications: Notification[] }) {
    const [isPending, startTransition] = useTransition();

    const getIcon = (type: string) => {
        switch (type) {
            case "match_request": return <UserPlus className="size-4 text-blue-500" />;
            case "match_accepted": return <CheckCircle2 className="size-4 text-green-500" />;
            case "match_invite": return <MessageSquare className="size-4 text-purple-500" />;
            default: return <Bell className="size-4 text-muted-foreground" />;
        }
    };

    const getMessage = (n: Notification) => {
        const { player_name } = n.data as { player_name?: string };
        switch (n.type) {
            case "match_request":
                return (
                    <span>
                        <strong>{player_name || "Un usuario"}</strong> solicitó unirse a tu partido.
                    </span>
                );
            case "match_accepted":
                return <span>Tu solicitud para unirte al partido fue <strong>aceptada</strong>.</span>;
            case "match_invite":
                return <span>Has sido <strong>invitado</strong> a un nuevo partido.</span>;
            default: return <span>Nueva notificación recibida.</span>;
        }
    };

    const getLink = (n: Notification) => {
        const { match_id } = n.data as { match_id?: string };
        if (match_id) return `/matches/${match_id}`;
        return "#";
    };

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="size-12 text-muted/30 mb-4" />
                <p className="text-muted-foreground">No tenés notificaciones nuevas.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startTransition(async () => { await markAllAsRead(); })}
                    disabled={isPending}
                >
                    Marcar todas como leídas
                </Button>
            </div>
            <div className="flex flex-col border rounded-xl divide-y overflow-hidden">
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className={`flex items-start gap-4 p-4 transition-colors ${!n.read_at ? 'bg-primary/5' : 'bg-background hover:bg-muted/30'}`}
                    >
                        <div className="mt-1">{getIcon(n.type)}</div>
                        <div className="flex-1 flex flex-col gap-1">
                            <Link
                                href={getLink(n)}
                                className="text-sm hover:underline"
                                onClick={() => !n.read_at && startTransition(async () => { await markAsRead(n.id); })}
                            >
                                {getMessage(n)}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                                {new Date(n.created_at).toLocaleString('es-CO')}
                            </span>
                        </div>
                        {!n.read_at && (
                            <div className="size-2 rounded-full bg-primary mt-2" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
