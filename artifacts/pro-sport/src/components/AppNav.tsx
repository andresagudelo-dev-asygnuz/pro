import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialsFromName } from "@/lib/format";
import type { Profile } from "@/lib/types/db";

const supabase = createClient();

export function AppNav() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
        setProfile(data as Profile | null);
      });
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-5">
          <Link href="/feed" className="text-base font-semibold tracking-tight">
            PRO<span className="text-brand-primary">.</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/feed" className="text-muted-foreground hover:text-foreground transition-colors">Feed</Link>
            <Link href="/tournaments" className="text-muted-foreground hover:text-foreground transition-colors">Torneos</Link>
            <Link href="/matches/new" className="text-muted-foreground hover:text-foreground transition-colors">Crear partido</Link>
            <Link href="/amigos" className="text-muted-foreground hover:text-foreground transition-colors">Amigos</Link>
            <Link href="/perfil" className="text-muted-foreground hover:text-foreground transition-colors">Mi perfil</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {profile ? (
            <Link href={`/profile/${profile.id}`} className="flex items-center gap-2">
              <span className="hidden text-sm text-foreground sm:inline">
                {profile.full_name ?? profile.username ?? "Perfil"}
              </span>
              <Avatar className="size-8">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
                <AvatarFallback>{initialsFromName(profile.full_name ?? profile.username)}</AvatarFallback>
              </Avatar>
            </Link>
          ) : null}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>Salir</Button>
        </div>
      </div>
    </header>
  );
}
