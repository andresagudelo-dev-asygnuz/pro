import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { getMyCanchas } from "@/lib/canchas/api";
import type { Cancha } from "@/lib/types/db";
import {
  Camera, Pencil, MapPin, Phone, Globe, LayoutDashboard,
  Building2, Users, BarChart2, Calendar, ChevronRight,
  MessageSquare, Star,
} from "lucide-react";
import { toast } from "sonner";

const supabase = createClient();

function resizeToDataUrl(file: File, maxW: number, maxH: number, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen.")); };
    img.src = url;
  });
}

export default function OwnerProfilePage() {
  const { user, profile, roles, updateProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loadingCanchas, setLoadingCanchas] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    if (!roles?.is_cancha) { setLocation("/mis-canchas"); return; }
    getMyCanchas(supabase, user.id)
      .then(({ data }) => setCanchas(data ?? []))
      .finally(() => setLoadingCanchas(false));
  }, [user, roles]);

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo imágenes (JPG, PNG, WebP)."); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Máx 15 MB para el banner."); return; }
    setUploadingBanner(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 1400, 500, 0.85);
      updateProfile({ banner_url: dataUrl });
      const { error } = await supabase.from("profiles")
        .update({ banner_url: dataUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Banner actualizado.");
    } catch (err: unknown) {
      toast.error("Error al guardar el banner: " + (err instanceof Error ? err.message : ""));
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo imágenes."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Máx 10 MB."); return; }
    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 512, 512, 0.88);
      updateProfile({ avatar_url: dataUrl });
      const { error } = await supabase.from("profiles")
        .update({ avatar_url: dataUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Foto de perfil actualizada.");
    } catch (err: unknown) {
      toast.error("Error al guardar la foto: " + (err instanceof Error ? err.message : ""));
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  const displayName = profile?.business_name || profile?.full_name || "Mi Negocio";
  const activeCanchas = canchas.filter((c) => c.is_active).length;

  return (
    <AppLayout>
      <div className="-mx-4 -mt-6 min-h-screen bg-zinc-100 dark:bg-zinc-950 pb-24">

        {/* ── Banner ── */}
        <div className="relative w-full h-44 sm:h-56 bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900 overflow-hidden group">
          {profile?.banner_url ? (
            <img
              src={profile.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-40">
              <Camera className="size-8 text-white" />
              <p className="text-white text-xs font-medium">Agregar banner</p>
            </div>
          )}

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Banner upload button */}
          <button
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploadingBanner}
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
          >
            {uploadingBanner
              ? <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera className="size-3.5" />}
            {uploadingBanner ? "Subiendo…" : "Cambiar banner"}
          </button>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />

          {/* Back nav */}
          <button
            onClick={() => setLocation("/mis-canchas")}
            className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
          >
            ← Panel
          </button>
        </div>

        {/* ── Profile photo + name row ── */}
        <div className="relative max-w-2xl mx-auto">
          {/* Avatar — overlaid on banner bottom edge */}
          <div className="absolute -top-12 left-4">
            <div className="relative">
              <Avatar className="size-24 border-4 border-white dark:border-zinc-950 shadow-xl ring-2 ring-violet-200 dark:ring-violet-800">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-violet-600 to-violet-800 text-white">
                  {initialsFromName(displayName)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-950 transition-colors disabled:opacity-60"
              >
                {uploadingAvatar
                  ? <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="size-3.5" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
          </div>

          {/* Edit button top-right */}
          <div className="flex justify-end pt-3 pr-4">
            <Link href="/mis-canchas/perfil/editar">
              <button className="flex items-center gap-1.5 border border-border/60 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium px-4 py-2 rounded-xl transition-colors shadow-sm gap-2">
                <Pencil className="size-3.5" /> Editar perfil
              </button>
            </Link>
          </div>

          {/* Name + info */}
          <div className="mt-10 pb-4 px-4">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{displayName}</h1>
            {profile?.full_name && profile.business_name && (
              <p className="text-sm text-muted-foreground mt-0.5">@{profile.username || profile.full_name}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {profile?.city && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" /> {profile.city}
                </span>
              )}
              {profile?.business_phone && (
                <a href={`tel:${profile.business_phone}`} className="flex items-center gap-1 text-sm text-violet-600 hover:underline">
                  <Phone className="size-3.5" /> {profile.business_phone}
                </a>
              )}
              {profile?.business_whatsapp && (
                <a
                  href={`https://wa.me/${profile.business_whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                >
                  <MessageSquare className="size-3.5" /> WhatsApp
                </a>
              )}
              {profile?.business_website && (
                <a
                  href={profile.business_website.startsWith("http") ? profile.business_website : `https://${profile.business_website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <Globe className="size-3.5" /> Sitio web
                </a>
              )}
            </div>
            {profile?.bio && (
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-3 leading-relaxed max-w-lg">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <main className="max-w-2xl mx-auto space-y-3 px-3 pt-3">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: loadingCanchas ? "—" : canchas.length, label: "Canchas", icon: <Building2 className="size-4" />, color: "text-violet-600" },
              { value: loadingCanchas ? "—" : activeCanchas, label: "Activas", icon: <Star className="size-4" />, color: "text-emerald-600" },
              { value: profile?.rating_avg ? profile.rating_avg.toFixed(1) : "—", label: "Rating", icon: <Star className="size-4" />, color: "text-amber-500" },
            ].map(({ value, label, icon, color }) => (
              <div key={label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/50 shadow-sm p-4 text-center">
                <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
                <div className={`flex items-center justify-center gap-1 mt-1 ${color} opacity-60`}>{icon}</div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <p className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Gestión</p>
            <nav className="pb-2">
              {[
                { href: "/mis-canchas", icon: <Building2 className="size-4" />, bg: "bg-violet-100 dark:bg-violet-900/30", color: "text-violet-600", label: "Panel de Canchas", sub: `${canchas.length} cancha${canchas.length !== 1 ? "s" : ""}` },
                { href: "/mis-canchas/dashboard", icon: <LayoutDashboard className="size-4" />, bg: "bg-blue-100 dark:bg-blue-900/30", color: "text-blue-600", label: "Dashboard", sub: "Estadísticas consolidadas" },
              ].map(({ href, icon, bg, color, label, sub }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}>{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </nav>
          </div>

          {/* My canchas list */}
          {!loadingCanchas && canchas.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <p className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Mis canchas</p>
              <div className="pb-2">
                {canchas.map((c) => (
                  <div key={c.id} className="px-3 mb-1">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-border/30">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-lg shrink-0 shadow-sm">
                        🏟️
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="size-2.5" /> {c.city}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.is_active ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : "bg-zinc-200 dark:bg-zinc-700 text-muted-foreground"}`}>
                            {c.is_active ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Link href={`/canchas/${c.id}/agenda`}>
                          <button className="w-8 h-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors" title="Agenda">
                            <Calendar className="size-3.5 text-muted-foreground" />
                          </button>
                        </Link>
                        <Link href={`/canchas/${c.id}/clientes`}>
                          <button className="w-8 h-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors" title="Clientes">
                            <Users className="size-3.5 text-muted-foreground" />
                          </button>
                        </Link>
                        <Link href={`/canchas/${c.id}/stats`}>
                          <button className="w-8 h-8 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors" title="Stats">
                            <BarChart2 className="size-3.5 text-muted-foreground" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty prompt if no canchas */}
          {!loadingCanchas && canchas.length === 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-border/60 p-8 text-center">
              <p className="text-4xl mb-3">🏟️</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Sin canchas registradas</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Registrá tu primera cancha para empezar a recibir reservas.</p>
              <Link href="/canchas/nueva">
                <button className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
                  + Registrar cancha
                </button>
              </Link>
            </div>
          )}

        </main>
      </div>
    </AppLayout>
  );
}
