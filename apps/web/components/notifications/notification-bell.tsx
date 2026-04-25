"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell({
    initialUnreadCount,
    userId
}: {
    initialUnreadCount: number;
    userId: string;
}) {
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
    const supabase = createClient();

    useEffect(() => {
        // Suscribirse a nuevas notificaciones en tiempo real
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    setUnreadCount((prev) => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, supabase]);

    return (
        <Link
            href="/notificaciones"
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setUnreadCount(0)}
        >
            <Bell className="size-5" />
            {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
