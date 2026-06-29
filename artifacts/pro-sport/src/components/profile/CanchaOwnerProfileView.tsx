import { useRef } from "react";
import { Link } from "wouter";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/db";
import type { UserRoles } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { Building2, ChevronRight, LogOut, Pencil } from "lucide-react";

export interface CanchaOwnerProfileViewProps {
  profile: Profile | null;
  user: User;
  roles: UserRoles;
  uploadingAvatar: boolean;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSignOut: () => void;
}

export function CanchaOwnerProfileView({
  profile,
  uploadingAvatar,
  onAvatarChange,
  onSignOut,
}: CanchaOwnerProfileViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pb-24">
      <PageHeader
        title="Perfil de Administrador"
        actions={
          <button
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            onClick={onSignOut}
            title="Salir"
          >
            <LogOut className="size-4" />
          </button>
        }
      />

      {/* HERO */}
      <div
        className="relative overflow-hidden rounded-b-[36px] pb-10 pt-10"
        style={{ background: "linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)" }}
      >
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative">
            <img
              src={
                profile?.avatar_url ||
                "https://ui-avatars.com/api/?name=" +
                  encodeURIComponent(profile?.full_name || "Admin") +
                  "&background=6d28d9&color=fff"
              }
              alt="Avatar"
              className="w-28 h-28 rounded-full border-4 border-white/10 object-cover shadow-xl bg-zinc-800"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-2 bg-violet-600 rounded-full text-white shadow-lg hover:bg-violet-700 transition-colors"
            >
              {uploadingAvatar ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Pencil className="size-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
          </div>

          <h1 className="mt-5 text-2xl font-black text-white">
            {profile?.full_name || "Administrador"}
          </h1>
          {profile?.username && (
            <p className="text-violet-200/70 font-medium mt-1">@{profile.username}</p>
          )}

          <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-400/30 bg-violet-500/20 text-violet-200 text-xs font-bold uppercase tracking-widest">
            <Building2 className="size-3.5" />
            Dueño de Canchas
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <main className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Panel de Control */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Panel de Control
            </p>
          </div>
          <div className="px-3 pb-4 space-y-1">
            <Link href="/mis-canchas">
              <div className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30">
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 flex items-center justify-center shrink-0">
                  <Building2 className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-zinc-900 dark:text-white">Mis Canchas</p>
                  <p className="text-xs text-muted-foreground">Gestioná sedes, reservas y agenda</p>
                </div>
                <ChevronRight className="size-5 text-violet-600" />
              </div>
            </Link>
          </div>
        </div>

        {/* Configuración */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
          <p className="px-5 pt-5 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Configuración
          </p>
          <nav className="pb-2">
            <Link href="/perfil/editar">
              <div className="flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <Pencil className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Editar perfil</p>
                  <p className="text-[11px] text-muted-foreground">Datos personales de administrador</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>

            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              style={{ width: "calc(100% - 24px)" }}
            >
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center shrink-0">
                <LogOut className="size-4" />
              </div>
              <span className="text-sm font-medium text-red-600 flex-1 text-left">Cerrar sesión</span>
            </button>
          </nav>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
