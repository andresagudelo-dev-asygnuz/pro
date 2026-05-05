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
  const cancha = (data.cancha_name as string) || "la cancha";
  const booker = (data.booker_name as string) || "Un usuario";
  const dateStr = data.booking_date
    ? new Date(`${data.booking_date as string}T12:00:00`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })
    : "";
  const timeStr = data.start_time ? ` a las ${(data.start_time as string).substring(0, 5)}h` : "";

  switch (type) {
    case "match_request":
      return `${data.player_name || "Un usuario"} quiere unirse a tu partido`;
    case "match_accepted":
      return "Tu solicitud para unirte al partido fue aceptada";
    case "match_invite":
      return "Fuiste invitado a un partido";
    case "match_updated":
      return `El partido ${data.match_title || ""} fue actualizado${data.needs_reconfirm ? " — reconfirmá asistencia" : ""}`;
    case "booking_new_request":
      return `🏟️ ${booker} solicitó turno en ${cancha}${dateStr ? " — " + dateStr : ""}${timeStr}`;
    case "booking_confirmed":
      return `✅ Reserva confirmada en ${cancha}${dateStr ? " — " + dateStr : ""}${timeStr}`;
    case "booking_cancelled_owner":
    case "booking_cancelled":
      return `❌ Reserva cancelada en ${cancha}${dateStr ? " — " + dateStr : ""}${timeStr}`;
    case "booking_created":
      return `Nueva reserva en ${cancha}${dateStr ? " — " + dateStr : ""}${timeStr}`;
    case "tournament_registered":
      return `Te inscribiste en ${(data.tournament_name as string) || "el torneo"} — inscripción pendiente`;
    case "tournament_accepted":
      return `🏆 Inscripción aceptada en ${(data.tournament_name as string) || "el torneo"}`;
    case "tournament_rejected":
      return `Inscripción rechazada en ${(data.tournament_name as string) || "el torneo"}`;
    case "tournament_match_scheduled":
      return `Partido programado en ${(data.tournament_name as string) || "el torneo"}${data.opponent ? ` vs ${data.opponent as string}` : ""}`;
    case "tournament_result":
      return `Resultado cargado en ${(data.tournament_name as string) || "el torneo"}${data.result ? ` — ${data.result as string}` : ""}`;
    case "tournament_cancelled":
      return `El torneo ${(data.tournament_name as string) || ""} fue cancelado`;
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
