"use client";

import { useState, useTransition } from "react";
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
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant={isJoined ? "outline" : "default"}
        disabled={pending || disabled}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = isJoined
              ? await leaveMatch(matchId)
              : await joinMatch(matchId);
            if (!result.ok) setError(result.error);
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
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
