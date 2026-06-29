// NotificationPermissionCard — Ask user to enable push notifications
// Should be shown in Profile or Settings page
import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function NotificationPermissionCard() {
  const { permission, requestPermission, isSupported } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  if (!isSupported || permission === "granted") return null;
  if (permission === "denied") {
    return (
      <div className="flex items-start gap-3 px-5 py-4 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl border border-border/40">
        <BellOff className="size-5 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Notificaciones bloqueadas</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Para recibirlas, habilitálas manualmente en los ajustes de tu browser.
          </p>
        </div>
      </div>
    );
  }

  async function handleEnable() {
    setLoading(true);
    await requestPermission();
    setLoading(false);
  }

  return (
    <div className="flex items-start gap-3 px-5 py-4 bg-violet-50 dark:bg-violet-950/30 rounded-2xl border border-violet-200 dark:border-violet-800/50">
      <Bell className="size-5 text-violet-600 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">Activá las notificaciones</p>
        <p className="text-xs text-violet-700/70 dark:text-violet-400/60 mt-0.5">
          Recibí alertas cuando alguien se una a tu partido, te invite, o haya actividad en el chat.
        </p>
      </div>
      <Button
        size="sm"
        disabled={loading}
        onClick={handleEnable}
        className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8 px-3 rounded-xl font-bold shrink-0"
      >
        Activar
      </Button>
    </div>
  );
}
