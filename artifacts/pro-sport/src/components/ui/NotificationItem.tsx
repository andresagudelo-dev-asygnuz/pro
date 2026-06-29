import { Check, Trash2 } from "lucide-react";
import type { Notification } from "@/lib/types/db";

interface NotificationItemProps {
  notification: Notification;
  deletingId: string | null;
  isClickable: boolean;
  getIcon: (type: string) => React.ReactNode;
  getMessage: (n: Notification) => React.ReactNode;
  onNavigate: (n: Notification) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({
  notification: n,
  deletingId,
  isClickable,
  getIcon,
  getMessage,
  onNavigate,
  onMarkRead,
  onDelete,
}: NotificationItemProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
        !n.read_at ? "bg-violet-50/60 dark:bg-violet-900/10" : "bg-background"
      } ${isClickable ? "cursor-pointer hover:bg-muted/40" : ""}`}
      onClick={() => isClickable && onNavigate(n)}
    >
      {/* Unread indicator */}
      <div className="shrink-0 flex items-center justify-center">
        {!n.read_at
          ? <div className="size-2 rounded-full bg-violet-600" />
          : <div className="size-2" />
        }
      </div>

      {/* Icon */}
      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
        {getIcon(n.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">{getMessage(n)}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {new Date(n.created_at).toLocaleString("es-CO", {
              weekday: "short", day: "numeric", month: "short",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
          {isClickable && (
            <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
              Ver detalle →
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {!n.read_at && (
          <button
            onClick={() => onMarkRead(n.id)}
            title="Marcar como leída"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
          >
            <Check className="size-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(n.id)}
          disabled={deletingId === n.id}
          title="Eliminar"
          className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
