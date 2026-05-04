import { Link, useLocation } from "wouter";
import { Home, Trophy, Plus, Building2, User } from "lucide-react";
import { useNotifCount } from "@/context/NotifContext";
import { useAuth } from "@/context/AuthContext";

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
    label: "Inicio",
    Icon: Home,
    matchPaths: ["/feed", "/matches"],
  },
  {
    href: "/tournaments",
    label: "Torneos",
    Icon: Trophy,
    matchPaths: ["/tournaments"],
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
  const { roles } = useAuth();

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
          return (
            location.startsWith("/matches") &&
            !location.startsWith("/matches/new")
          );
        }
        return location === p || location.startsWith(p + "/");
      });
    }
    return location === item.href;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-2px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-end justify-around h-[62px] max-w-lg mx-auto px-1 pb-1">
          {navItems.map((item) => {
            const { href, label, Icon, isAction } = item;
            const active = isActive(item);
            const isPerfil = href === "/perfil";
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
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                    active
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-colors duration-200 ${
                      active ? "bg-violet-100 dark:bg-violet-900/30" : ""
                    }`}
                  >
                    <Icon
                      className={`transition-all duration-200 ${active ? "size-[19px]" : "size-[18px]"}`}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    {active && (
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-600 dark:bg-violet-400" />
                    )}
                    {isPerfil && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
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
