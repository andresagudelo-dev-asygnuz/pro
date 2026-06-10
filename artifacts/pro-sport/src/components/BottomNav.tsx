import { Link, useLocation } from "wouter";
import { Home, Trophy, Plus, Building2, User, MessageCircle, Globe } from "lucide-react";
import { useNotifCount } from "@/context/NotifContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getTotalUnreadMessages } from "@/lib/chat/api";


type NavItem = {
  href: string;
  label: string;
  Icon: React.ElementType;
  isAction?: boolean;
  matchPaths?: string[];
};

const BASE_NAV_ITEMS: NavItem[] = [
  {
    href: "/feed",
    label: "Feed",
    Icon: Home,
    matchPaths: ["/feed", "/matches", "/tournaments"],
  },
  {
    href: "/chat",
    label: "Chat",
    Icon: MessageCircle,
    matchPaths: ["/chat"],
  },
  {
    href: "/matches/new",
    label: "Crear",
    Icon: Plus,
    isAction: true,
  },
  {
    href: "/canchas",
    label: "Canchas",
    Icon: Building2,
    matchPaths: ["/canchas", "/mis-canchas"],
  },
  {
    href: "/perfil",
    label: "Perfil",
    Icon: User,
    matchPaths: [
      "/perfil",
      "/amigos",
      "/notificaciones",
      "/mis-partidos",
      "/mis-reservas",
    ],
  },
];

export function BottomNav({ pendingBookings = 0 }: { pendingBookings?: number }) {
  const [location] = useLocation();
  const { unreadCount } = useNotifCount();
  const { roles, user } = useAuth();
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

  const navItems: NavItem[] = BASE_NAV_ITEMS.map((item) => {
    if (item.href === "/canchas" && roles?.is_cancha) {
      return { ...item, href: "/mis-canchas" };
    }
    return item;
  });

  function isActive(item: NavItem): boolean {
    if (item.isAction) return false;
    if (item.matchPaths) {
      return item.matchPaths.some((p) => {
        if (p === "/matches") {
          return location.startsWith("/matches") && !location.startsWith("/matches/new");
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
          {navItems.map((item) => {
            const { href, label, Icon, isAction } = item;
            const active = isActive(item);
            const isPerfil = href === "/perfil";
            const isChat = href === "/chat";
            const isCanchas = item.matchPaths?.includes("/mis-canchas");

            if (isAction) {
              return (
                <Link key={href} href={href}>
                  <div className="flex flex-col items-center gap-0.5 -mt-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-500/35 flex items-center justify-center transition-all duration-150 active:scale-95">
                      <Icon className="size-[22px] text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                  </div>
                </Link>
              );
            }

            return (
              <Link key={href} href={href}>
                <div
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${active ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <div className="relative flex items-center justify-center w-8 h-8 transition-colors duration-200">
                    <Icon
                      className={`transition-all duration-200 ${active ? "size-[19px]" : "size-[18px]"}`}
                      strokeWidth={active ? 2.5 : 2}
                    />

                    {isPerfil && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    {isChat && unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </span>
                    )}
                    {isCanchas && roles?.is_cancha && pendingBookings > 0 && (
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
