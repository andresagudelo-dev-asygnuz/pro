import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/storage/api";
import { upsertPlayerProfile } from "@/lib/profiles/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SKILL_LEVELS, PLAYER_POSITIONS, PREFERRED_FOOT_OPTIONS } from "@/lib/types/db";
import type { Profile, SkillLevel, PlayerPosition, DominantFoot } from "@/lib/types/db";
import { initialsFromName } from "@/lib/format";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { ProfileBlocksTabs } from "@/components/profile/ProfileBlocksTabs";
import { useProfileBlocks } from "@/hooks/useProfileBlocks";

function resizeToDataUrl(file: File, maxPx = 512, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("No se pudo leer la imagen.")); };
    img.src = objectUrl;
  });
}

const SKILL_DEFS = [
  { key: "skill_pace"      as const, label: "PAC", name: "Velocidad" },
  { key: "skill_shooting"  as const, label: "TIR", name: "Disparo / Tiro" },
  { key: "skill_passing"   as const, label: "PAS", name: "Pase" },
  { key: "skill_dribbling" as const, label: "REG", name: "Regate / Dribbling" },
  { key: "skill_defending" as const, label: "DEF", name: "Defensa" },
  { key: "skill_physical"  as const, label: "FIS", name: "Físico / Resistencia" },
];

export default function ProfileEditPage() {
  const { user, profile, roles, updateProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [skillLevel, setSkillLevel] = useState<string>("");
  const [position, setPosition] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [preferredFoot, setPreferredFoot] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [skills, setSkills] = useState({
    skill_pace: 50,
    skill_shooting: 50,
    skill_passing: 50,
    skill_dribbling: 50,
    skill_defending: 50,
    skill_physical: 50,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { blocks, isLoading: blocksLoading, updateMorpho, updateConditional, updateTechnicalFootball, isSaving } = useProfileBlocks(user?.id ?? "");

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    if (profile?.primary_skill_level) setSkillLevel(profile.primary_skill_level);
    if (profile?.position) setPosition(profile.position);
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    if (profile?.preferred_foot) setPreferredFoot(profile.preferred_foot);
    if (profile) {
      setSkills({
        skill_pace:      profile.skill_pace      ?? 50,
        skill_shooting:  profile.skill_shooting  ?? 50,
        skill_passing:   profile.skill_passing   ?? 50,
        skill_dribbling: profile.skill_dribbling ?? 50,
        skill_defending: profile.skill_defending ?? 50,
        skill_physical:  profile.skill_physical  ?? 50,
      });
    }
  }, [user, profile]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes (JPG, PNG, WebP)."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("La imagen no puede superar 10 MB."); return; }

    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 512, 0.88);
      
      // Convert Data URL to Blob for upload
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { url: publicUrl, error: uploadError } = await uploadFile(supabase, "avatars", fileName, blob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) throw new Error(uploadError);
      if (!publicUrl) throw new Error("No se obtuvo la URL pública.");

      setAvatarUrl(publicUrl);
      updateProfile({ avatar_url: publicUrl });
      const { error } = await upsertPlayerProfile(supabase, user.id, { avatar_url: publicUrl });
      if (error) throw new Error(error);
      toast.success("Foto de perfil actualizada.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error("Error al guardar la foto: " + msg);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
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
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); setPending(false); return; }

    const { error: err } = await upsertPlayerProfile(supabase, user.id, {
      username: username || null,
      full_name,
      city,
      bio: bio || null,
      primary_skill_level: (skillLevel as import("@/lib/types/db").SkillLevel) || null,
      position: (position as import("@/lib/types/db").PlayerPosition) || null,
      preferred_foot: (preferredFoot as import("@/lib/types/db").DominantFoot) || null,
      ...skills,
    });

    if (err) {
      if (err.includes("unique") || err.includes("23505")) {
        setFieldErrors({ username: "Ese username ya está en uso." });
      } else {
        setError("Error al guardar: " + err);
      }
    } else {
      // Update context immediately — no re-fetch needed
      updateProfile({
        full_name,
        city,
        bio: bio || null,
        primary_skill_level: (skillLevel as SkillLevel) || null,
        position: (position as PlayerPosition) || null,
        preferred_foot: (preferredFoot as DominantFoot) || null,
        ...skills,
      });
      toast.success("Perfil actualizado.");
      setLocation("/perfil");
    }
    setPending(false);
  }

  const ovr = Math.round(
    (skills.skill_pace + skills.skill_shooting + skills.skill_passing +
     skills.skill_dribbling + skills.skill_defending + skills.skill_physical) / 6
  );

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Editar perfil</h1>

        <div className="space-y-4">

          {/* Avatar upload */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Foto de perfil</p>
            <div className="flex flex-col items-center">
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
                  {uploadingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {uploadingAvatar ? "Subiendo foto…" : "Tocá el ícono para cambiar tu foto"}
              </p>
            </div>
          </div>

          {/* Main form */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Información personal</p>
            <form id="main-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" name="username" minLength={3} maxLength={24} placeholder="andres_gk"
                    defaultValue={profile?.username ?? ""} />
                  {fieldErrors.username && <p className="text-xs text-destructive">{fieldErrors.username}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="full_name">Nombre completo *</Label>
                  <Input id="full_name" name="full_name" required placeholder="Andrés Agudelo"
                    defaultValue={profile?.full_name ?? ""} />
                  {fieldErrors.full_name && <p className="text-xs text-destructive">{fieldErrors.full_name}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="city">Ciudad *</Label>
                <Input id="city" name="city" required placeholder="Manizales" defaultValue={profile?.city ?? ""} />
                {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
              </div>

              {!roles?.is_cancha && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Nivel</Label>
                      <Select value={skillLevel} onValueChange={setSkillLevel}>
                        <SelectTrigger><SelectValue placeholder="Elegí tu nivel" /></SelectTrigger>
                        <SelectContent>
                          {SKILL_LEVELS.map((lvl) => (
                            <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Posición</Label>
                      <Select value={position} onValueChange={setPosition}>
                        <SelectTrigger><SelectValue placeholder="Tu posición" /></SelectTrigger>
                        <SelectContent>
                          {PLAYER_POSITIONS.map((pos) => (
                            <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Pie de habilidad</Label>
                    <Select value={preferredFoot} onValueChange={setPreferredFoot}>
                      <SelectTrigger><SelectValue placeholder="Tu pie hábil" /></SelectTrigger>
                      <SelectContent>
                        {PREFERRED_FOOT_OPTIONS.map((foot) => (
                          <SelectItem key={foot.value} value={foot.value}>{foot.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" name="bio" placeholder="Contá un poco de vos como deportista…"
                      rows={3} defaultValue={profile?.bio ?? ""} />
                  </div>
                </>
              )}

              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            </form>
          </div>

          {/* Skills section */}
          {!roles?.is_cancha && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Habilidades</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">OVR</span>
                  <span className="text-lg font-black text-violet-600">{ovr}</span>
                </div>
              </div>
              <div className="space-y-4">
                {SKILL_DEFS.map(({ key, label, name }) => {
                  const val = skills[key];
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-8">{label}</span>
                          <span className="text-xs text-muted-foreground">{name}</span>
                        </div>
                        <span className="text-sm font-black text-zinc-900 dark:text-white tabular-nums">{val}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={99}
                        value={val}
                        onChange={(e) => setSkills((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="w-full accent-violet-600 h-2 rounded-full cursor-pointer"
                      />
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[9px] text-muted-foreground/50">1</span>
                        <span className="text-[9px] text-muted-foreground/50">99</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Profile blocks (morpho, conditional, technical) */}
          {user && !roles?.is_cancha && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Perfil deportivo</p>
              {blocksLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ProfileBlocksTabs
                  userId={user.id}
                  morpho={blocks?.morpho ?? null}
                  conditional={blocks?.conditional ?? null}
                  technical={blocks?.technical ?? null}
                  onUpdateMorpho={updateMorpho}
                  onUpdateConditional={updateConditional}
                  onUpdateTechnical={updateTechnicalFootball}
                  isLoading={isSaving}
                />
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pb-4">
            <Button type="button" variant="outline" onClick={() => setLocation("/perfil")} className="flex-1 rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" form="main-form" disabled={pending} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700">
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
