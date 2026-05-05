import { useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { createCancha, upsertCanchaSchedules } from "@/lib/canchas/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CANCHAS_SPORT_OPTIONS, type CanchaSportType } from "@/lib/types/db";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";

const supabase = createClient();

const DEFAULT_SCHEDULE = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  opens_at: "08:00",
  closes_at: "22:00",
  is_available: i !== 0,
}));

export default function NuevaCanchaPage() {
  const { user, roles } = useAuth();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sportType, setSportType] = useState<CanchaSportType>("futbol_5");

  if (!roles?.is_cancha) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-muted-foreground text-center">
          Necesitás el rol de <strong>Administrador de Cancha</strong> para registrar canchas.
        </p>
        <Button variant="outline" asChild>
          <Link href="/perfil">Ir a mi perfil</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);

    if (!user) { setLocation("/login"); return; }

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value.trim();
    const capacity = parseInt((form.elements.namedItem("capacity") as HTMLInputElement).value);
    const address = (form.elements.namedItem("address") as HTMLInputElement).value.trim();
    const city = (form.elements.namedItem("city") as HTMLInputElement).value.trim();
    const price_per_hour = parseFloat((form.elements.namedItem("price_per_hour") as HTMLInputElement).value);
    const discount_percent = parseFloat((form.elements.namedItem("discount_percent") as HTMLInputElement).value) || 0;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value.trim();
    const whatsapp = (form.elements.namedItem("whatsapp") as HTMLInputElement).value.trim();

    const errs: Record<string, string> = {};
    if (name.length < 2) errs.name = "El nombre debe tener al menos 2 caracteres.";
    if (!address) errs.address = "Ingresá la dirección.";
    if (!city) errs.city = "Ingresá la ciudad.";
    if (isNaN(price_per_hour) || price_per_hour < 0) errs.price_per_hour = "Precio inválido.";
    if (capacity < 1) errs.capacity = "La capacidad debe ser mayor a 0.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setPending(false);
      return;
    }

    const { data: cancha, error: createErr } = await createCancha(
      supabase,
      {
        name,
        description: description || undefined,
        sport_type: sportType,
        capacity,
        address,
        city,
        price_per_hour,
        discount_percent,
        is_active: true,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
      },
      user.id,
    );

    if (createErr) {
      setError(createErr);
      setPending(false);
      return;
    }

    await upsertCanchaSchedules(supabase, cancha!.id, DEFAULT_SCHEDULE);
    setLocation(`/canchas/${cancha!.id}/agenda`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader title="Nueva cancha" backHref="/mis-canchas" />

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la cancha *</Label>
              <Input id="name" name="name" required placeholder="Ej: La Bombonera" />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" rows={2} placeholder="Características, comodidades…" />
            </div>

            <div className="space-y-2">
              <Label>Tipo de deporte *</Label>
              <Select value={sportType} onValueChange={(v) => setSportType(v as CanchaSportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANCHAS_SPORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidad (jugadores) *</Label>
                <Input id="capacity" name="capacity" type="number" min={1} max={100} defaultValue={10} required />
                {fieldErrors.capacity && <p className="text-xs text-destructive">{fieldErrors.capacity}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_per_hour">Precio/hora ($) *</Label>
                <Input id="price_per_hour" name="price_per_hour" type="number" min={0} step={1000} defaultValue={0} required />
                {fieldErrors.price_per_hour && <p className="text-xs text-destructive">{fieldErrors.price_per_hour}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_percent">Descuento (%)</Label>
              <Input id="discount_percent" name="discount_percent" type="number" min={0} max={100} step={5} defaultValue={0} />
              <p className="text-xs text-muted-foreground">Dejalo en 0 si no tenés descuento activo.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input id="address" name="address" required placeholder="Calle 50 #23-45" />
              {fieldErrors.address && <p className="text-xs text-destructive">{fieldErrors.address}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad *</Label>
              <Input id="city" name="city" required placeholder="Manizales" />
              {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+57 300 000 0000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" type="tel" placeholder="+57 300 000 0000" />
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-muted/30 text-sm text-muted-foreground">
              Después de crear la cancha podrás configurar el <strong>horario semanal</strong> y rangos de disponibilidad.
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creando cancha…" : "Crear cancha"}
            </Button>
          </form>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
