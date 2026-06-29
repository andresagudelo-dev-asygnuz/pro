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
          {navItems.map((item) => {
            const { href, label, Icon, isAction } = item;
            const active = isActive(item);
            const isPerfil = href === "/perfil";
            const isChat = href === "/chat";
            const isCanchas = item.matchPaths?.includes("/mis-canchas");

            if (isAction) {
              return (
                <Link key={href} href={href} className="px-1">
                  <div className="w-12 h-12 rounded-full bg-brand-primary shadow-lg shadow-brand-primary/30 flex items-center justify-center transition-transform duration-150 active:scale-95">
                    <Icon className="size-[22px] text-white" strokeWidth={2.5} />
                  </div>
                </Link>
              );
            }

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

                      {isPerfil && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none shadow-sm border border-white dark:border-zinc-900">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                      {isChat && unreadMessages > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-brand-primary text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none shadow-sm border border-white dark:border-zinc-900">
                          {unreadMessages > 99 ? "99+" : unreadMessages}
                        </span>
                      )}
                      {isCanchas && roles?.is_cancha && pendingBookings > 0 && (
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
