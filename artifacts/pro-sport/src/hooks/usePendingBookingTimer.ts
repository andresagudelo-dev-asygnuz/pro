import { useState, useEffect } from "react";

export function usePendingBookingTimer(expiresAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const expired = secondsLeft <= 0;
  const urgent = secondsLeft <= 180; // last 3 minutes

  return { secondsLeft, minutes, seconds, expired, urgent };
}
