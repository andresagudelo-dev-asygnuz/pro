import { Link } from "wouter";
import { Zap, Bookmark, Bell, Users, Shield, ChevronRight, Trophy } from "lucide-react";

export function ProfileActivityNav() {
  const items = [
    { href: "/mis-partidos",   icon: <Zap className="size-4" />,      bg: "bg-violet-100 dark:bg-violet-900/30",  color: "text-violet-600",  label: "Mis partidos" },
    { href: "/mis-reservas",   icon: <Bookmark className="size-4" />,  bg: "bg-emerald-100 dark:bg-emerald-900/30", color: "text-emerald-600", label: "Mis reservas" },
    { href: "/ranking",        icon: <Trophy className="size-4" />,    bg: "bg-orange-100 dark:bg-orange-900/30",  color: "text-orange-600",  label: "Ranking Local" },
    { href: "/notificaciones", icon: <Bell className="size-4" />,      bg: "bg-amber-100 dark:bg-amber-900/30",    color: "text-amber-600",   label: "Notificaciones" },
    { href: "/amigos",         icon: <Users className="size-4" />,     bg: "bg-blue-100 dark:bg-blue-900/30",      color: "text-blue-600",    label: "Amigos" },
    { href: "/equipos",        icon: <Shield className="size-4" />,    bg: "bg-violet-100 dark:bg-violet-900/30",  color: "text-violet-600",  label: "Equipos" },
  ] as const;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
      <p className="px-5 pt-5 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Actividad</p>
      <nav className="pb-2">
        {items.map(({ href, icon, bg, color, label }) => (
          <Link key={href} href={href}>
            <div className="flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
              <div className={`w-9 h-9 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}>{icon}</div>
              <span className="text-sm font-medium flex-1 text-zinc-800 dark:text-zinc-200">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
