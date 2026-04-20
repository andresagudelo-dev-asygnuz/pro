import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import type { Profile } from "@/lib/types/db";

export function AppNav({
  profile,
  isAdmin = false,
}: {
  profile: Profile | null;
  isAdmin?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-5">
          <Link href="/feed" className="text-base font-semibold tracking-tight">
            PRO
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/feed"
              className="text-muted-foreground hover:text-foreground"
            >
              Feed
            </Link>
            <Link
              href="/matches/new"
              className="text-muted-foreground hover:text-foreground"
            >
              Crear partido
            </Link>
            <Link
              href="/perfil"
              className="text-muted-foreground hover:text-foreground"
            >
              Mi perfil
            </Link>
            {isAdmin && (
              <Link
                href="/admin/verificaciones"
                className="text-muted-foreground hover:text-foreground"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {profile ? (
            <Link
              href={`/profile/${profile.id}`}
              className="flex items-center gap-2"
            >
              <span className="hidden text-sm text-foreground sm:inline">
                {profile.full_name ?? profile.username ?? "Perfil"}
              </span>
              <Avatar className="size-8">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="" />
                ) : null}
                <AvatarFallback>
                  {initialsFromName(profile.full_name ?? profile.username)}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : null}
          <form action="/auth/signout" method="post">
            <Button variant="ghost" size="sm" type="submit">
              Salir
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
