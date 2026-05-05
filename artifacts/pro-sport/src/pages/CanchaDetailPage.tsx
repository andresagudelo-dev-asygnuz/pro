import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getCanchaById, getAvailableSlots, createBooking } from "@/lib/canchas/api";
import { sendNotification } from "@/lib/notifications/api";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Phone, MessageCircle, CheckCircle2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { SPORT_TYPE_LABELS, SPORT_TYPE_ICONS, type Cancha, type TimeSlot } from "@/lib/types/db";
import { toast } from "sonner";

const supabase = createClient();

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function CanchaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [loadingCancha, setLoadingCancha] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getCanchaById(supabase, id).then(({ data, error }) => {
      if (error) setError(error);
      else setCancha(data);
      setLoadingCancha(false);
    });
  }, [id]);

  useEffect(() => {
    if (!cancha) return;
    setSelectedSlot(null);
    setLoadingSlots(true);
    getAvailableSlots(supabase, cancha.id, selectedDate).then(({ data, error }) => {
      if (error) { setSlots([]); }
      else setSlots(data ?? []);
      setLoadingSlots(false);
    });
  }, [cancha, selectedDate]);

  async function handleBook() {
    if (!user) { setLocation("/login"); return; }
    if (!cancha || !selectedSlot) return;
    setBooking(true);
    setBookingError(null);

    const finalPrice =
      cancha.discount_percent > 0
        ? cancha.price_per_hour * (1 - cancha.discount_percent / 100)
        : cancha.price_per_hour;

    const { error } = await createBooking(
      supabase,
      {
        cancha_id: cancha.id,
        booking_date: selectedDate,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        total_price: finalPrice,
        notes: notes || undefined,
      },
      user.id,
    );

    if (error) {
      setBookingError(error);
    } else {
      setBooked(true);
      setSelectedSlot(null);
      toast.success("¡Reserva enviada! El dueño de la cancha confirmará en breve.");
      // Notify cancha owner about new booking request
      const { data: bookerProfile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .single();
      await sendNotification(supabase, cancha.owner_id, "booking_new_request", {
        cancha_id: cancha.id,
        cancha_name: cancha.name,
        booking_date: selectedDate,
        start_time: selectedSlot!.start,
        end_time: selectedSlot!.end,
        booker_name: (bookerProfile as { full_name: string | null; username: string | null } | null)?.full_name
          || (bookerProfile as { full_name: string | null; username: string | null } | null)?.username
          || "Un usuario",
        booker_id: user.id,
      });
      getAvailableSlots(supabase, cancha.id, selectedDate).then(({ data }) => {
        setSlots(data ?? []);
      });
    }
    setBooking(false);
  }

  if (loadingCancha) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !cancha) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">{error || "Cancha no encontrada."}</p>
        <Link href="/canchas"><Button variant="outline">Volver a canchas</Button></Link>
      </div>
    );
  }

  const finalPrice =
    cancha.discount_percent > 0
      ? cancha.price_per_hour * (1 - cancha.discount_percent / 100)
      : cancha.price_per_hour;

  const isOwner = user?.id === cancha.owner_id;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title={cancha.name}
        backHref="/canchas"
        actions={isOwner ? (
          <Link href={`/canchas/${cancha.id}/agenda`}>
            <Button variant="outline" size="sm">Gestionar</Button>
          </Link>
        ) : undefined}
      />

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-5">
        {/* Info card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{SPORT_TYPE_ICONS[cancha.sport_type]}</span>
                <span className="text-sm font-medium text-muted-foreground">{SPORT_TYPE_LABELS[cancha.sport_type]}</span>
              </div>
              <h2 className="text-xl font-bold">{cancha.name}</h2>
            </div>
            <div className="text-right shrink-0">
              {cancha.discount_percent > 0 && (
                <>
                  <p className="text-xs text-muted-foreground line-through">${cancha.price_per_hour.toLocaleString("es-CO")}/h</p>
                  <p className="text-xs text-green-600 font-medium">-{cancha.discount_percent}%</p>
                </>
              )}
              <p className="text-xl font-black text-brand-primary">${finalPrice.toLocaleString("es-CO")}<span className="text-sm font-normal text-muted-foreground">/h</span></p>
            </div>
          </div>

          {cancha.description && <p className="text-sm text-muted-foreground">{cancha.description}</p>}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="size-4" />{cancha.address}, {cancha.city}</span>
            <span className="flex items-center gap-1.5"><Users className="size-4" />{cancha.capacity} jugadores</span>
          </div>

          {(cancha.phone || cancha.whatsapp) && (
            <div className="flex gap-3 pt-1 border-t border-border">
              {cancha.phone && (
                <a href={`tel:${cancha.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Phone className="size-4" />{cancha.phone}
                </a>
              )}
              {cancha.whatsapp && (
                <a
                  href={`https://wa.me/${cancha.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700"
                >
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              )}
            </div>
          )}
        </div>

        {/* Booking section */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-base">Solicitar turno</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              La solicitud queda pendiente hasta que el dueño la apruebe. El horario se reserva para vos (nadie más puede pedirlo mientras esté pendiente).
            </p>
          </div>

          {booked && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-sm">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>¡Solicitud enviada! El dueño recibirá tu pedido y lo confirmará en breve.</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Fecha</label>
            <input
              type="date"
              min={todayStr()}
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setBooked(false); }}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {loadingSlots ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay horarios disponibles para este día.
            </p>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Horarios disponibles — seleccioná uno para reservar
              </p>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    disabled={!slot.isAvailable}
                    onClick={() => setSelectedSlot(selectedSlot?.start === slot.start ? null : slot)}
                    className={`text-xs font-medium py-2.5 px-2 rounded-lg border transition-all ${
                      !slot.isAvailable
                        ? "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border-transparent cursor-not-allowed"
                        : selectedSlot?.start === slot.start
                        ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                        : "bg-background border-border hover:border-foreground/40"
                    }`}
                  >
                    {slot.start}–{slot.end}
                    {!slot.isAvailable && <span className="block text-xs opacity-60">Ocupado</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedSlot && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Horario seleccionado</span>
                <span className="font-medium">{selectedSlot.start} – {selectedSlot.end}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-brand-primary">${finalPrice.toLocaleString("es-CO")}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Notas (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ej: partido de cumpleaños, necesito chaleco…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {bookingError && <p className="text-sm text-destructive">{bookingError}</p>}

              {!user ? (
                <Link href="/login">
                  <Button className="w-full">Iniciá sesión para reservar</Button>
                </Link>
              ) : (
                <Button className="w-full" onClick={handleBook} disabled={booking}>
                  {booking ? "Enviando solicitud…" : "Solicitar turno"}
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
