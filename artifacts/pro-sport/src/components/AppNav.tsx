import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { NavDrawer } from "@/components/NavDrawer";
import { Home, MessageCircle, Building2, User, Plus } from "lucide-react";

export function AppNav() {
  const { profile, roles } = useAuth();
  const [location] = useLocation();

  const isOwnerContext = location.startsWith("/mis-canchas") || location.startsWith("/canchas/");
  const profileLink = isOwnerContext ? "/mis-canchas/perfil" : (profile ? `/profile/${profile.id}` : "#");

  const desktopNavItems = [
    { href: "/feed", label: "Feed", Icon: Home, matchPaths: ["/feed", "/matches", "/tournaments"] },
    { href: "/chat", label: "Chat", Icon: MessageCircle, matchPaths: ["/chat"] },
    { href: "/matches/new", label: "Crear", Icon: Plus, isAction: true },
    { href: roles?.is_cancha ? "/mis-canchas" : "/canchas", label: "Canchas", Icon: Building2, matchPaths: ["/canchas", "/mis-canchas"] },
    { href: "/perfil", label: "Perfil", Icon: User, matchPaths: ["/perfil", "/amigos", "/notificaciones", "/mis-partidos", "/mis-reservas"] },
  ];

  function isActive(item: any): boolean {
    if (item.isAction) return false;
    if (item.matchPaths) {
      return item.matchPaths.some((p: string) => {
        if (p === "/matches") {
          return location.startsWith("/matches") && !location.startsWith("/matches/new");
        }
        return location === p || location.startsWith(p + "/");
      });
    }
    return location === item.href;
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 relative">
        <div className="flex items-center gap-3 w-1/3">
          <NavDrawer />
          <Link href="/feed" className="text-base font-semibold tracking-tight">
            PRO<span className="text-brand-primary">.</span>
          </Link>
        </div>

        {/* Desktop Centered Nav */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2">
          {desktopNavItems.map((item) => {
            const active = isActive(item);
            if (item.isAction) {
              return (
                <Link key={item.href} href={item.href} className="px-2">
                  <div className="h-8 px-4 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-semibold shadow-sm hover:scale-105 transition-transform">
                    <item.Icon className="size-4 mr-1.5" />
                    {item.label}
                  </div>
                </Link>
              );
            }
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${active ? "bg-zinc-100 dark:bg-zinc-800 text-brand-primary font-semibold" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}>
                  <item.Icon className={`size-4 ${active ? "stroke-[2.5px]" : "stroke-2"}`} />
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-1 justify-end w-1/3">
          {profile && (
            <Link href={profileLink} className="flex items-center gap-2">
              <span className="hidden text-sm text-foreground lg:inline">
                {profile.full_name ?? profile.username ?? "Perfil"}
              </span>
              <Avatar className="size-8">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
                <AvatarFallback>{initialsFromName(profile.full_name ?? profile.username)}</AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
