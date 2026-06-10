import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { createCancha, upsertCanchaSchedules } from "@/lib/canchas/api";
import { getVenueByOwner } from "@/lib/venues/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CANCHAS_SPORT_OPTIONS, type CanchaSportType } from "@/lib/types/db";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { canchaSchema, type CanchaFormValues } from "@/lib/validations/cancha";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form";


const DEFAULT_SCHEDULE = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  opens_at: "08:00",
  closes_at: "22:00",
  is_available: i !== 0,
}));

export default function NuevaCanchaPage() {
  const { user, roles } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CanchaFormValues>({
    resolver: zodResolver(canchaSchema),
    defaultValues: {
      name: "",
      description: "",
      sport_type: "futbol_5",
      capacity: 10,
      price_per_hour: 0,
      discount_percent: 0,
    },
  });

  const { data: ownerVenue, isLoading: loadingVenue } = useQuery({
    queryKey: ["owner-venue", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await getVenueByOwner(supabase, user.id);
      return data ?? null;
    },
    enabled: !!user,
  });

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

  if (loadingVenue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ownerVenue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-muted-foreground text-center">
          Debes configurar tu centro deportivo antes de agregar canchas.
        </p>
        <Button variant="outline" asChild>
          <Link href="/mis-canchas/centro/editar">Configurar mi centro</Link>
        </Button>
      </div>
    );
  }

  async function onSubmit(data: CanchaFormValues) {
    setError(null);

    if (!user) { setLocation("/login"); return; }

    const venue = ownerVenue!;
    const { data: cancha, error: createErr } = await createCancha(
      supabase,
      {
        name: data.name,
        description: data.description || undefined,
        sport_type: data.sport_type as CanchaSportType,
        capacity: data.capacity,
        address: venue.address,
        city: venue.city,
        price_per_hour: data.price_per_hour,
        discount_percent: data.discount_percent || 0,
        is_active: true,
        phone: venue.phone || undefined,
        whatsapp: venue.whatsapp || undefined,
        venue_id: venue.id,
        lat: venue.lat,
        lng: venue.lng,
      },
      user.id,
    );

    if (createErr) {
      setError(createErr);
      return;
    }

    await upsertCanchaSchedules(supabase, cancha!.id, DEFAULT_SCHEDULE);
    setLocation(`/canchas/${cancha!.id}/agenda`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 pt-5 pb-2 max-w-2xl flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Nueva cancha</h1>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la cancha *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: La Bombonera" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Características, comodidades…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sport_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de deporte *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CANCHAS_SPORT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidad (jugadores) *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price_per_hour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio/hora ($) *</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={1000} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="discount_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} step={5} {...field} />
                    </FormControl>
                    <FormDescription>Dejalo en 0 si no tenés descuento activo.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/30 border rounded-xl p-4 flex flex-col gap-1">
                <span className="text-sm font-medium">Centro deportivo asociado</span>
                <span className="text-sm text-muted-foreground">
                  {ownerVenue.name} ({ownerVenue.city})
                </span>
                <p className="text-xs text-muted-foreground mt-2">
                  La dirección y teléfonos de contacto se toman automáticamente de tu centro deportivo.
                </p>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30 text-sm text-muted-foreground">
                Después de crear la cancha podrás configurar el <strong>horario semanal</strong> y rangos de disponibilidad.
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                {form.formState.isSubmitting ? "Creando cancha…" : "Crear cancha"}
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
