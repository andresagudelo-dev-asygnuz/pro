"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondToJoinRequest } from "@/lib/match/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";

type Request = {
    user_id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
};

export function RequestManagement({
    matchId,
    requests,
}: {
    matchId: string;
    requests: Request[];
}) {
    const [pending, startTransition] = useTransition();

    if (requests.length === 0) return null;

    return (
        <section className="rounded-xl border border-warning/50 bg-warning/5 p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-warning-foreground">
                Solicitudes pendientes ({requests.length})
            </h2>
            <ul className="flex flex-col gap-4">
                {requests.map((r) => (
                    <li key={r.user_id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                                {r.avatar_url && <AvatarImage src={r.avatar_url} alt="" />}
                                <AvatarFallback>
                                    {initialsFromName(r.full_name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                                {r.full_name ?? r.username ?? "—"}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                disabled={pending}
                                onClick={() =>
                                    startTransition(async () => {
                                        await respondToJoinRequest(matchId, r.user_id, "left");
                                    })
                                }
                            >
                                Rechazar
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 text-xs"
                                disabled={pending}
                                onClick={() =>
                                    startTransition(async () => {
                                        await respondToJoinRequest(matchId, r.user_id, "joined");
                                    })
                                }
                            >
                                Aceptar
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
