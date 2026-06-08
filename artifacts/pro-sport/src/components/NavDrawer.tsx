import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNotifCount } from "@/context/NotifContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { initialsFromName } from "@/lib/format";
import {
  Menu,
  Rss,
  Trophy,
  PlusCircle,
  Users,
  User,
  Shield,
  LogOut,
  ChevronRight,
  UserSearch,
  Bell,
} from "lucide-react";


const NAV_ITEMS = [
  { href: "/feed",        label: "Feed",          icon: Rss },
  { href: "/tournaments", label: "Torneos",        icon: Trophy },
  { href: "/matches/new", label: "Crear partido",  icon: PlusCircle },
  { href: "/perfil",      label: "Mi perfil",      icon: User },
];

const QUICK_ITEMS = [
  { href: "/notificaciones", label: "Notificaciones", icon: Bell,       description: "Solicitudes, invitaciones y alertas" },
  { href: "/jugadores",      label: "Jugadores",       icon: UserSearch, description: "Descubrí jugadores por nivel y posición" },
  { href: "/amigos",         label: "Mis amigos",      icon: Users,      description: "Tus conexiones y solicitudes" },
  { href: "/equipos",        label: "Mis equipos",     icon: Shield,     description: "Equipos en los que participás" },
];

export function NavDrawer() {
  const { profile } = useAuth();
  const { unreadCount } = useNotifCount();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    setOpen(false);
    await supabase.auth.signOut();
    navigate("/");
  }

  function handleNav(href: string) {
    setOpen(false);
    navigate(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted transition-colors shrink-0"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-zinc-900" />
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="px-5 pt-6 pb-4 border-b">
            <SheetTitle className="text-left text-base font-semibold tracking-tight">
              PRO<span className="text-brand-primary">.</span>
            </SheetTitle>
            {profile && (
              <button
                onClick={() => handleNav(`/profile/${profile.id}`)}
                className="flex items-center gap-3 mt-3 text-left"
              >
                <Avatar className="size-10">
                  {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
                  <AvatarFallback>{initialsFromName(profile.full_name ?? profile.username)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{profile.full_name ?? profile.username ?? "Perfil"}</p>
                  <p className="text-xs text-muted-foreground">Ver mi perfil →</p>
                </div>
              </button>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="px-3 mb-1">
              <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Acceso rápido
              </p>
              {QUICK_ITEMS.map(({ href, label, icon: Icon, description }) => (
                <button
                  key={href}
                  onClick={() => handleNav(href)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 shrink-0">
                    <Icon className="size-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                </button>
              ))}
            </div>

            <div className="mx-3 my-3 border-t" />

            <div className="px-3">
              <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Navegación
              </p>
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <button
                  key={href}
                  onClick={() => handleNav(href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t px-3 py-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
              onClick={handleSignOut}
            >
              <LogOut className="size-4 shrink-0" />
              Cerrar sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
