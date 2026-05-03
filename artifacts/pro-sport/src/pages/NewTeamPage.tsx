import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { createTeam, generateSlug } from "@/lib/teams/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { CANCHAS_SPORT_OPTIONS, ENABLED_CITIES } from "@/lib/types/db";
import { toast } from "sonner";

export default function NewTeamPage() {
  const { user, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sportType, setSportType] = useState("futbol_5");
  const [city, setCity] = useState(profile?.city ?? "");
  const [maxMembers, setMaxMembers] = useState(20);
  const [isPublic, setIsPublic] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) { toast.error("El nombre es requerido."); return; }
    if (!city) { toast.error("Elegí una ciudad."); return; }

    setPending(true);
    try {
      const slug = generateSlug(name) + "-" + Math.random().toString(36).slice(2, 6);
      const team = await createTeam({
        name: name.trim(),
        slug,
        description: description.trim() || null,
        sport_type: sportType,
        city,
        owner_id: user.id,
        max_members: maxMembers,
        is_public: isPublic,
      });
      toast.success("¡Equipo creado!");
      setLocation("/equipos");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo crear el equipo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader title="Crear equipo" backHref="/equipos" />

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-5 shadow-sm space-y-4">

            <div className="flex justify-center pb-2">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-4xl shadow-sm">
                ⚽
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre del equipo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Los Cracks FC"
                required
                maxLength={60}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Un poco sobre el equipo…"
                rows={2}
                maxLength={300}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Deporte</Label>
                <Select value={sportType} onValueChange={setSportType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCHAS_SPORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Ciudad *</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Elegí…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENABLED_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="max">Máx. miembros</Label>
                <Input
                  id="max"
                  type="number"
                  min={2}
                  max={50}
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(Number(e.target.value))}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Visibilidad</Label>
                <Select value={isPublic ? "publico" : "privado"} onValueChange={(v) => setIsPublic(v === "publico")}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publico">🌐 Público</SelectItem>
                    <SelectItem value="privado">🔒 Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setLocation("/equipos")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700">
              {pending ? "Creando…" : "Crear equipo"}
            </Button>
          </div>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
