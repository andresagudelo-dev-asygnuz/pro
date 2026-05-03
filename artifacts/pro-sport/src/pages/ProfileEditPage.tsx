import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SKILL_LEVELS } from "@/lib/types/db";
import { initialsFromName } from "@/lib/format";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

export default function ProfileEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [skillLevel, setSkillLevel] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    if (profile?.primary_skill_level) setSkillLevel(profile.primary_skill_level);
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
  }, [user, profile]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("La imagen no puede superar 5 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes (JPG, PNG, WebP).");
      return;
    }

    setUploadingAvatar(true);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    await supabase.storage.createBucket("avatars", { public: true }).catch(() => {});

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      toast.error("No se pudo subir la foto: " + uploadErr.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const cacheBusted = `${publicUrl}?t=${Date.now()}`;

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ avatar_url: cacheBusted, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateErr) {
      toast.error("Error actualizando perfil.");
    } else {
      setAvatarUrl(cacheBusted);
      await refreshProfile();
      toast.success("Foto de perfil actualizada.");
    }

    setUploadingAvatar(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setFieldErrors({});
    setPending(true);

    const form = e.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value.trim().toLowerCase();
    const full_name = (form.elements.namedItem("full_name") as HTMLInputElement).value.trim();
    const city = (form.elements.namedItem("city") as HTMLInputElement).value.trim();
    const bio = (form.elements.namedItem("bio") as HTMLTextAreaElement).value.trim();

    const errs: Record<string, string> = {};
    if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
      errs.username = "Username: 3-24 caracteres, minúsculas, números o _";
    }
    if (full_name.length < 2) errs.full_name = "Ingresá tu nombre completo.";
    if (!city) errs.city = "Ingresá tu ciudad.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setPending(false);
      return;
    }

    const { error: err } = await supabase
      .from("profiles")
      .update({
        username: username || null,
        full_name,
        city,
        bio: bio || null,
        primary_skill_level: skillLevel || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (err) {
      if (err.message.includes("unique") || err.code === "23505") {
        setFieldErrors({ username: "Ese username ya está en uso." });
      } else {
        setError(err.message);
      }
    } else {
      await refreshProfile();
      toast.success("Perfil actualizado.");
      setLocation("/perfil");
    }
    setPending(false);
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Editar perfil</h1>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-6 shadow-sm">

          {/* Avatar upload */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <Avatar className="size-24 border-4 border-white dark:border-zinc-800 shadow-md">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                <AvatarFallback className="text-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-600">
                  {initialsFromName(profile?.full_name ?? null)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-md transition-colors disabled:opacity-60"
                aria-label="Cambiar foto"
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {uploadingAvatar ? "Subiendo foto…" : "Tocá el ícono para cambiar tu foto"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  minLength={3}
                  maxLength={24}
                  placeholder="andres_gk"
                  defaultValue={profile?.username ?? ""}
                />
                {fieldErrors.username && (
                  <p className="text-xs text-destructive">{fieldErrors.username}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="full_name">Nombre completo *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  placeholder="Andrés Agudelo"
                  defaultValue={profile?.full_name ?? ""}
                />
                {fieldErrors.full_name && (
                  <p className="text-xs text-destructive">{fieldErrors.full_name}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                name="city"
                required
                placeholder="Manizales"
                defaultValue={profile?.city ?? ""}
              />
              {fieldErrors.city && (
                <p className="text-xs text-destructive">{fieldErrors.city}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Nivel</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí tu nivel" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_LEVELS.map((lvl) => (
                    <SelectItem key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                placeholder="Contá un poco de vos como deportista…"
                rows={3}
                defaultValue={profile?.bio ?? ""}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setLocation("/perfil")} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
