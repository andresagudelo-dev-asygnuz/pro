import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useConversationMeta } from "@/hooks/useConversationMeta";
import { useChatThread } from "@/hooks/useChatThread";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { Info } from "lucide-react";
import { toast } from "sonner";

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");

  const { conversation, myProfile, otherProfile, chatClosed, isLoading: metaLoading } =
    useConversationMeta(id, user?.id);

  const { messages, isLoading: messagesLoading, sendMessage, isSending } = useChatThread(
    id ?? "",
    user?.id ?? ""
  );

  // Redirect if conversation not found after load
  if (!metaLoading && !conversation && id) {
    setLocation("/chat");
    return null;
  }

  const displayName =
    otherProfile?.full_name ?? otherProfile?.username ?? conversation?.title ?? "Chat";

  const handleSend = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("match_closed")) {
        toast.error("No se pueden enviar mensajes a un partido cerrado.");
      } else {
        toast.error("No se pudo enviar. Revisá tu conexión.");
      }
      setText(content); // restore text on failure
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
      <ChatHeader
        title={displayName}
        subtitle={conversation?.subtitle ?? conversation?.title}
        convType={conversation?.type}
        avatarUrl={otherProfile?.avatar_url}
        hasVerifiedUser={!!otherProfile}
      />

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 py-6 max-w-2xl w-full mx-auto space-y-1">
          <MessageList
            messages={messages}
            currentUserId={user?.id ?? ""}
            otherProfile={otherProfile}
            myProfile={myProfile}
            displayName={displayName}
            isLoading={metaLoading || messagesLoading}
          />
        </div>
      </div>

      {chatClosed ? (
        <div className="shrink-0 bg-white dark:bg-zinc-900 border-t border-border/50 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-[24px] px-6 py-4 border border-border/50 shadow-inner">
              <Info className="size-5 text-muted-foreground/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 leading-tight">
                  {chatClosed}
                </p>
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter leading-tight mt-0.5">
                  No se pueden enviar mensajes en este hilo.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <MessageComposer
          value={text}
          onChange={setText}
          onSend={handleSend}
          isLoading={isSending}
        />
      )}
    </div>
  );
}
