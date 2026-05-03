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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SKILL_LEVELS,
  ENABLED_CITIES,
  SPORT_TYPE_LABELS,
  SPORT_TYPE_ICONS,
  SPORT_ID_TO_CANCHA_TYPES,
  type Cancha,
  type TimeSlot,
  type Sport,
} from "@/lib/types/db";
import { ArrowLeft, ArrowRight, Building2, MapPin } from "lucide-react";

const supabase = createClient();

function todayDatetimeLocal() {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
  return now.toISOString().slice(0, 16);
}

type Step1 = {
  title: string;
  sport_id: string;
  skill_level: string;
  duration_minutes: number;
  max_players: number;
  description: string;
};

export default function NewMatchPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();

  const [sports, setSports] = useState<Sport[]>([]);

  const [s1, setS1] = useState<Step1>({
    title: "",
    sport_id: "",
    skill_level: "",
    duration_minutes: 60,
    max_players: 10,
    description: "",
  });

  const [city, setCity] = useState("");
  const [startsAt, setStartsAt] = useState(todayDatetimeLocal());
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loadingCanchas, setLoadingCanchas] = useState(false);
  const [selectedCancha, setSelectedCancha] = useState<Cancha | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [manualAddress, setManualAddress] = useState("");

  useEffect(() => {
    supabase
      .from("sports")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setSports(data as Sport[]);
      });
  }, []);

  useEffect(() => {
    if (!city) {
      setCanchas([]);
      setSelectedCancha(null);
      setSelectedSlot(null);
      return;
    }
    setLoadingCanchas(true);
    setSelectedCancha(null);
    setSelectedSlot(null);
    const sportTypes = SPORT_ID_TO_CANCHA_TYPES[s1.sport_id] ?? [];
    getAllCanchas(supabase, { city, sportTypes }).then(({ data }) => {
      setCanchas(data ?? []);
      setLoadingCanchas(false);
    });
  }, [city, s1.sport_id]);

  useEffect(() => {
    if (!selectedCancha || !startsAt) {
      setSlots([]);
      return;
    }
    const dateStr = startsAt.split("T")[0];
    setSelectedSlot(null);
    setLoadingSlots(true);
    getAvailableSlots(supabase, selectedCancha.id, dateStr).then(({ data }) => {
      setSlots(data ?? []);
      setLoadingSlots(false);
    });
  }, [selectedCancha, startsAt]);

  function validateStep1() {
    const errs: Record<string, string> = {};
    if (s1.title.trim().length < 3) errs.title = "El título debe tener al menos 3 caracteres.";
    if (!s1.sport_id) errs.sport_id = "Seleccioná un deporte.";
    if (s1.max_players < 2) errs.max_players = "Mínimo 2 jugadores.";
    if (s1.duration_minutes < 15) errs.duration_minutes = "Duración mínima 15 min.";
    return errs;
  }

  function goToStep2() {
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setError(null);
    const errs: Record<string, string> = {};
    if (!city) errs.city = "Seleccioná la ciudad del evento.";
    if (!startsAt) errs.starts_at = "Indicá la fecha y hora del partido.";
    if (selectedCancha && !selectedSlot) errs.slot = "Seleccioná un horario disponible para la cancha.";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    if (!user) { setLocation("/login"); return; }
    setPending(true);

    let cancha_booking_id: string | null = null;

    if (selectedCancha && selectedSlot) {
      const dateStr = startsAt.split("T")[0];
      const finalPrice =
        selectedCancha.discount_percent > 0
          ? selectedCancha.price_per_hour * (1 - selectedCancha.discount_percent / 100)
          : selectedCancha.price_per_hour;

      const { data: booking, error: bookingErr } = await createBooking(
        supabase,
        {
          cancha_id: selectedCancha.id,
          booking_date: dateStr,
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
      : manualAddress || null;

    const { data, error: matchErr } = await supabase
      .from("matches")
      .insert({
        organizer_id: user.id,
        sport_id: s1.sport_id,
        title: s1.title.trim(),
        description: s1.description.trim() || null,
        city,
        location: matchLocation,
        starts_at: new Date(startsAt).toISOString(),
        duration_minutes: s1.duration_minutes,
        max_players: s1.max_players,
        skill_level: (s1.skill_level && s1.skill_level !== "any") ? s1.skill_level : null,
        status: "open",
        ...(cancha_booking_id ? { cancha_booking_id } : {}),
      })
      .select()
      .single();

    if (matchErr) {
      setError(matchErr.message);
    } else if (data) {
      setLocation(`/matches/${data.id}`);
    }
    setPending(false);
  }

  const dateStr = startsAt ? startsAt.split("T")[0] : "";
  const finalPrice = selectedCancha
    ? selectedCancha.discount_percent > 0
      ? selectedCancha.price_per_hour * (1 - selectedCancha.discount_percent / 100)
      : selectedCancha.price_per_hour
    : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-10">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          {step === 1 ? (
            <Link href="/feed">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => { setStep(1); setFieldErrors({}); }}>
              <ArrowLeft className="size-4" />
            </Button>
          )}

          <h1 className="text-lg font-bold flex-1">Crear partido</h1>

          <div className="flex items-center gap-2 text-xs">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${step === 1 ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground"}`}>
              <span className="font-bold">1</span>
              <span className="hidden sm:inline">Info</span>
            </div>
            <div className="w-4 h-px bg-border" />
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${step === 2 ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground"}`}>
              <span className="font-bold">2</span>
              <span className="hidden sm:inline">Lugar</span>
            </div>
          </div>
        </div>

        <div className="h-1 bg-muted">
          <div
            className="h-full bg-brand-primary transition-all duration-500 ease-out"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-sm p-6">

          {/* ─── STEP 1: Info básica ─── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold">Información del partido</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Nombre, deporte y configuración básica.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Nombre del partido *</Label>
                <Input
                  id="title"
                  placeholder='Ej: "Pichanga de los martes"'
                  value={s1.title}
                  onChange={(e) => setS1((p) => ({ ...p, title: e.target.value }))}
                />
                {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Deporte *</Label>
                <Select
                  value={s1.sport_id}
                  onValueChange={(v) => setS1((p) => ({ ...p, sport_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná el deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    {sports.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.icon && <span className="mr-1">{sp.icon}</span>}
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.sport_id && <p className="text-xs text-destructive">{fieldErrors.sport_id}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Nivel de dificultad <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Select
                  value={s1.skill_level}
                  onValueChange={(v) => setS1((p) => ({ ...p, skill_level: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cualquier nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Cualquier nivel</SelectItem>
                    {SKILL_LEVELS.map((lvl) => (
                      <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="duration">Duración (min) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={15}
                    max={600}
                    step={15}
                    value={s1.duration_minutes}
                    onChange={(e) =>
                      setS1((p) => ({ ...p, duration_minutes: parseInt(e.target.value) || 60 }))
                    }
                  />
                  {fieldErrors.duration_minutes && (
                    <p className="text-xs text-destructive">{fieldErrors.duration_minutes}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="max_players">Máx. jugadores *</Label>
                  <Input
                    id="max_players"
                    type="number"
                    min={2}
                    max={64}
                    value={s1.max_players}
                    onChange={(e) =>
                      setS1((p) => ({ ...p, max_players: parseInt(e.target.value) || 10 }))
                    }
                  />
                  {fieldErrors.max_players && (
                    <p className="text-xs text-destructive">{fieldErrors.max_players}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">
                  Descripción <span className="text-muted-foreground text-xs">(opcional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Detalles del partido, reglas especiales, lo que quieras comentar…"
                  rows={3}
                  value={s1.description}
                  onChange={(e) => setS1((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <Button onClick={goToStep2} className="w-full">
                Siguiente — Elegir lugar
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ─── STEP 2: Fecha, ciudad y cancha ─── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold">Fecha y lugar</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Elegí cuándo y dónde se juega. Podés reservar una cancha registrada o ingresar la dirección manualmente.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Fecha y hora *</Label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => {
                    setStartsAt(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {fieldErrors.starts_at && (
                  <p className="text-xs text-destructive">{fieldErrors.starts_at}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Ciudad *</Label>
                <Select
                  value={city}
                  onValueChange={(v) => {
                    setCity(v);
                    setSelectedCancha(null);
                    setSelectedSlot(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná la ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENABLED_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
              </div>

              {/* Canchas de la ciudad seleccionada */}
              {city && (
                <div className="space-y-3 border rounded-xl p-4 bg-zinc-50 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">
                      Canchas en {city}
                      {s1.sport_id && sports.find(sp => sp.id === s1.sport_id) && (
                        <span className="ml-1 text-muted-foreground font-normal">
                          · {sports.find(sp => sp.id === s1.sport_id)!.icon} {sports.find(sp => sp.id === s1.sport_id)!.name}
                        </span>
                      )}
                    </p>
                  </div>

                  {loadingCanchas ? (
                    <div className="flex justify-center py-5">
                      <div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : canchas.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-1">
                      {s1.sport_id && (SPORT_ID_TO_CANCHA_TYPES[s1.sport_id] ?? []).length > 0
                        ? `No hay canchas de ${sports.find(sp => sp.id === s1.sport_id)?.name ?? "este deporte"} registradas en ${city} aún.`
                        : `No hay canchas registradas en ${city} aún.`
                      }
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {canchas.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() =>
                            setSelectedCancha(selectedCancha?.id === c.id ? null : c)
                          }
                          className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all text-left ${
                            selectedCancha?.id === c.id
                              ? "border-brand-primary bg-brand-primary/5 shadow-sm"
                              : "border-border hover:border-foreground/30 bg-white dark:bg-zinc-900"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl shrink-0">{SPORT_TYPE_ICONS[c.sport_type]}</span>
                            <div className="min-w-0">
                              <p className="font-semibold leading-tight truncate">{c.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {SPORT_TYPE_LABELS[c.sport_type]} · {c.capacity} jug. · {c.address}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {c.discount_percent > 0 && (
                              <p className="text-xs text-muted-foreground line-through">
                                ${c.price_per_hour.toLocaleString("es-CO")}/h
                              </p>
                            )}
                            <p className="font-bold text-brand-primary text-sm">
                              $
                              {(c.discount_percent > 0
                                ? c.price_per_hour * (1 - c.discount_percent / 100)
                                : c.price_per_hour
                              ).toLocaleString("es-CO")}
                              /h
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Slots del día para la cancha seleccionada */}
                  {selectedCancha && (
                    <div className="border-t pt-3 space-y-3">
                      <p className="text-sm font-medium">{selectedCancha.name} — horarios disponibles</p>

                      {!startsAt ? (
                        <p className="text-sm text-muted-foreground">
                          Seleccioná la fecha y hora arriba para ver disponibilidad.
                        </p>
                      ) : loadingSlots ? (
                        <div className="flex justify-center py-3">
                          <div className="w-5 h-5 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No hay horarios disponibles para el {dateStr} en esta cancha.
                        </p>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5">
                          {slots.map((slot) => (
                            <button
                              type="button"
                              key={slot.start}
                              disabled={!slot.isAvailable}
                              onClick={() =>
                                setSelectedSlot(
                                  selectedSlot?.start === slot.start ? null : slot,
                                )
                              }
                              className={`text-xs font-medium py-2.5 rounded-lg border transition-all ${
                                !slot.isAvailable
                                  ? "bg-muted text-muted-foreground border-transparent cursor-not-allowed opacity-60"
                                  : selectedSlot?.start === slot.start
                                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                                  : "bg-white dark:bg-zinc-900 border-border hover:border-foreground/40"
                              }`}
                            >
                              {slot.start}
                              {!slot.isAvailable && (
                                <span className="block text-[10px] opacity-60">Ocupado</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {fieldErrors.slot && (
                        <p className="text-xs text-destructive">{fieldErrors.slot}</p>
                      )}

                      {selectedSlot && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2.5 text-sm space-y-0.5">
                          <p className="font-semibold text-amber-800 dark:text-amber-300">
                            Solicitud: {selectedSlot.start}–{selectedSlot.end} en {selectedCancha.name}
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            ${finalPrice.toLocaleString("es-CO")} · Pendiente hasta que el dueño apruebe
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Dirección manual — si no seleccionó cancha */}
              {!selectedCancha && (
                <div className="flex flex-col gap-2">
                  <Label>
                    <MapPin className="size-3.5 inline mr-1 text-muted-foreground" />
                    Dirección del partido{" "}
                    <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Input
                    placeholder="Ej: Cancha El Prado, Carrera 12 #45-67"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Si no reservás una cancha, podés escribir la dirección o dejarla vacía.
                  </p>
                </div>
              )}

              {error && (
                <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  {error}
                </p>
              )}

              <Button onClick={handleSubmit} disabled={pending} className="w-full" size="lg">
                {pending ? "Creando partido…" : "Crear partido"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
