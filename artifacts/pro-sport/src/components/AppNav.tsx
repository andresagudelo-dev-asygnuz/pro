import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { NavDrawer } from "@/components/NavDrawer";

export function AppNav() {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <NavDrawer />
          <Link href="/feed" className="text-base font-semibold tracking-tight">
            PRO<span className="text-brand-primary">.</span>
          </Link>
        </div>

        {profile && (
          <Link href={`/profile/${profile.id}`} className="flex items-center gap-2">
            <span className="hidden text-sm text-foreground sm:inline">
              {profile.full_name ?? profile.username ?? "Perfil"}
            </span>
            <Avatar className="size-8">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
              <AvatarFallback>{initialsFromName(profile.full_name ?? profile.username)}</AvatarFallback>
            </Avatar>
          </Link>
        )}
      </div>
    </header>
  );
}
