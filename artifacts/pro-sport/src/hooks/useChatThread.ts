import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { listMessages, sendMessage, subscribeToConversation, type MessageWithSender } from "@/lib/chat/api";

export function useChatThread(conversationId: string, currentUserId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const queryKey = ["messages", conversationId];

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await listMessages(supabase, conversationId, { limit: 50 });
      return res.data ?? [];
    },
    enabled: !!conversationId,
  });

  // Real-time subscription — appends new messages to cache
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToConversation(supabase, conversationId, (newMsg) => {
      queryClient.setQueryData<MessageWithSender[]>(queryKey, (prev = []) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === newMsg.id)) return prev;

        // Replace optimistic placeholder if it exists (matched by content + sender)
        if (newMsg.sender_id === currentUserId) {
          const optIdx = prev.findIndex(
            (m) => m.id.startsWith("opt-") && m.content === newMsg.content
          );
          if (optIdx !== -1) {
            const next = [...prev];
            next[optIdx] = newMsg;
            return next;
          }
        }

        return [...prev, newMsg];
      });
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId]);

  const { mutateAsync: send, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      // Optimistic update
      const tempId = `opt-${Date.now()}`;
      const optimistic: MessageWithSender = {
        id: tempId,
        content,
        created_at: new Date().toISOString(),
        sender_id: currentUserId,
        sender: null,
      };
      queryClient.setQueryData<MessageWithSender[]>(queryKey, (prev = []) => [
        ...prev,
        optimistic,
      ]);

      const { error } = await sendMessage(supabase, conversationId, currentUserId, content);

      if (error) {
        // Roll back optimistic message
        queryClient.setQueryData<MessageWithSender[]>(queryKey, (prev = []) =>
          prev.filter((m) => m.id !== tempId)
        );
        throw new Error(error);
      }
      // Realtime will replace the optimistic entry when the INSERT arrives
    },
  });

  const messages = data ?? [];
  const error = queryError
    ? (queryError as Error).message
    : null;

  return {
    messages,
    isLoading,
    sendMessage: send,
    isSending,
    error,
  };
}
