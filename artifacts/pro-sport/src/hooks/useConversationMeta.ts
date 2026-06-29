import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getConversationMeta, type ConversationMetaResult } from "@/lib/chat/api";
import { KEYS, STALE } from "@/lib/queryKeys";

interface ConversationMeta {
  conversation: ConversationMetaResult["conversation"];
  myProfile: ConversationMetaResult["myProfile"];
  otherProfile: ConversationMetaResult["otherProfile"];
  chatClosed: string | null;
  isLoading: boolean;
}

export function useConversationMeta(
  conversationId: string | undefined,
  userId: string | undefined
): ConversationMeta {
  const { data, isLoading } = useQuery({
    queryKey: KEYS.conversationMeta(conversationId ?? "", userId ?? ""),
    queryFn: async () => {
      if (!conversationId || !userId) return null;
      const { data } = await getConversationMeta(supabase, conversationId, userId);
      return data;
    },
    enabled: !!conversationId && !!userId,
    staleTime: STALE.realtime,
  });

  const chatClosed = (() => {
    if (data?.matchStatus === "cancelled") return "Este partido fue cancelado.";
    if (data?.matchStatus === "completed") return "Este partido finalizó.";
    return null;
  })();

  return {
    conversation: data?.conversation ?? null,
    myProfile: data?.myProfile ?? null,
    otherProfile: data?.otherProfile ?? null,
    chatClosed,
    isLoading,
  };
}
