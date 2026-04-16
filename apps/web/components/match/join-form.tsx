"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { joinMatch, leaveMatch } from "@/lib/match/actions";

export function JoinForm({
  matchId,
  isJoined,
  disabled,
}: {
  matchId: string;
  isJoined: boolean;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={isJoined ? "outline" : "default"}
      disabled={pending || disabled}
      onClick={() =>
        startTransition(async () => {
          if (isJoined) await leaveMatch(matchId);
          else await joinMatch(matchId);
        })
      }
    >
      {pending
        ? "…"
        : isJoined
          ? "Salir del partido"
          : disabled
            ? "Completo"
            : "Unirme al partido"}
    </Button>
  );
}
