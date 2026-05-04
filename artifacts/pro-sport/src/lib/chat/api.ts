import type { SupabaseClient } from "@supabase/supabase-js";

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
export async function getOrCreateConversation(
  supabase: SupabaseClient,
  type: ConversationType,
  referenceId: string,
  participantIds: string[],
  title: string,
  subtitle?: string,
  metadata?: Record<string, unknown>
): Promise<{ data: { id: string } | null; error: string | null }> {
  // Look for existing conversation with this reference_id
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("type", type)
    .eq("reference_id", referenceId)
    .maybeSingle();

  if (existing) return { data: existing, error: null };

  // Create new conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({ type, reference_id: referenceId, title, subtitle: subtitle ?? null, metadata: metadata ?? {} })
    .select("id")
    .single();

  if (convErr || !conv) return { data: null, error: convErr?.message ?? "Error creando conversación" };

  // Add participants (deduplicated)
  const unique = [...new Set(participantIds)];
  const { error: partErr } = await supabase
    .from("conversation_participants")
    .insert(unique.map((uid) => ({ conversation_id: conv.id, user_id: uid })));

  if (partErr) return { data: null, error: partErr.message };

  return { data: conv, error: null };
}

// ── Get all conversations for a user ─────────────────────────────────────────
export async function getMyConversations(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: Conversation[]; error: string | null }> {
  // Get conversation_ids for this user
  const { data: myParts, error: e1 } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (e1) return { data: [], error: e1.message };
  if (!myParts || myParts.length === 0) return { data: [], error: null };

  const convIds = myParts.map((p) => p.conversation_id as string);
  const lastReadMap = new Map(myParts.map((p) => [p.conversation_id as string, p.last_read_at as string]));

  // Get conversations
  const { data: convs, error: e2 } = await supabase
    .from("conversations")
    .select("*")
    .in("id", convIds)
    .order("updated_at", { ascending: false });

  if (e2) return { data: [], error: e2.message };
  const conversations = (convs ?? []) as Conversation[];

  // Get all other participants to resolve names/avatars
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

  // Compute unread count per conversation (messages after last_read_at)
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
  limit = 50
): Promise<{ data: ChatMessage[]; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: ((data ?? []) as ChatMessage[]).reverse(), error: null };
}

// ── Send a message ────────────────────────────────────────────────────────────
export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  content: string
): Promise<{ data: ChatMessage | null; error: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content: content.trim() })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as ChatMessage, error: null };
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
