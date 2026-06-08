import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useNotifCount } from "@/context/NotifContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { ArrowLeft, Bell } from "lucide-react";
import { NavDrawer } from "@/components/NavDrawer";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  backHref?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, backHref, actions }: PageHeaderProps) {
  const { profile } = useAuth();
  const { unreadCount } = useNotifCount();

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-border/50">
      <div className="container mx-auto px-4 h-14 flex items-center gap-2">

        <NavDrawer />

        {backHref && (
          <Link href={backHref}>
            <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors shrink-0">
              <ArrowLeft className="size-4" />
            </button>
          </Link>
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0 font-bold text-base text-zinc-900 dark:text-white truncate">
          {title}
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}

        <div className="flex items-center gap-1.5 shrink-0">
          <Link href="/notificaciones">
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </Link>
          <Link href="/perfil">
            <Avatar className="size-8 ring-2 ring-violet-100 dark:ring-violet-900 cursor-pointer">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Perfil" />}
              <AvatarFallback className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold">
                {initialsFromName(profile?.full_name ?? profile?.username)}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>

      </div>
    </header>
  );
}
