import { useRoute } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import ChatListPage from "./ChatListPage";
import ChatDetailPage from "./ChatDetailPage";
import { Send } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ChatPage() {
  const [match, params] = useRoute("/chat/:id");
  const id = match ? params.id : null;
  const isMobile = useIsMobile();

  if (isMobile) {
    if (id) return <ChatDetailPage id={id} />;
    return <ChatListPage />;
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      {/* On desktop, we just render the PageHeader directly without ScreenLayout's min-h-screen wrapper */}
      <div className="shrink-0 z-50 relative">
        <PageHeader title={<span className="font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white">Chat</span>} />
      </div>

      {/* Main chat layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Side: List */}
        <div className="w-[350px] lg:w-[400px] border-r border-border/50 flex-col shrink-0 h-full flex z-10 relative">
          <ChatListPage isDesktopSplit={true} />
        </div>

        {/* Right Side: Detail */}
        <div className="flex-1 flex-col min-w-0 h-full bg-zinc-50 dark:bg-zinc-950/50 flex z-10 relative">
          {id ? (
            <ChatDetailPage id={id} isDesktopSplit={true} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
              <div className="w-24 h-24 rounded-full border-2 border-foreground/10 flex items-center justify-center mb-6">
                <Send className="size-10 text-foreground/80 -ml-1 mt-1" />
              </div>
              <h2 className="text-xl font-bold mb-2">Tus mensajes</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                Envía mensajes privados a un amigo o interactúa con tus reservas y partidos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
