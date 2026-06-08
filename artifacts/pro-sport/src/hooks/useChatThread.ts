import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { listMessages, sendMessage, subscribeToConversation, type MessageWithSender } from "@/lib/chat/api";

type MessagesPage = {
  messages: MessageWithSender[];
  nextCursor: string | null;
};

type InfiniteData = {
  pages: MessagesPage[];
  pageParams: (string | undefined)[];
};

export function useChatThread(conversationId: string, currentUserId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const queryKey = ["messages", conversationId];

  const infiniteQuery = useInfiniteQuery<MessagesPage, Error, InfiniteData, string[], string | undefined>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const res = await listMessages(supabase, conversationId, {
        limit: 50,
        cursor: pageParam,
      });
      return {
        messages: res.data ?? [],
        nextCursor: res.nextCursor ?? null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    enabled: !!conversationId,
  });

  // Flatten pages: pages[0] = latest messages, pages[1] = older, etc.
  // Reverse so oldest pages appear first (top of the chat)
  const messages = useMemo(() => {
    const allPages = infiniteQuery.data?.pages ?? [];
    return [...allPages].reverse().flatMap((p) => p.messages);
  }, [infiniteQuery.data?.pages]);

  // Real-time subscription — appends new messages to the latest page (pages[0])
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToConversation(supabase, conversationId, (newMsg) => {
      queryClient.setQueryData<InfiniteData>(queryKey, (old) => {
        if (!old) return old;
        const pages = [...old.pages];
        const latestPage = pages[0];

        // Avoid duplicates
        if (latestPage.messages.some((m) => m.id === newMsg.id)) return old;

        // Replace optimistic placeholder if it exists
        if (newMsg.sender_id === currentUserId) {
          const optIdx = latestPage.messages.findIndex(
            (m) => m.id.startsWith("opt-") && m.content === newMsg.content
          );
          if (optIdx !== -1) {
            const updatedMsgs = [...latestPage.messages];
            updatedMsgs[optIdx] = newMsg;
            pages[0] = { ...latestPage, messages: updatedMsgs };
            return { ...old, pages };
          }
        }

        pages[0] = { ...latestPage, messages: [...latestPage.messages, newMsg] };
        return { ...old, pages };
      });
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId]);

  const { mutateAsync: send, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      const tempId = `opt-${Date.now()}`;
      const optimistic: MessageWithSender = {
        id: tempId,
        content,
        created_at: new Date().toISOString(),
        sender_id: currentUserId,
        sender: null,
      };

      // Optimistic: add to the latest page (pages[0])
      queryClient.setQueryData<InfiniteData>(queryKey, (old) => {
        if (!old) return old;
        const pages = [...old.pages];
        pages[0] = { ...pages[0], messages: [...pages[0].messages, optimistic] };
        return { ...old, pages };
      });

      const { error } = await sendMessage(supabase, conversationId, currentUserId, content);

      if (error) {
        // Roll back optimistic message
        queryClient.setQueryData<InfiniteData>(queryKey, (old) => {
          if (!old) return old;
          const pages = [...old.pages];
          pages[0] = { ...pages[0], messages: pages[0].messages.filter((m) => m.id !== tempId) };
          return { ...old, pages };
        });
        throw new Error(error);
      }
      // Realtime will replace the optimistic entry when the INSERT arrives
    },
  });

  return {
    messages,
    isLoading: infiniteQuery.isLoading,
    sendMessage: send,
    isSending,
    error: infiniteQuery.error ? (infiniteQuery.error as Error).message : null,
    hasOlderMessages: !!infiniteQuery.hasNextPage,
    isFetchingOlder: infiniteQuery.isFetchingNextPage,
    loadOlderMessages: infiniteQuery.fetchNextPage,
  };
}
