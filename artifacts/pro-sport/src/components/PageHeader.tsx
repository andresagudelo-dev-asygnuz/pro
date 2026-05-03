import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  backHref?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, backHref, actions }: PageHeaderProps) {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4 h-14 flex items-center gap-3">

        {backHref ? (
          <Link href={backHref}>
            <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors shrink-0">
              <ArrowLeft className="size-4" />
            </button>
          </Link>
        ) : (
          <Link href="/feed" className="shrink-0 text-base font-black italic tracking-tighter uppercase text-zinc-900 dark:text-white">
            PRO<span className="text-violet-600">.</span>
          </Link>
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0 font-bold text-base text-zinc-900 dark:text-white truncate">
          {title}
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}

        <Link href="/perfil" className="shrink-0">
          <Avatar className="size-8 ring-2 ring-violet-100 dark:ring-violet-900 cursor-pointer">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Perfil" />}
            <AvatarFallback className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold">
              {initialsFromName(profile?.full_name ?? profile?.username)}
            </AvatarFallback>
          </Avatar>
        </Link>

      </div>
    </header>
  );
}
