import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getAllCanchas, getAvailableSlots, createBooking } from "@/lib/canchas/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SKILL_LEVELS } from "@/lib/types/db";
import { SPORT_TYPE_LABELS, SPORT_TYPE_ICONS, type Cancha, type TimeSlot } from "@/lib/types/db";
import { ArrowLeft, Building2, ChevronDown, ChevronUp } from "lucide-react";

const supabase = createClient();

export default function NewMatchPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();

  // Cancha picker state
  const [withCancha, setWithCancha] = useState(false);
  const [cityValue, setCityValue] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loadingCanchas, setLoadingCanchas] = useState(false);
  const [selectedCancha, setSelectedCancha] = useState<Cancha | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    if (!withCancha || !cityValue) return;
    setSelectedCancha(null);
    setSelectedSlot(null);
    setSlots([]);
    setLoadingCanchas(true);
    getAllCanchas(supabase, { city: cityValue }).then(({ data }) => {
      setCanchas(data ?? []);
      setLoadingCanchas(false);
    });
  }, [withCancha, cityValue]);

  useEffect(() => {
    if (!selectedCancha || !dateValue) return;
    setSelectedSlot(null);
    setLoadingSlots(true);
    getAvailableSlots(supabase, selectedCancha.id, dateValue).then(({ data }) => {
      setSlots(data ?? []);
      setLoadingSlots(false);
    });
  }, [selectedCancha, dateValue]);

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
    if (withCancha && selectedCancha && !selectedSlot) errs.cancha = "Seleccioná un horario disponible.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setPending(false);
      return;
    }

    let cancha_booking_id: string | null = null;

    // Create cancha booking if selected
    if (withCancha && selectedCancha && selectedSlot) {
      const bookingDate = dateValue || starts_at.split("T")[0];
      const finalPrice =
        selectedCancha.discount_percent > 0
          ? selectedCancha.price_per_hour * (1 - selectedCancha.discount_percent / 100)
          : selectedCancha.price_per_hour;

      const { data: booking, error: bookingErr } = await createBooking(
        supabase,
        {
          cancha_id: selectedCancha.id,
          booking_date: bookingDate,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          total_price: finalPrice,
        },
        user.id,
      );
      if (bookingErr) {
        setError(bookingErr);
        setPending(false);
        return;
      }
      cancha_booking_id = booking!.id;
    }

    const matchLocation = selectedCancha
      ? `${selectedCancha.name} — ${selectedCancha.address}`
      : (location || null);

    const { data, error } = await supabase.from("matches").insert({
      organizer_id: user.id,
      sport_id: "futbol",
      title,
      description: description || null,
      city,
      location: matchLocation,
      starts_at: new Date(starts_at).toISOString(),
      duration_minutes,
      max_players,
      skill_level: skill_level || null,
      status: "open",
      ...(cancha_booking_id ? { cancha_booking_id } : {}),
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
                <Input
                  id="city"
                  name="city"
                  required
                  placeholder="Manizales"
                  value={cityValue}
                  onChange={(e) => setCityValue(e.target.value)}
                />
                {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="location">Dirección / Cancha</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder={selectedCancha ? selectedCancha.name : "Cancha El Prado"}
                  disabled={!!selectedCancha}
                  value={selectedCancha ? `${selectedCancha.name} — ${selectedCancha.address}` : undefined}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="starts_at">Fecha y hora *</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="datetime-local"
                required
                onChange={(e) => {
                  const d = e.target.value.split("T")[0];
                  setDateValue(d);
                }}
              />
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

            {/* Cancha picker */}
            <div className="border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => { setWithCancha(!withCancha); setSelectedCancha(null); setSelectedSlot(null); }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  Reservar una cancha registrada (opcional)
                </span>
                {withCancha ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
              </button>

              {withCancha && (
                <div className="p-4 space-y-4 border-t">
                  {!cityValue ? (
                    <p className="text-sm text-muted-foreground">Ingresá la ciudad arriba para ver canchas disponibles.</p>
                  ) : loadingCanchas ? (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : canchas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay canchas registradas en {cityValue}.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Canchas en {cityValue}:</p>
                      {canchas.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setSelectedCancha(selectedCancha?.id === c.id ? null : c)}
                          className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                            selectedCancha?.id === c.id
                              ? "border-brand-primary bg-brand-primary/5"
                              : "border-border hover:border-foreground/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-left">
                            <span>{SPORT_TYPE_ICONS[c.sport_type]}</span>
                            <div>
                              <p className="font-medium leading-tight">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{SPORT_TYPE_LABELS[c.sport_type]} · {c.capacity} jug.</p>
                            </div>
                          </div>
                          <span className="font-semibold text-brand-primary shrink-0">
                            ${c.price_per_hour.toLocaleString("es-CO")}/h
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedCancha && (
                    <div className="space-y-3 border-t pt-3">
                      {!dateValue ? (
                        <p className="text-sm text-muted-foreground">Seleccioná la fecha y hora del partido para ver disponibilidad.</p>
                      ) : loadingSlots ? (
                        <div className="flex justify-center py-3">
                          <div className="w-5 h-5 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay horarios disponibles para este día en {selectedCancha.name}.</p>
                      ) : (
                        <>
                          <p className="text-xs font-medium text-muted-foreground">Horarios disponibles en {selectedCancha.name}:</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {slots.map((slot) => (
                              <button
                                type="button"
                                key={slot.start}
                                disabled={!slot.isAvailable}
                                onClick={() => setSelectedSlot(selectedSlot?.start === slot.start ? null : slot)}
                                className={`text-xs font-medium py-2 rounded-lg border transition-colors ${
                                  !slot.isAvailable
                                    ? "bg-muted text-muted-foreground border-transparent cursor-not-allowed"
                                    : selectedSlot?.start === slot.start
                                    ? "bg-brand-primary text-white border-brand-primary"
                                    : "bg-background border-border hover:border-foreground/40"
                                }`}
                              >
                                {slot.start}
                              </button>
                            ))}
                          </div>
                          {selectedSlot && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-sm text-amber-700 dark:text-amber-300 space-y-0.5">
                              <p className="font-medium">Solicitud de turno: {selectedSlot.start}–{selectedSlot.end} en {selectedCancha.name}</p>
                              <p className="text-xs opacity-80">
                                ${(selectedCancha.discount_percent > 0
                                  ? selectedCancha.price_per_hour * (1 - selectedCancha.discount_percent / 100)
                                  : selectedCancha.price_per_hour
                                ).toLocaleString("es-CO")} · Queda pendiente hasta que el dueño apruebe
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      {fieldErrors.cancha && <p className="text-xs text-destructive">{fieldErrors.cancha}</p>}
                    </div>
                  )}
                </div>
              )}
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
