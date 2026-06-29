import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useConversationMeta } from "@/hooks/useConversationMeta";
import { useChatThread } from "@/hooks/useChatThread";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageComposer } from "@/components/chat/MessageComposer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { leaveConversation } from "@/lib/chat/api";
import { supabase } from "@/lib/supabase";
import { Info } from "lucide-react";
import { toast } from "sonner";

export default function ChatDetailPage({ id: propId, isDesktopSplit }: { id?: string, isDesktopSplit?: boolean }) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || paramId;
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { conversation, myProfile, otherProfile, chatClosed, isLoading: metaLoading } =
    useConversationMeta(id, user?.id);

  const {
    messages,
    isLoading: messagesLoading,
    sendMessage,
    isSending,
    hasOlderMessages,
    isFetchingOlder,
    loadOlderMessages,
  } = useChatThread(id ?? "", user?.id ?? "");

  // Redirect if conversation not found after load
  if (!metaLoading && !conversation && id) {
    setLocation("/chat");
    return null;
  }

  const displayName =
    otherProfile?.full_name ?? otherProfile?.username ?? conversation?.title ?? "Chat";

  async function handleDelete() {
    if (!user?.id || !id) return;
    setIsDeleting(true);
    const { error } = await leaveConversation(supabase, id, user.id);
    setIsDeleting(false);
    setShowDeleteDialog(false);
    if (error) {
      toast.error("No se pudo eliminar la conversación.");
      return;
    }
    // Remove conversation from every page of the infinite query cache immediately
    queryClient.setQueriesData(
      { queryKey: ["conversations"] },
      (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const data = old as { pages: Array<{ data: Array<{ id: string }> | null }> };
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            data: (page.data ?? []).filter((c) => c.id !== id),
          })),
        };
      },
    );
    setLocation("/chat");
  }

  function handleInfo() {
    if (!conversation) return;
    const type = conversation.type;
    const refId = conversation.reference_id;
    if ((type === "friend" || type === "direct") && otherProfile?.id) {
      setLocation(`/profile/${otherProfile.id}`);
    } else if (type === "match" && refId) {
      setLocation(`/matches/${refId}`);
    } else if (type === "tournament" && refId) {
      setLocation(`/tournaments/${refId}`);
    } else if (type === "booking" && refId) {
      setLocation(`/mis-reservas`);
    }
  }

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
    <div className={`flex flex-col bg-zinc-100 dark:bg-zinc-950 overflow-hidden ${isDesktopSplit ? "h-full" : "h-[100dvh]"}`}>
      <ChatHeader
        title={displayName}
        subtitle={conversation?.subtitle ?? conversation?.title}
        convType={conversation?.type}
        avatarUrl={otherProfile?.avatar_url}
        hasVerifiedUser={!!otherProfile}
        onInfo={conversation ? handleInfo : undefined}
        onDelete={conversation ? () => setShowDeleteDialog(true) : undefined}
        hideBackButton={isDesktopSplit}
      />

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 py-6 max-w-2xl w-full mx-auto space-y-1">
          {hasOlderMessages && (
            <div className="flex justify-center py-2">
              <button
                onClick={() => loadOlderMessages()}
                disabled={isFetchingOlder}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium px-4 py-2 rounded-full hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50"
              >
                {isFetchingOlder ? "Cargando…" : "Cargar mensajes anteriores"}
              </button>
            </div>
          )}
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
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Saldrás de esta conversación y desaparecerá de tu lista de chats. Los demás participantes seguirán viéndola.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
