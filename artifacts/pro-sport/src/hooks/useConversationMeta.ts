import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { markConversationRead, type Conversation } from "@/lib/chat/api";

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface ConversationMeta {
  conversation: Conversation | null;
  myProfile: UserProfile | null;
  otherProfile: UserProfile | null;
  chatClosed: string | null;
  isLoading: boolean;
}

export function useConversationMeta(
  conversationId: string | undefined,
  userId: string | undefined
): ConversationMeta {
  const supabase = createClient();
  const [chatClosed, setChatClosed] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["conversation-meta", conversationId, userId],
    queryFn: async () => {
      if (!conversationId || !userId) return null;

      const [convRes, myProfRes] = await Promise.all([
        supabase.from("conversations").select("*").eq("id", conversationId).single(),
        supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", userId)
          .single(),
      ]);

      const conv = convRes.data as Conversation | null;
      const myProfile = myProfRes.data as UserProfile | null;

      if (!conv) return null;

      // Other participant
      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", userId);

      const otherId = parts?.[0]?.user_id as string | undefined;
      let otherProfile: UserProfile | null = null;
      if (otherId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", otherId)
          .single();
        if (profile) otherProfile = profile as UserProfile;
      }

      await markConversationRead(supabase, conversationId, userId);

      return { conversation: conv, myProfile, otherProfile };
    },
    enabled: !!conversationId && !!userId,
  });

  // Check match closed status separately (depends on conversation data)
  useEffect(() => {
    const conv = data?.conversation;
    if (!conv || conv.type !== "match" || !conv.reference_id) return;

    const supabaseClient = createClient();
    supabaseClient
      .from("matches")
      .select("status")
      .eq("id", conv.reference_id)
      .single()
      .then(({ data: match }: { data: { status: string } | null; error: unknown }) => {
        if (match?.status === "cancelled") setChatClosed("Este partido fue cancelado.");
        else if (match?.status === "completed") setChatClosed("Este partido finalizó.");
      });
  }, [data?.conversation?.id, data?.conversation?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    conversation: data?.conversation ?? null,
    myProfile: data?.myProfile ?? null,
    otherProfile: data?.otherProfile ?? null,
    chatClosed,
    isLoading,
  };
}
