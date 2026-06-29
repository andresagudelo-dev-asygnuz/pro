import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useNotifCount } from "@/context/NotifContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { ArrowLeft, Bell, Home, MessageCircle, Building2, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NavDrawer } from "@/components/NavDrawer";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  backHref?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, backHref, actions }: PageHeaderProps) {
  const { profile, roles } = useAuth();
  const { unreadCount } = useNotifCount();
  const [location] = useLocation();

  const getCanchasHref = () => roles?.is_cancha ? "/mis-canchas" : "/canchas";

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-border/50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between relative">

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <NavDrawer />

          {backHref && (
            <Link href={backHref}>
              <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors shrink-0">
                <ArrowLeft className="size-4" />
              </button>
            </Link>
          )}

          <div className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-white truncate">
            {title}
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <nav className="flex items-center gap-2">
            <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/feed">
                  <button className={`p-2 rounded-lg flex items-center justify-center transition-colors ${location === "/feed" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "text-muted-foreground hover:bg-muted"}`}>
                    <Home className="size-5" />
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Inicio</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/chat">
                  <button className={`p-2 rounded-lg flex items-center justify-center transition-colors ${location.startsWith("/chat") ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "text-muted-foreground hover:bg-muted"}`}>
                    <MessageCircle className="size-5" />
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Chat</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={getCanchasHref()}>
                  <button className={`p-2 rounded-lg flex items-center justify-center transition-colors ${location.startsWith(getCanchasHref()) ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" : "text-muted-foreground hover:bg-muted"}`}>
                    <Building2 className="size-5" />
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Canchas</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/matches/new">
                  <button className="p-2 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Plus className="size-5" />
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Crear Partido</TooltipContent>
            </Tooltip>
            </TooltipProvider>
          </nav>
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}

        <div className="flex items-center gap-1.5 shrink-0 flex-1 justify-end">
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
