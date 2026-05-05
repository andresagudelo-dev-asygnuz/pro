import { useState } from "react";
import { useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
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

export default function OnboardingPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();
  const supabase = createClient();

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
    const primary_sport_id = (form.elements.namedItem("primary_sport_id") as HTMLInputElement)?.value || "futbol";
    const primary_skill_level = (form.elements.namedItem("primary_skill_level") as HTMLInputElement)?.value || "intermedio";

    const errs: Record<string, string> = {};
    if (!/^[a-z0-9_]{3,24}$/.test(username)) errs.username = "Username: 3-24 caracteres, minúsculas, números o _";
    if (full_name.length < 2) errs.full_name = "Ingresá tu nombre completo.";
    if (city.length < 1) errs.city = "Ingresá tu ciudad.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setPending(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        username,
        full_name,
        city,
        bio: bio || null,
        primary_sport_id,
        primary_skill_level,
      });

    if (error) {
      setError(error.message);
    } else {
      setLocation("/feed");
    }
    setPending(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">
            PRO<span className="text-brand-primary">.</span>
          </span>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Completá tu perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ayudanos a conocerte como deportista</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  required
                  minLength={3}
                  maxLength={24}
                  placeholder="andres_gk"
                />
                {fieldErrors.username && <p className="text-xs text-destructive">{fieldErrors.username}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  placeholder="Andrés Agudelo"
                />
                {fieldErrors.full_name && <p className="text-xs text-destructive">{fieldErrors.full_name}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" name="city" required placeholder="Manizales" />
                {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Deporte principal</Label>
                <Select name="primary_sport_id" defaultValue="futbol">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí un deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="futbol">⚽ Fútbol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Nivel</Label>
              <Select name="primary_skill_level" defaultValue="intermedio">
                <SelectTrigger className="w-full">
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
              <Label htmlFor="bio">Bio (opcional)</Label>
              <Textarea
                id="bio"
                name="bio"
                placeholder="Contá un poco de vos como deportista…"
                rows={3}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar y continuar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
