import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { Bell, CheckCircle2, MessageSquare, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type NotificationData = {
  player_name?: string;
  player_id?: string;
  match_id?: string;
  [key: string]: unknown;
};

type Notification = {
  id: string;
  type: string;
  data: NotificationData;
  created_at: string;
  read_at: string | null;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLocation("/login"); return; }

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "match_request": return <UserPlus className="size-4 text-blue-500" />;
      case "match_accepted": return <CheckCircle2 className="size-4 text-green-500" />;
      case "match_invite": return <MessageSquare className="size-4 text-purple-500" />;
      default: return <Bell className="size-4 text-muted-foreground" />;
    }
  };

  const getMessage = (n: Notification) => {
    const { player_name } = n.data;
    switch (n.type) {
      case "match_request":
        return <span><strong>{player_name || "Un usuario"}</strong> solicitó unirse a tu partido.</span>;
      case "match_accepted":
        return <span>Tu solicitud para unirte al partido fue <strong>aceptada</strong>.</span>;
      case "match_invite":
        return <span>Has sido <strong>invitado</strong> a un nuevo partido.</span>;
      default: return <span>Nueva notificación recibida.</span>;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Notificaciones</h1>
          <Button variant="ghost" size="sm" onClick={markAllRead}>Marcar todas</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="size-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No tenés notificaciones nuevas.</p>
          </div>
        ) : (
          <div className="flex flex-col border rounded-xl divide-y overflow-hidden bg-white dark:bg-zinc-900">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 transition-colors ${!n.read_at ? "bg-primary/5" : "bg-background hover:bg-muted/30"}`}
              >
                <div className="mt-1">{getIcon(n.type)}</div>
                <div className="flex-1 flex flex-col gap-1">
                  <Link
                    href={n.data.match_id ? `/matches/${n.data.match_id}` : "#"}
                    className="text-sm hover:underline"
                  >
                    {getMessage(n)}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("es-CO")}
                  </span>
                </div>
                {!n.read_at && <div className="size-2 rounded-full bg-primary mt-2" />}
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-14">
            <Link href="/feed" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏠</span><span>Inicio</span>
            </Link>
            <Link href="/tournaments" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏆</span><span>Torneos</span>
            </Link>
            <Link href="/matches/new" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>➕</span><span>Crear</span>
            </Link>
            <Link href="/notificaciones" className="flex flex-col items-center gap-0.5 text-xs font-medium text-brand-primary">
              <span>🔔</span><span>Notif.</span>
            </Link>
            <Link href="/perfil" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>👤</span><span>Perfil</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
