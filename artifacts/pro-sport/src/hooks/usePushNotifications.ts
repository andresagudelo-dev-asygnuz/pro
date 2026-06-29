// usePushNotifications — Handles requesting notification permission and registering SW
import { useState, useEffect, useCallback } from "react";

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";

function getPermission(): NotifPermission {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as NotifPermission;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotifPermission>("default");
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    setPermission(getPermission());
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => setSwReady(true));
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotifPermission> => {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";

    const result = await Notification.requestPermission();
    setPermission(result as NotifPermission);
    return result as NotifPermission;
  }, []);

  /**
   * Show a local notification (useful for foreground events from Supabase realtime)
   */
  const showLocalNotification = useCallback(
    async (title: string, options?: NotificationOptions & { url?: string }) => {
      if (Notification.permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, {
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: options?.url ?? "/feed" },
        ...options,
      });
    },
    []
  );

  return {
    permission,
    swReady,
    requestPermission,
    showLocalNotification,
    isSupported: "Notification" in window && "serviceWorker" in navigator,
  };
}
