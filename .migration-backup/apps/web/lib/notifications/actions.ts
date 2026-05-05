"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth/with-auth";
import { mapDbError } from "@/lib/errors/map-db-error";

export async function markAsRead(notificationId: string) {
    return withAuth(async ({ user, supabase }) => {
        const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("id", notificationId)
            .eq("user_id", user.id);

        if (error) return { error: mapDbError(error, "markAsRead") };
        revalidatePath("/notificaciones");
        return { ok: true };
    });
}

export async function markAllAsRead() {
    return withAuth(async ({ user, supabase }) => {
        const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .is("read_at", null);

        if (error) return { error: mapDbError(error, "markAllAsRead") };
        revalidatePath("/notificaciones");
        return { ok: true };
    });
}
