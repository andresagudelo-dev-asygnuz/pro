import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { NotificationList } from "@/components/notifications/notification-list";

export const metadata = {
  title: "Notificaciones · PRO",
};

export default async function NotificationsPage() {
    const user = await requireUser();
    const supabase = await createClient();

    const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

    return (
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight">Notificaciones</h1>
                <p className="text-sm text-muted-foreground">Alertas sobre tus partidos e invitaciones.</p>
            </header>

            <NotificationList notifications={notifications || []} />
        </div>
    );
}
