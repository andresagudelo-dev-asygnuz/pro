import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";

export type ConversationType = "booking" | "match" | "tournament" | "friend" | "direct";

export interface Conversation {
  id: string;
  type: ConversationType;
  reference_id: string | null;
  title: string;
  subtitle: string | null;
  metadata: Record<string, unknown>;
  last_message_text: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  created_at: string;
  updated_at: string;
  // joined:
  unread_count?: number;
  other_participant?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// ── Get or create a conversation ─────────────────────────────────────────────
// For peer chats (friend/direct): referenceId is ignored — we look up by participant
// intersection to avoid inserting non-UUID strings into a UUID column.
// For reference-based chats (booking/match/tournament): referenceId must be a UUID.
// INSERT never chains .select() — RLS SELECT requires being a participant, which is
// set up only after the insert, so we generate the ID client-side instead.
export async function getOrCreateConversation(
  supabase: SupabaseClient,
  type: ConversationType,
  referenceId: string,
  participantIds: string[],
  title: string,
  subtitle?: string,
  metadata?: Record<string, unknown>
): Promise<{ data: { id: string } | null; error: string | null }> {
  const isPeer = type === "friend" || type === "direct";

  if (isPeer) {
    // Find existing conversation between these exact two participants of this type
    const sorted = [...new Set(participantIds)].sort();
    const { data: parts1 } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", sorted[0]);

    if (parts1 && parts1.length > 0) {
      const ids1 = (parts1 as Array<{ conversation_id: string }>).map((p) => p.conversation_id);
      const { data: shared } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", sorted[1])
        .in("conversation_id", ids1);

      if (shared && shared.length > 0) {
        const sharedIds = (shared as Array<{ conversation_id: string }>).map((p) => p.conversation_id);
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("type", type)
          .in("id", sharedIds)
          .limit(1)
          .maybeSingle();
        if (existing) return { data: existing as { id: string }, error: null };
      }
    }
  } else {
    // Reference-based conversation: look up by reference_id (must be a valid UUID)
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("type", type)
      .eq("reference_id", referenceId)
      .maybeSingle();
    if (existing) return { data: existing as { id: string }, error: null };
  }

  // Generate ID client-side to avoid .select() after insert (RLS blocks reading
  // the row before participants are added)
  const newId = crypto.randomUUID();
  const { error: convErr } = await supabase
    .from("conversations")
    .insert({
      id: newId,
      type,
      reference_id: isPeer ? null : referenceId,
      title,
      subtitle: subtitle ?? null,
      metadata: metadata ?? {},
    });

  if (convErr) return { data: null, error: mapDbError(convErr, "conversation_create") };

  const unique = [...new Set(participantIds)];
  const { error: partErr } = await supabase
    .from("conversation_participants")
    .insert(unique.map((uid) => ({ conversation_id: newId, user_id: uid })));

  if (partErr) return { data: null, error: mapDbError(partErr, "conversation_participants_insert") };
  return { data: { id: newId }, error: null };
}

// ── Get all conversations for a user ─────────────────────────────────────────
export async function getMyConversations(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: Conversation[]; error: string | null }> {
  const { data: myParts, error: e1 } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (e1) return { data: [], error: mapDbError(e1, "conversations_participants") };
  if (!myParts || myParts.length === 0) return { data: [], error: null };

  const convIds = myParts.map((p) => p.conversation_id as string);
  const lastReadMap = new Map(myParts.map((p) => [p.conversation_id as string, p.last_read_at as string]));

  const { data: convs, error: e2 } = await supabase
    .from("conversations")
    .select("*")
    .in("id", convIds)
    .order("updated_at", { ascending: false });

  if (e2) return { data: [], error: mapDbError(e2, "conversations_list") };
  const conversations = (convs ?? []) as Conversation[];

  const { data: allParts } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds)
    .neq("user_id", userId);

  const otherUserIds = [...new Set((allParts ?? []).map((p) => p.user_id as string))];

  let profileMap: Map<string, { id: string; full_name: string | null; username: string | null; avatar_url: string | null }> = new Map();
  if (otherUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", otherUserIds);
    profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null; username: string | null; avatar_url: string | null }) => [p.id, p]));
  }

  const otherPartMap = new Map<string, string>();
  (allParts ?? []).forEach((p) => {
    if (!otherPartMap.has(p.conversation_id as string)) otherPartMap.set(p.conversation_id as string, p.user_id as string);
  });

  const enriched = await Promise.all(
    conversations.map(async (c) => {
      const lastRead = lastReadMap.get(c.id);
      let unread = 0;
      if (c.last_message_at && lastRead && c.last_message_at > lastRead) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .gt("created_at", lastRead)
          .neq("sender_id", userId);
        unread = count ?? 0;
      }
      const otherUserId = otherPartMap.get(c.id);
      const other = otherUserId ? profileMap.get(otherUserId) : undefined;
      return { ...c, unread_count: unread, other_participant: other };
    })
  );

  return { data: enriched, error: null };
}

// ── Get messages for a conversation ──────────────────────────────────────────
export async function getConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit = 80
): Promise<{ data: ChatMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: mapDbError(error, "messages_list") };
  return { data: ((data ?? []) as ChatMessage[]).reverse(), error: null };
}

// ── Send a message ────────────────────────────────────────────────────────────
// Only INSERT — do NOT .select() after insert, since RLS SELECT policies may
// block reading the row back immediately (causing a false error). The realtime
// channel delivers the message to the sender reliably.
export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  content: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content: content.trim() });

  if (error) return { error: mapDbError(error, "message_send") };
  return { error: null };
}

// ── Mark conversation as read ─────────────────────────────────────────────────
export async function markConversationRead(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<void> {
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

// ── Get total unread count across all conversations ───────────────────────────
export async function getTotalUnreadMessages(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: myParts } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (!myParts || myParts.length === 0) return 0;

  let total = 0;
  for (const p of myParts) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", p.conversation_id)
      .gt("created_at", p.last_read_at ?? new Date(0).toISOString())
      .neq("sender_id", userId);
    total += count ?? 0;
  }
  return total;
}

// ── Paginated conversation list ───────────────────────────────────────────────

export interface ConversationWithLastMessage {
  id: string;
  type: string;
  title: string | null;
  last_message_at: string | null;
  unread_count: number;
  last_message_content: string | null;
  other_participant?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export async function listConversations(
  supabase: SupabaseClient,
  userId: string,
  options: { cursor?: string; limit?: number }
): Promise<{ data: ConversationWithLastMessage[] | null; error: string | null; nextCursor: string | null }> {
  const limit = options.limit ?? 20;

  // Get all conversation IDs for this user, along with last_read_at
  const { data: parts, error: partsErr } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (partsErr) return { data: null, error: mapDbError(partsErr, "list_conversations_parts"), nextCursor: null };
  if (!parts || parts.length === 0) return { data: [], error: null, nextCursor: null };

  const convIds = (parts as Array<{ conversation_id: string; last_read_at: string | null }>).map(
    (p) => p.conversation_id
  );
  const lastReadMap = new Map(
    (parts as Array<{ conversation_id: string; last_read_at: string | null }>).map((p) => [
      p.conversation_id,
      p.last_read_at,
    ])
  );

  let query = supabase
    .from("conversations")
    .select("id, type, title, last_message_at, last_message_text")
    .in("id", convIds)
    .order("last_message_at", { ascending: false })
    .limit(limit);

  if (options.cursor) {
    query = query.lt("last_message_at", options.cursor);
  }

  const { data: convs, error: convsErr } = await query;
  if (convsErr) return { data: null, error: mapDbError(convsErr, "list_conversations"), nextCursor: null };

  const rows = (convs ?? []) as Array<{
    id: string;
    type: string;
    title: string | null;
    last_message_at: string | null;
    last_message_text: string | null;
  }>;

  // Enrich peer (friend/direct) conversations with the other participant's profile
  // so the chat list can display the person's name instead of the generic "Chat" title.
  const peerConvIds = rows
    .filter((r) => r.type === "friend" || r.type === "direct")
    .map((r) => r.id);
  const otherPartMap = new Map<
    string,
    { id: string; full_name: string | null; username: string | null; avatar_url: string | null }
  >();

  if (peerConvIds.length > 0) {
    const { data: peerParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", peerConvIds)
      .neq("user_id", userId);

    if (peerParts && peerParts.length > 0) {
      const otherIds = [
        ...new Set(
          (peerParts as Array<{ conversation_id: string; user_id: string }>).map((p) => p.user_id)
        ),
      ];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", otherIds);

      const profileMap = new Map(
        ((profiles ?? []) as Array<{
          id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
        }>).map((p) => [p.id, p])
      );
      (peerParts as Array<{ conversation_id: string; user_id: string }>).forEach((p) => {
        if (!otherPartMap.has(p.conversation_id)) {
          const profile = profileMap.get(p.user_id);
          if (profile) otherPartMap.set(p.conversation_id, profile);
        }
      });
    }
  }

  // Compute unread count per conversation
  const result: ConversationWithLastMessage[] = await Promise.all(
    rows.map(async (conv) => {
      const lastRead = lastReadMap.get(conv.id) ?? null;
      let unread = 0;
      if (conv.last_message_at && (!lastRead || conv.last_message_at > lastRead)) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .gt("created_at", lastRead ?? new Date(0).toISOString())
          .neq("sender_id", userId);
        unread = count ?? 0;
      }
      return {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        last_message_at: conv.last_message_at,
        unread_count: unread,
        last_message_content: conv.last_message_text,
        other_participant: otherPartMap.get(conv.id),
      };
    })
  );

  const nextCursor =
    result.length === limit ? result[result.length - 1].last_message_at : null;

  return { data: result, error: null, nextCursor };
}

// ── Paginated message list (cursor-based, oldest-first output) ────────────────

export interface MessageWithSender {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender: { full_name: string | null; avatar_url: string | null } | null;
}

export async function listMessages(
  supabase: SupabaseClient,
  conversationId: string,
  options: { cursor?: string; limit?: number }
): Promise<{ data: MessageWithSender[] | null; error: string | null; nextCursor: string | null }> {
  const limit = options.limit ?? 40;

  let query = supabase
    .from("messages")
    .select("id, content, created_at, sender_id, profiles(full_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: mapDbError(error, "list_messages"), nextCursor: null };

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  }>;

  // Reverse to return chronological order (oldest first)
  const messages: MessageWithSender[] = rows.reverse().map((r) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    sender_id: r.sender_id,
    sender: r.profiles ?? null,
  }));

  // nextCursor points to the oldest message's created_at for loading more history
  const nextCursor =
    messages.length === limit ? messages[0].created_at : null;

  return { data: messages, error: null, nextCursor };
}

// ── Get or create a direct conversation with a friend ────────────────────────
export async function getOrCreateFriendConversation(
  supabase: SupabaseClient,
  otherUserId: string,
): Promise<{ data: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("get_or_create_friend_conversation", {
    other_user_id: otherUserId,
  });
  if (error) return { data: null, error: mapDbError(error, "getOrCreateFriendConversation") };
  return { data: data as string | null, error: null };
}

// ── getConversationMeta — fetch conversation + both participant profiles ───────
type ProfileMini = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };

export interface ConversationMetaResult {
  conversation: Conversation | null;
  myProfile: ProfileMini | null;
  otherProfile: ProfileMini | null;
  matchStatus: string | null;
}

export async function getConversationMeta(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<{ data: ConversationMetaResult | null; error: string | null }> {
  const [convRes, myProfRes] = await Promise.all([
    supabase.from("conversations").select("*").eq("id", conversationId).single(),
    supabase.from("profiles").select("id, full_name, username, avatar_url").eq("id", userId).single(),
  ]);

  const conv = convRes.data as Conversation | null;
  if (!conv) return { data: null, error: mapDbError(convRes.error, "getConversationMeta_conv") };

  const myProfile = myProfRes.data as ProfileMini | null;

  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", userId);

  const otherId = (parts as Array<{ user_id: string }> | null)?.[0]?.user_id;
  let otherProfile: ProfileMini | null = null;
  if (otherId) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .eq("id", otherId)
      .single();
    otherProfile = data as ProfileMini | null;
  }

  let matchStatus: string | null = null;
  if (conv.type === "match" && conv.reference_id) {
    const { data: matchRow } = await supabase
      .from("matches")
      .select("status")
      .eq("id", conv.reference_id)
      .single();
    if (matchRow) matchStatus = (matchRow as { status: string }).status;
  }

  await markConversationRead(supabase, conversationId, userId);

  return { data: { conversation: conv, myProfile, otherProfile, matchStatus }, error: null };
}

// ── Leave / delete a conversation (removes current user from participants) ────
// Uses a SECURITY DEFINER RPC to bypass RLS restrictions on conversation_participants.
export async function leaveConversation(
  supabase: SupabaseClient,
  conversationId: string,
  _userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("leave_conversation", { conv_id: conversationId });
  if (error) return { error: mapDbError(error, "leave_conversation") };
  return { error: null };
}

// ── Real-time subscription to new messages in a conversation ──────────────────
export function subscribeToConversation(
  supabase: SupabaseClient,
  conversationId: string,
  onMessage: (message: MessageWithSender) => void
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as {
          id: string;
          content: string;
          created_at: string;
          sender_id: string;
        };
        // Deliver message without sender profile (caller can enrich if needed)
        onMessage({
          id: row.id,
          content: row.content,
          created_at: row.created_at,
          sender_id: row.sender_id,
          sender: null,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
