import { useLocation } from "wouter";
import { ArrowLeft, Info, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initialsFromName } from "@/lib/format";
import { Building2, Trophy, Users, User, MessageCircle } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  booking:    <Building2 className="size-3 text-amber-500" />,
  match:      <Users className="size-3 text-blue-500" />,
  tournament: <Trophy className="size-3 text-violet-500" />,
  friend:     <User className="size-3 text-emerald-500" />,
  direct:     <MessageCircle className="size-3 text-zinc-400" />,
};

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  convType?: string;
  avatarUrl?: string | null;
  hasVerifiedUser?: boolean;
  backPath?: string;
}

export function ChatHeader({
  title,
  subtitle,
  convType,
  avatarUrl,
  hasVerifiedUser,
  backPath = "/chat",
}: ChatHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="shrink-0 bg-white dark:bg-zinc-900 border-b border-border/50 shadow-xl z-30">
      <div className="flex items-center gap-4 px-4 py-3 max-w-2xl mx-auto">
        <button
          onClick={() => setLocation(backPath)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0"
        >
          <ArrowLeft className="size-5" />
        </button>

        {/* Avatar with type badge */}
        <div className="relative shrink-0">
          <Avatar className="size-11 border-2 border-brand-primary/20 p-0.5 bg-white dark:bg-zinc-800">
            {avatarUrl && <AvatarFallback className="hidden" />}
            {avatarUrl ? (
              <img src={avatarUrl} alt={title} className="rounded-full object-cover" />
            ) : null}
            <AvatarFallback className="text-sm font-black italic bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              {initialsFromName(title)}
            </AvatarFallback>
          </Avatar>
          {convType && (
            <div
              className={cn(
                "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-lg",
                convType === "booking"
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : convType === "match"
                  ? "bg-blue-100 dark:bg-blue-900/30"
                  : convType === "tournament"
                  ? "bg-violet-100 dark:bg-violet-900/30"
                  : "bg-zinc-100 dark:bg-zinc-800"
              )}
            >
              <span className="scale-[0.5]">{TYPE_ICONS[convType]}</span>
            </div>
          )}
        </div>

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-black italic tracking-tighter uppercase truncate leading-tight">
              {title}
            </p>
            {hasVerifiedUser && <ShieldCheck className="size-3.5 text-brand-primary" />}
          </div>
          {subtitle && (
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 truncate leading-tight mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <button className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0">
          <Info className="size-5" />
        </button>
      </div>
    </div>
  );
}
