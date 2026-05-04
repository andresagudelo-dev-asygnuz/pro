import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthContext";

interface NotifContextValue {
  unreadCount: number;
  clearCount: () => void;
}

const NotifContext = createContext<NotifContextValue>({
  unreadCount: 0,
  clearCount: () => {},
});

function requestBrowserPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

function showBrowserNotification(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
    });
  } catch {
  }
}

function notifMessage(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case "match_request":
      return `${data.player_name || "Un usuario"} quiere unirse a tu partido`;
    case "match_accepted":
      return "Tu solicitud para unirte al partido fue aceptada";
    case "match_invite":
      return "Fuiste invitado a un partido";
    case "match_updated":
      return `El partido ${data.match_title || ""} fue actualizado`;
    case "booking_created":
      return `Nueva reserva en ${data.cancha_name || "tu cancha"}`;
    case "booking_cancelled":
      return `Reserva cancelada en ${data.cancha_name || "tu cancha"}`;
    default:
      return "Nueva notificación";
  }
}

export function NotifProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    requestBrowserPermission();
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const supabase = createClient();

    supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .is("read_at", null)
      .then(({ count }: { count: number | null }) =>
        setUnreadCount(count ?? 0)
      );

    const channel = supabase
      .channel(`notif-count-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: { type?: string; data?: Record<string, unknown> } }) => {
          setUnreadCount((c) => c + 1);
          const type = payload.new.type ?? "";
          const data = payload.new.data ?? {};
          showBrowserNotification("PRO. — Nueva notificación", notifMessage(type, data));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: { read_at?: string | null }; old?: { read_at?: string | null } }) => {
          if (payload.new.read_at && !payload.old?.read_at) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <NotifContext.Provider
      value={{ unreadCount, clearCount: () => setUnreadCount(0) }}
    >
      {children}
    </NotifContext.Provider>
  );
}

export const useNotifCount = () => useContext(NotifContext);
