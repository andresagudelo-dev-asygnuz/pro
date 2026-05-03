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

export function NotifProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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
        () => setUnreadCount((c) => c + 1)
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
