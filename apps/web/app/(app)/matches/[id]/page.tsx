import Link from "next/link";
import { notFound } from "next/navigation";
import { JoinForm } from "@/components/match/join-form";
import { MatchChat } from "@/components/match/match-chat";
import { RequestManagement } from "@/components/match/request-management";
import { InviteUser } from "@/components/match/invite-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { requireCompleteProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import type {
  Match,
  MatchParticipant,
  Message,
  Profile,
  Sport,
} from "@/lib/types/db";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function MatchPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const profile = await requireCompleteProfile();
  const supabase = await createClient();

  const { data: matchRaw } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const match = matchRaw as Match | null;
  if (!match) notFound();

  const [{ data: sport }, { data: organizer }, { data: participants }] =
    await Promise.all([
      supabase
        .from("sports")
        .select("*")
        .eq("id", match.sport_id)
        .maybeSingle<Sport>(),
      supabase
        .from("profiles")
        .select("*")
        .eq("id", match.organizer_id)
        .maybeSingle<Profile>(),
      supabase
        .from("match_participants")
        .select("*")
        .eq("match_id", match.id)
        .order("joined_at"),
    ]);

  const participantRows = (participants ?? []) as MatchParticipant[];
  const participantIds = Array.from(
    new Set(participantRows.map((p) => p.user_id).concat(match.organizer_id)),
  );

  const { data: participantProfilesRaw } = await supabase
    .from("profiles")
    .select("*")
    .in("id", participantIds);
  const participantProfiles = (participantProfilesRaw ?? []) as Profile[];
  const profilesById = new Map(participantProfiles.map((p) => [p.id, p]));

  const joinedCount = participantRows.filter((p) => p.status === "joined").length;
  const isJoined = participantRows.some(
    (p) => p.user_id === profile.id && p.status === "joined",
  );
  const isRequested = participantRows.some(
    (p) => p.user_id === profile.id && p.status === "requested",
  );
  const isOrganizer = match.organizer_id === profile.id;
  const isFull = joinedCount >= match.max_players && !isJoined;

  const { data: messagesRaw } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", match.id)
    .order("created_at", { ascending: true })
    .limit(200);
  const messages = (messagesRaw ?? []) as Message[];

  const authorsById: Record<string, string | null> = {};
  for (const p of participantProfiles) {
    authorsById[p.id] = p.full_name ?? p.username ?? null;
  }

  const pendingRequests = participantRows
    .filter((p) => p.status === "requested")
    .map((p) => {
      const pp = profilesById.get(p.user_id);
      return {
        user_id: p.user_id,
        full_name: pp?.full_name ?? null,
        username: pp?.username ?? null,
        avatar_url: pp?.avatar_url ?? null,
      };
    });

  const canChat = isJoined || isOrganizer;

  return (
    <div className="flex flex-col gap-6">
      {isOrganizer && pendingRequests.length > 0 && (
        <RequestManagement matchId={match.id} requests={pendingRequests} />
      )}
      <header className="flex flex-col gap-3 rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{sport?.icon}</span>
          <span>{sport?.name ?? match.sport_id}</span>
          <span>·</span>
          <span>{match.city}</span>
          {match.skill_level && (
            <>
              <span>·</span>
              <span className="capitalize">{match.skill_level}</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {match.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMatchDate(match.starts_at)} · {match.duration_minutes} min
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOrganizer && <Badge variant="secondary">Organizás</Badge>}
            <JoinForm
              matchId={match.id}
              isJoined={isJoined}
              isRequested={isRequested}
              disabled={isFull || isOrganizer}
            />
          </div>
        </div>

        {match.description && (
          <p className="text-sm text-foreground/90">{match.description}</p>
        )}

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Dónde
            </p>
            <p className="text-sm">{match.location}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Organizador
            </p>
            {organizer ? (
              <Link
                href={`/profile/${organizer.id}`}
                className="inline-flex items-center gap-2 text-sm hover:underline"
              >
                <Avatar className="size-6">
                  {organizer.avatar_url && (
                    <AvatarImage src={organizer.avatar_url} alt="" />
                  )}
                  <AvatarFallback>
                    {initialsFromName(organizer.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span>{organizer.full_name ?? organizer.username ?? "—"}</span>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </header>

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Jugadores ({joinedCount}/{match.max_players})
          </h2>
        </div>

        {isOrganizer && joinedCount < match.max_players && (
          <InviteUser matchId={match.id} />
        )}

        <div className="mt-4 flex flex-col gap-2">
        <ul className="flex flex-col gap-2">
          {participantRows.filter(p => p.status === 'joined').length === 0 && (
            <li className="text-sm text-muted-foreground">
              Nadie se unió todavía.
            </li>
          )}
          {participantRows
            .filter(p => p.status === 'joined')
            .map((p) => {
              const pp = profilesById.get(p.user_id);
              if (!pp) return null;
              return (
                <li key={p.user_id}>
                  <Link
                    href={`/profile/${pp.id}`}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                  >
                    <Avatar className="size-8">
                      {pp.avatar_url && (
                        <AvatarImage src={pp.avatar_url} alt="" />
                      )}
                      <AvatarFallback>
                        {initialsFromName(pp.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {pp.full_name ?? pp.username ?? "—"}
                      </span>
                      {pp.rating_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ★ {pp.rating_avg} ({pp.rating_count})
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
          })}
        </ul>
        </div>
      </section>

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Chat del partido</h2>
        {canChat ? (
          <MatchChat
            matchId={match.id}
            currentUserId={profile.id}
            initialMessages={messages}
            authorsById={authorsById}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Unite al partido para participar del chat.
          </p>
        )}
      </section>
    </div>
  );
}
