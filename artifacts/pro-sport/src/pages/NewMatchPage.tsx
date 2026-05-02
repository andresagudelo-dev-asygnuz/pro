import { useState } from "react";
import { useLocation, Link } from "wouter";
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
import { ArrowLeft } from "lucide-react";

export default function NewMatchPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);

    if (!user) { setLocation("/login"); return; }

    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim();
    const city = (form.elements.namedItem("city") as HTMLInputElement).value.trim();
    const location = (form.elements.namedItem("location") as HTMLInputElement).value.trim();
    const starts_at = (form.elements.namedItem("starts_at") as HTMLInputElement).value;
    const duration_minutes = parseInt((form.elements.namedItem("duration_minutes") as HTMLInputElement).value);
    const max_players = parseInt((form.elements.namedItem("max_players") as HTMLInputElement).value);
    const skill_level = (form.elements.namedItem("skill_level") as HTMLInputElement)?.value || null;

    const errs: Record<string, string> = {};
    if (title.length < 3) errs.title = "El título debe tener al menos 3 caracteres.";
    if (!city) errs.city = "Indicá la ciudad.";
    if (!starts_at) errs.starts_at = "Indicá fecha y hora.";
    if (max_players < 2) errs.max_players = "Mínimo 2 jugadores.";
    if (duration_minutes < 1) errs.duration_minutes = "Duración inválida.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setPending(false);
      return;
    }

    const { data, error } = await supabase.from("matches").insert({
      organizer_id: user.id,
      sport_id: "futbol",
      title,
      description: description || null,
      city,
      location: location || null,
      starts_at: new Date(starts_at).toISOString(),
      duration_minutes,
      max_players,
      skill_level: skill_level || null,
      status: "open",
    }).select().single();

    if (error) {
      setError(error.message);
    } else if (data) {
      setLocation(`/matches/${data.id}`);
    }
    setPending(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-8">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/feed">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Crear partido</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" name="title" required placeholder="Ej: Partido de 5 en Palermo" />
              {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" placeholder="Detalles adicionales…" rows={3} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="city">Ciudad *</Label>
                <Input id="city" name="city" required placeholder="Manizales" />
                {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="location">Cancha / Dirección</Label>
                <Input id="location" name="location" placeholder="Cancha El Prado" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="starts_at">Fecha y hora *</Label>
              <Input id="starts_at" name="starts_at" type="datetime-local" required />
              {fieldErrors.starts_at && <p className="text-xs text-destructive">{fieldErrors.starts_at}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="duration_minutes">Duración (min) *</Label>
                <Input id="duration_minutes" name="duration_minutes" type="number" min={15} max={600} defaultValue={60} required />
                {fieldErrors.duration_minutes && <p className="text-xs text-destructive">{fieldErrors.duration_minutes}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="max_players">Máx jugadores *</Label>
                <Input id="max_players" name="max_players" type="number" min={2} max={64} defaultValue={10} required />
                {fieldErrors.max_players && <p className="text-xs text-destructive">{fieldErrors.max_players}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Nivel</Label>
              <Select name="skill_level">
                <SelectTrigger>
                  <SelectValue placeholder="Cualquier nivel" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_LEVELS.map((lvl) => (
                    <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creando…" : "Crear partido"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
