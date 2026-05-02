import { useState, useEffect } from "react";
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
import { SKILL_LEVELS } from "@/lib/types/db";
import { toast } from "sonner";

export default function ProfileEditPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [skillLevel, setSkillLevel] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    if (profile?.primary_skill_level) setSkillLevel(profile.primary_skill_level);
  }, [user, profile]);

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
