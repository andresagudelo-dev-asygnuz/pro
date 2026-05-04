import type { SupabaseClient } from "@supabase/supabase-js";
import type { Match } from "@/lib/types/db";

const TRAVEL_BUFFER_MINUTES = 60;

type MatchSlot = Pick<Match, "id" | "title" | "starts_at" | "duration_minutes" | "city" | "location">;

export type ConflictResult =
  | { conflict: false }
  | { conflict: true; reason: string; conflictingMatch: MatchSlot };

function sameVenue(a: MatchSlot, b: MatchSlot): boolean {
  if (!a.location || !b.location) return false;
  return (
    a.city === b.city &&
    a.location.trim().toLowerCase() === b.location.trim().toLowerCase()
  );
}

export async function checkMatchConflict(
  supabase: SupabaseClient,
  userId: string,
  newMatch: MatchSlot,
): Promise<ConflictResult> {
  const newStart = new Date(newMatch.starts_at).getTime();
  const newDuration = (newMatch.duration_minutes ?? 60) * 60 * 1000;
  const newEnd = newStart + newDuration;

  // All joined matches for this user
  const { data: parts } = await supabase
    .from("match_participants")
    .select("match_id")
    .eq("user_id", userId)
    .eq("status", "joined");

  if (!parts || parts.length === 0) return { conflict: false };

  const matchIds = (parts as { match_id: string }[])
    .map((p) => p.match_id)
    .filter((id) => id !== newMatch.id);

  if (matchIds.length === 0) return { conflict: false };

  // Only fetch matches on the same calendar day (with ±1 day margin for timezone safety)
  const day = new Date(newMatch.starts_at);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: sameDay } = await supabase
    .from("matches")
    .select("id, title, starts_at, duration_minutes, city, location")
    .in("id", matchIds)
    .gte("starts_at", dayStart.toISOString())
    .lte("starts_at", dayEnd.toISOString());

  if (!sameDay || sameDay.length === 0) return { conflict: false };

  const bufferMs = TRAVEL_BUFFER_MINUTES * 60 * 1000;

  for (const m of sameDay as MatchSlot[]) {
    const existingStart = new Date(m.starts_at).getTime();
    const existingDuration = (m.duration_minutes ?? 60) * 60 * 1000;
    const existingEnd = existingStart + existingDuration;

    const formatTime = (iso: string) =>
      new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    // Hard overlap: the two matches run at the same time
    if (newStart < existingEnd && newEnd > existingStart) {
      return {
        conflict: true,
        reason: `Ya tenés "${m.title}" de ${formatTime(m.starts_at)} a ${formatTime(new Date(existingEnd).toISOString())}. Los horarios se superponen.`,
        conflictingMatch: m,
      };
    }

    // Travel-time conflict: different venue, not enough gap
    if (!sameVenue(newMatch, m)) {
      const gapAfter  = newStart - existingEnd;   // new starts after existing ends
      const gapBefore = existingStart - newEnd;   // new ends before existing starts

      const tooCloseAfter  = gapAfter  >= 0 && gapAfter  < bufferMs;
      const tooCloseBefore = gapBefore >= 0 && gapBefore < bufferMs;

      if (tooCloseAfter) {
        const gapMin = Math.round(gapAfter / 60000);
        return {
          conflict: true,
          reason: `Solo hay ${gapMin} min entre el fin de "${m.title}" (${formatTime(new Date(existingEnd).toISOString())}) y este partido. Necesitás al menos 1 hora de margen para desplazarte a otra cancha.`,
          conflictingMatch: m,
        };
      }

      if (tooCloseBefore) {
        const gapMin = Math.round(gapBefore / 60000);
        return {
          conflict: true,
          reason: `Solo hay ${gapMin} min entre este partido y el inicio de "${m.title}" (${formatTime(m.starts_at)}). Necesitás al menos 1 hora de margen para desplazarte.`,
          conflictingMatch: m,
        };
      }
    }
  }

  return { conflict: false };
}
