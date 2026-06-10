import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { Friendship, FriendshipStatus, MatchInvitation, Profile } from "@/lib/types/db";

type ApiResult<T> = { error: string | null; data: T | null };

export type FriendWithProfile = Friendship & { profile: Profile };

export async function searchUsers(
  supabase: SupabaseClient,
  query: string,
  currentUserId: string,
): Promise<ApiResult<Profile[]>> {
  if (!query.trim()) return { error: null, data: [] };
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", currentUserId)
    .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
    .limit(20);
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as Profile[] };
}

export async function getFriends(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<FriendWithProfile[]>> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) return { error: mapDbError(error), data: null };
  const friendships = (data ?? []) as Friendship[];
  const friendIds = friendships.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id,
  );
  if (friendIds.length === 0) return { error: null, data: [] };
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", friendIds);
  const profileMap = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));
  const result: FriendWithProfile[] = friendships.map((f) => {
    const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
    return { ...f, profile: profileMap.get(friendId)! };
  }).filter((f) => f.profile);
  return { error: null, data: result };
}

export async function getPendingReceived(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<FriendWithProfile[]>> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("addressee_id", userId)
    .eq("status", "pending");
  if (error) return { error: mapDbError(error), data: null };
  const friendships = (data ?? []) as Friendship[];
  if (friendships.length === 0) return { error: null, data: [] };
  const requesterIds = friendships.map((f) => f.requester_id);
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", requesterIds);
  const profileMap = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));
  return {
    error: null,
    data: friendships.map((f) => ({ ...f, profile: profileMap.get(f.requester_id)! })).filter((f) => f.profile),
  };
}

export async function getPendingSent(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<FriendWithProfile[]>> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("requester_id", userId)
    .eq("status", "pending");
  if (error) return { error: mapDbError(error), data: null };
  const friendships = (data ?? []) as Friendship[];
  if (friendships.length === 0) return { error: null, data: [] };
  const addresseeIds = friendships.map((f) => f.addressee_id);
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", addresseeIds);
  const profileMap = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));
  return {
    error: null,
    data: friendships.map((f) => ({ ...f, profile: profileMap.get(f.addressee_id)! })).filter((f) => f.profile),
  };
}

export async function getFriendshipBetween(
  supabase: SupabaseClient,
  userId: string,
  otherId: string,
): Promise<ApiResult<Friendship | null>> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`,
    )
    .maybeSingle();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as Friendship | null };
}

export async function sendFriendRequest(
  supabase: SupabaseClient,
  requesterId: string,
  addresseeId: string,
): Promise<ApiResult<Friendship>> {
  const { data, error } = await supabase
    .from("friendships")
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: "pending" })
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as Friendship };
}

export async function acceptFriendRequest(
  supabase: SupabaseClient,
  friendshipId: string,
): Promise<ApiResult<Friendship>> {
  const { data, error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId)
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as Friendship };
}

export async function rejectFriendRequest(
  supabase: SupabaseClient,
  friendshipId: string,
): Promise<ApiResult<Friendship>> {
  const { data, error } = await supabase
    .from("friendships")
    .update({ status: "rejected" })
    .eq("id", friendshipId)
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as Friendship };
}

export async function removeFriend(
  supabase: SupabaseClient,
  friendshipId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: null };
}

export async function sendMatchInvitations(
  supabase: SupabaseClient,
  matchId: string,
  inviterId: string,
  inviteeIds: string[],
): Promise<ApiResult<MatchInvitation[]>> {
  if (inviteeIds.length === 0) return { error: null, data: [] };
  const rows = inviteeIds.map((id) => ({
    match_id: matchId,
    inviter_id: inviterId,
    invitee_id: id,
    status: "pending",
  }));
  const { data, error } = await supabase
    .from("match_invitations")
    .insert(rows)
    .select();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as MatchInvitation[] };
}

export async function getMatchInvitations(
  supabase: SupabaseClient,
  matchId: string,
): Promise<ApiResult<MatchInvitation[]>> {
  const { data, error } = await supabase
    .from("match_invitations")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at");
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as MatchInvitation[] };
}

export async function getMyMatchInvitation(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
): Promise<ApiResult<MatchInvitation | null>> {
  const { data, error } = await supabase
    .from("match_invitations")
    .select("*")
    .eq("match_id", matchId)
    .eq("invitee_id", userId)
    .maybeSingle();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as MatchInvitation | null };
}

export async function respondToMatchInvitation(
  supabase: SupabaseClient,
  invitationId: string,
  status: "accepted" | "rejected",
): Promise<ApiResult<MatchInvitation>> {
  const { data, error } = await supabase
    .from("match_invitations")
    .update({ status })
    .eq("id", invitationId)
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as MatchInvitation };
}

export async function getPendingMatchInvitations(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<(MatchInvitation & { matches: { title: string; starts_at: string } | null })[]>> {
  const { data, error } = await supabase
    .from("match_invitations")
    .select("*, matches(title, starts_at)")
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return { error: mapDbError(error), data: null };
  type Row = MatchInvitation & { matches: { title: string; starts_at: string } | null };
  return { error: null, data: (data ?? []) as Row[] };
}
