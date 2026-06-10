import { Suspense, lazy } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENABLED_CITIES, SPORT_TYPE_LABELS, SPORT_TYPE_ICONS, type Cancha, type TimeSlot, type Sport, type Venue } from "@/lib/types/db";
import { ArrowRight, Building2, MapPin, Map, List, CheckCircle2, Users } from "lucide-react";

const VenueCanchaPickerMap = lazy(() =>
  import("@/components/matches/VenueCanchaPickerMap").then((m) => ({ default: m.VenueCanchaPickerMap }))
);

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export interface StepLocationPickerProps {
  preselectedBookingId: string | null;
  selectedCancha: Cancha | null;
  selectedSlot: TimeSlot | null;
  dateStr: string;
  city: string;
  canchas: Cancha[];
  loadingCanchas: boolean;
  slots: TimeSlot[];
  loadingSlots: boolean;
  venues: Venue[];
  venueFilter: string;
  venueView: "map" | "list";
  userLocation: { lat: number; lng: number } | null;
  manualAddress: string;
  fieldErrors: Record<string, string>;
  error: string | null;
  sportId: string;
  sports: Sport[];
  onDateChange: (date: string) => void;
  onCityChange: (city: string) => void;
  onSelectCancha: (cancha: Cancha | null) => void;
  onSelectSlot: (slot: TimeSlot | null) => void;
  onVenueFilterChange: (filter: string) => void;
  onVenueViewChange: (view: "map" | "list") => void;
  onManualAddressChange: (address: string) => void;
  onNext: () => void;
}

export function StepLocationPicker({
  preselectedBookingId, selectedCancha, selectedSlot, dateStr, city,
  canchas, loadingCanchas, slots, loadingSlots, venues, venueFilter, venueView,
  userLocation, manualAddress, fieldErrors, error, sportId, sports,
  onDateChange, onCityChange, onSelectCancha, onSelectSlot,
  onVenueFilterChange, onVenueViewChange, onManualAddressChange, onNext,
}: StepLocationPickerProps) {
  const finalPrice = selectedCancha
    ? (selectedCancha.discount_percent > 0
      ? selectedCancha.price_per_hour * (1 - selectedCancha.discount_percent / 100)
      : selectedCancha.price_per_hour)
    : 0;

  const filteredCanchas = venueFilter === "__all__" ? canchas : canchas.filter((c) => c.venue_id === venueFilter);
  const selectedSport = sports.find((sp) => sp.id === sportId);

  if (preselectedBookingId) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold">Fecha y lugar</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tu cancha ya está reservada. Confirmá y continuá.</p>
        </div>
        {selectedCancha ? (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 shrink-0" />
              <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Cancha reservada</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{SPORT_TYPE_ICONS[selectedCancha.sport_type]}</span>
              <div>
                <p className="font-semibold text-sm">{selectedCancha.name}</p>
                <p className="text-xs text-muted-foreground">{selectedCancha.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-green-100 dark:border-green-900">
              <span>📅 {dateStr}</span>
              <span>⏰ {selectedSlot?.start} – {selectedSlot?.end}</span>
            </div>
            <Link href={`/canchas/${selectedCancha.id}`}>
              <p className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer mt-1">
                Cambiar cancha (la reserva actual quedará pendiente)
              </p>
            </Link>
          </div>
        ) : (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
        <Button onClick={onNext} disabled={!selectedCancha} className="w-full rounded-xl bg-violet-600 hover:bg-violet-700" size="lg">
          Siguiente — Invitar amigos <ArrowRight className="size-4 ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold">Fecha y lugar</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Elegí cuándo y dónde se juega. Podés reservar una cancha registrada o ingresar la dirección manualmente.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Fecha del partido *</Label>
        <input
          type="date" value={dateStr} min={todayDate()}
          onChange={(e) => { onDateChange(e.target.value); onSelectSlot(null); }}
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {fieldErrors.date && <p className="text-xs text-destructive">{fieldErrors.date}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Ciudad *</Label>
        <Select value={city} onValueChange={(v) => { onCityChange(v); onSelectCancha(null); onSelectSlot(null); }}>
          <SelectTrigger><SelectValue placeholder="Seleccioná la ciudad" /></SelectTrigger>
          <SelectContent>{ENABLED_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        {fieldErrors.city && <p className="text-xs text-destructive">{fieldErrors.city}</p>}
      </div>

      {city && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">
                Canchas en {city}
                {selectedSport && (
                  <span className="ml-1 text-muted-foreground font-normal">· {selectedSport.icon} {selectedSport.name}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
              <button
                type="button" onClick={() => onVenueViewChange("map")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${venueView === "map" ? "bg-white dark:bg-zinc-700 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Map className="size-3" /> Mapa
              </button>
              <button
                type="button" onClick={() => onVenueViewChange("list")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${venueView === "list" ? "bg-white dark:bg-zinc-700 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="size-3" /> Lista
              </button>
            </div>
          </div>

          {loadingCanchas ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : canchas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No hay canchas registradas en {city} aún.</p>
          ) : (
            <>
              {venues.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                  <button
                    type="button" onClick={() => onVenueFilterChange("__all__")}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${venueFilter === "__all__" ? "bg-brand-primary text-white border-brand-primary" : "bg-white dark:bg-zinc-900 border-border text-muted-foreground hover:border-foreground/40"}`}
                  >
                    Todas
                  </button>
                  {venues.map((v) => (
                    <button
                      type="button" key={v.id}
                      onClick={() => onVenueFilterChange(venueFilter === v.id ? "__all__" : v.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${venueFilter === v.id ? "bg-brand-primary text-white border-brand-primary" : "bg-white dark:bg-zinc-900 border-border text-muted-foreground hover:border-foreground/40"}`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}

              {venueView === "map" && (
                <div className="rounded-xl overflow-hidden border border-border/60 shadow-sm">
                  <Suspense fallback={<div className="flex justify-center items-center h-[300px] bg-zinc-100 dark:bg-zinc-800"><div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>}>
                    <VenueCanchaPickerMap
                      canchas={filteredCanchas}
                      venues={venues}
                      userLocation={userLocation}
                      selectedCanchaId={selectedCancha?.id ?? null}
                      onSelectCancha={(c) => onSelectCancha(selectedCancha?.id === c.id ? null : c)}
                      height="300px"
                    />
                  </Suspense>
                </div>
              )}

              {venueView === "list" && (
                <div className="space-y-2">
                  {filteredCanchas.map((c) => (
                    <button
                      type="button" key={c.id}
                      onClick={() => onSelectCancha(selectedCancha?.id === c.id ? null : c)}
                      className={`w-full text-left bg-white dark:bg-zinc-900 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${selectedCancha?.id === c.id ? "border-violet-600 ring-1 ring-violet-600 bg-violet-50/50 dark:bg-violet-900/10" : "border-border/60 hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-sm"}`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-colors ${selectedCancha?.id === c.id ? "bg-violet-600 text-white" : "bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/10 border border-violet-100 dark:border-violet-800"}`}>
                              {selectedCancha?.id === c.id ? <CheckCircle2 className="size-6" /> : SPORT_TYPE_ICONS[c.sport_type]}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-zinc-900 dark:text-white leading-tight truncate">
                                {c.name}
                              </h3>
                              <span className="text-xs text-muted-foreground">
                                {SPORT_TYPE_LABELS[c.sport_type]}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            {c.discount_percent > 0 && (
                              <p className="text-xs text-muted-foreground line-through">
                                ${c.price_per_hour.toLocaleString("es-CO")}/h
                              </p>
                            )}
                            <p className="font-bold text-violet-600 dark:text-violet-400 text-sm">
                              ${(c.discount_percent > 0 ? c.price_per_hour * (1 - c.discount_percent / 100) : c.price_per_hour).toLocaleString("es-CO")}/h
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                            <MapPin className="size-3 shrink-0" /> <span className="truncate">{c.address || c.city}</span>
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Users className="size-3" /> {c.capacity} jug.
                          </span>
                          {c.discount_percent > 0 && (
                            <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold shrink-0">
                              -{c.discount_percent}%
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {selectedCancha && (
            <div className="border rounded-xl p-4 bg-zinc-50 dark:bg-zinc-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{selectedCancha.name}</p>
                <button
                  type="button"
                  onClick={() => { onSelectCancha(null); onSelectSlot(null); }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Quitar
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{SPORT_TYPE_LABELS[selectedCancha.sport_type]} · {selectedCancha.capacity} jug. · {selectedCancha.address}</p>
              <div className="border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Horarios disponibles</p>
                {!dateStr ? (
                  <p className="text-sm text-muted-foreground">Seleccioná la fecha arriba para ver disponibilidad.</p>
                ) : loadingSlots ? (
                  <div className="flex justify-center py-3"><div className="w-5 h-5 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay horarios disponibles para el {dateStr} en esta cancha.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {slots.map((slot) => (
                      <button
                        type="button" key={slot.start}
                        disabled={!slot.isAvailable}
                        onClick={() => onSelectSlot(selectedSlot?.start === slot.start ? null : slot)}
                        className={`text-xs font-medium py-2.5 rounded-lg border transition-all ${!slot.isAvailable ? "bg-muted text-muted-foreground border-transparent cursor-not-allowed opacity-60" : selectedSlot?.start === slot.start ? "bg-brand-primary text-white border-brand-primary shadow-sm" : "bg-white dark:bg-zinc-900 border-border hover:border-foreground/40"}`}
                      >
                        {slot.start}
                        {!slot.isAvailable && <span className="block text-[10px] opacity-60">Ocupado</span>}
                      </button>
                    ))}
                  </div>
                )}
                {fieldErrors.slot && <p className="text-xs text-destructive mt-1">{fieldErrors.slot}</p>}
              </div>
              {selectedSlot && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2.5 text-sm space-y-0.5">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">Solicitud: {selectedSlot.start}–{selectedSlot.end} en {selectedCancha.name}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">${finalPrice.toLocaleString("es-CO")} · Pendiente hasta que el dueño apruebe</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedCancha && (
        <div className="flex flex-col gap-2">
          <Label><MapPin className="size-3.5 inline mr-1 text-muted-foreground" />Dirección del partido <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input
            placeholder="Ej: Cancha El Prado, Carrera 12 #45-67"
            value={manualAddress}
            onChange={(e) => onManualAddressChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Si no reservás una cancha, podés escribir la dirección o dejarla vacía.</p>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
      <Button onClick={onNext} className="w-full" size="lg">
        Siguiente — Invitar amigos <ArrowRight className="size-4 ml-1" />
      </Button>
    </div>
  );
}
