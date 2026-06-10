import { Link, useLocation } from "wouter";
import { LayoutDashboard, Building2, MessageCircle, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getTotalUnreadMessages } from "@/lib/chat/api";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ElementType;
  matchPaths?: string[];
};

const OWNER_NAV_ITEMS: NavItem[] = [
  {
    href: "/mis-canchas/dashboard",
    label: "Dashboard",
    Icon: LayoutDashboard,
    matchPaths: ["/mis-canchas/dashboard"],
  },
  {
    href: "/chat",
    label: "Chat CRM",
    Icon: MessageCircle,
    matchPaths: ["/chat"],
  },
  {
    href: "/mis-canchas",
    label: "Mis Sedes",
    Icon: Building2,
    matchPaths: [
      "/mis-canchas",
      "/mis-canchas/equipo",
      "/mis-canchas/pendientes",
      "/canchas",
    ],
  },
  {
    href: "/mis-canchas/perfil",
    label: "Perfil",
    Icon: User,
    matchPaths: ["/mis-canchas/perfil", "/mis-canchas/perfil/editar"],
  },
];

export function OwnerBottomNav({ pendingBookings = 0 }: { pendingBookings?: number }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    getTotalUnreadMessages(supabase, user.id).then(setUnreadMessages).catch(() => { });
    const interval = setInterval(() => {
      getTotalUnreadMessages(supabase, user.id).then(setUnreadMessages).catch(() => { });
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Reset unread count when entering chat
  useEffect(() => {
    if (location.startsWith("/chat")) {
      setTimeout(() => {
        if (user) getTotalUnreadMessages(supabase, user.id).then(setUnreadMessages).catch(() => { });
      }, 1000);
    }
  }, [location, user]);

  function isActive(item: NavItem): boolean {
    if (item.matchPaths) {
      return item.matchPaths.some((p) => {
        if (p === "/canchas") {
           return location.startsWith("/canchas"); // Sub-paths de canchas puntuales
        }
        if (p === "/mis-canchas") {
           // Exact match required so dashboard doesn't trigger it
           return location === "/mis-canchas";
        }
        return location === p || location.startsWith(p + "/");
      });
    }
    return location === item.href;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white dark:bg-zinc-950 border-t border-border/50 shadow-[0_-2px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-end justify-around h-[62px] max-w-lg mx-auto px-1 pb-1">
          {OWNER_NAV_ITEMS.map((item) => {
            const { href, label, Icon } = item;
            const active = isActive(item);
            const isChat = href === "/chat";
            const isCanchas = href === "/mis-canchas";

            return (
              <Link key={href} href={href}>
                <div
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                    active ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="relative flex items-center justify-center w-8 h-8 transition-colors duration-200">
                    <Icon
                      className={`transition-all duration-200 ${active ? "size-[19px]" : "size-[18px]"}`}
                      strokeWidth={active ? 2.5 : 2}
                    />

                    {isChat && unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </span>
                    )}
                    {isCanchas && pendingBookings > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                        {pendingBookings > 99 ? "99+" : pendingBookings}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] transition-all ${active ? "font-semibold" : "font-medium"}`}>
                    {label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
