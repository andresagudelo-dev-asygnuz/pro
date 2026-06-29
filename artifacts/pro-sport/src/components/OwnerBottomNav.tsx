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
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 h-28 z-40 pointer-events-none"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          WebkitMaskImage: "linear-gradient(to top, black 40%, transparent 100%)",
          maskImage: "linear-gradient(to top, black 40%, transparent 100%)"
        }}
      />
      <nav className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
        <div className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.12)] rounded-[32px] w-full max-w-[400px] pointer-events-auto">
        <div className="flex items-center justify-between h-[68px] px-2">
          {OWNER_NAV_ITEMS.map((item) => {
            const { href, label, Icon } = item;
            const active = isActive(item);
            const isChat = href === "/chat";
            const isCanchas = href === "/mis-canchas";

            return (
              <Link key={href} href={href} className="flex-1 max-w-[80px]">
                <div className="flex justify-center">
                  <div
                    className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-300 min-w-[64px] ${
                      active
                        ? "bg-zinc-100 dark:bg-zinc-800 text-brand-primary"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <Icon
                        className={`transition-all duration-300 ${active ? "size-5" : "size-[22px]"}`}
                        strokeWidth={active ? 2.5 : 2}
                      />

                      {isChat && unreadMessages > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-brand-primary text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none shadow-sm border border-white dark:border-zinc-900">
                          {unreadMessages > 99 ? "99+" : unreadMessages}
                        </span>
                      )}
                      {isCanchas && pendingBookings > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none shadow-sm border border-white dark:border-zinc-900">
                          {pendingBookings > 99 ? "99+" : pendingBookings}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] transition-all duration-300 ${
                        active ? "font-bold" : "font-medium"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
    </>
  );
}
