"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { inviteToMatch } from "@/lib/match/actions";
import { Input } from "@/components/ui/input";

export function InviteUser({ matchId }: { matchId: string }) {
    const [userId, setUserId] = useState("");
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState<string | null>(null);

    const handleInvite = () => {
        if (!userId) return;
        startTransition(async () => {
            const res = await inviteToMatch(matchId, userId);
            if (res.ok) {
                setMessage("Invitación enviada");
                setUserId("");
            } else {
                setMessage(res.error);
            }
        });
    };

    return (
        <div className="flex flex-col gap-2 mt-4">
            <h3 className="text-sm font-semibold">Invitar usuario (ID)</h3>
            <div className="flex gap-2">
                <Input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="UUID del usuario"
                    className="h-8 text-xs"
                />
                <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={pending}
                    onClick={handleInvite}
                >
                    Invitar
                </Button>
            </div>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
    );
}
