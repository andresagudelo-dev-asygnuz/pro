import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getCanchaById, getAvailableSlots, createBooking } from "@/lib/canchas/api";
import { sendNotification } from "@/lib/notifications/api";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, MessageCircle, CheckCircle2, Clock, ShieldCheck, Calendar, Info, Loader2, ChevronRight, Lock } from "lucide-react";
import { CanchaHero } from "@/components/canchas/CanchaHero";
import { BottomNav } from "@/components/BottomNav";
import { type Cancha, type TimeSlot } from "@/lib/types/db";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { Label } from "@/components/ui/label";


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

    const { data: createdBooking, error } = await createBooking(
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
      // Redirect to create match with pre-selected booking
      const bookingParams = new URLSearchParams({
        booking_id: createdBooking!.id,
        cancha_id: cancha.id,
        date: selectedDate,
        start: selectedSlot!.start,
        end: selectedSlot!.end,
      });
      setLocation(`/matches/new?${bookingParams.toString()}`);
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
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pb-24">
      <CanchaHero cancha={cancha} finalPrice={finalPrice} onBack={() => window.history.back()} />

      {/* ══ CONTENT ═══════════════════════════════════════════════════════ */}
      <main className="container mx-auto px-4 -mt-6 relative z-20 max-w-lg space-y-6">
        
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-border/50">
          <div className="flex items-center gap-4 mb-5">
            <Avatar className="size-16 border-2 border-brand-primary/20 p-0.5 bg-white dark:bg-zinc-800">
              <AvatarImage src="" />
              <AvatarFallback className="bg-brand-primary/10 text-brand-primary font-black text-xl">
                {initialsFromName(cancha.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-2xl font-black italic tracking-tighter uppercase">{cancha.name}</h1>
                <ShieldCheck className="size-5 text-brand-primary fill-brand-primary/10" />
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 italic">
                <MapPin className="size-3.5" /> {cancha.city}
              </p>
            </div>
            {isOwner && (
              <Link href={`/canchas/${cancha.id}/agenda`}>
                <Button size="sm" variant="outline" className="rounded-full px-4 h-8 text-[10px] font-black uppercase tracking-widest border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5">
                  Gestionar
                </Button>
              </Link>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl border border-border/50">
              <Info className="size-5 text-brand-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cancha.description || "Esta cancha aún no tiene una descripción detallada. ¡Pero el juego siempre es de primer nivel!"}
              </p>
            </div>

            <div className="flex items-center justify-between text-sm py-2 border-t border-dashed border-border/50">
              <span className="text-muted-foreground font-medium flex items-center gap-2">
                <MapPin className="size-4 text-brand-primary" /> Dirección
              </span>
              <span className="font-bold text-foreground text-right max-w-[200px] truncate">{cancha.address}</span>
            </div>

            {(cancha.phone || cancha.whatsapp) && (
              <div className="flex gap-3 pt-4">
                {cancha.phone && (
                  <Button asChild variant="outline" className="flex-1 rounded-xl h-11 border-border/50 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <a href={`tel:${cancha.phone}`}>
                      <Phone className="size-4 mr-2 text-brand-primary" /> Llamar
                    </a>
                  </Button>
                )}
                {cancha.whatsapp && (
                  <Button asChild variant="outline" className="flex-1 rounded-xl h-11 border-green-500/20 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30">
                    <a
                      href={`https://wa.me/${cancha.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="size-4 mr-2" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Booking Calendar Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-border/50 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="size-4 text-brand-primary" />
              </div>
              <h3 className="font-black italic uppercase tracking-tighter text-lg">Solicitar turno</h3>
            </div>
            {booked && (
              <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="size-3" /> Turno pedido
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha del encuentro</Label>
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-brand-primary transition-colors" />
              <input
                type="date"
                min={todayStr()}
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setBooked(false); }}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-border/50 rounded-xl pl-10 pr-4 h-12 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loadingSlots ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <Loader2 className="size-8 text-brand-primary animate-spin" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Buscando horarios...</p>
              </motion.div>
            ) : slots.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl p-8 border border-dashed border-border text-center"
              >
                <Clock className="size-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No hay horarios disponibles para hoy.</p>
                <p className="text-[10px] text-muted-foreground/60 uppercase mt-1">Intentá con otra fecha</p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Horarios disponibles</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedSlot(selectedSlot?.start === slot.start ? null : slot)}
                      className={cn(
                        "relative flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-300 overflow-hidden group",
                        !slot.isAvailable
                          ? "bg-zinc-50 dark:bg-zinc-800/30 text-muted-foreground border-transparent grayscale opacity-50 cursor-not-allowed"
                          : selectedSlot?.start === slot.start
                          ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/30 scale-[1.02]"
                          : "bg-zinc-50 dark:bg-zinc-950/50 border-border/50 hover:border-brand-primary/50 hover:bg-brand-primary/5"
                      )}
                    >
                      <span className="text-xs font-black tabular-nums">{slot.start}</span>
                      <span className="text-[9px] opacity-60 font-bold uppercase tracking-tighter">hasta {slot.end}</span>
                      
                      {!slot.isAvailable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                          <Lock className="size-3 opacity-30" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedSlot && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="space-y-4 border-t border-dashed pt-6"
            >
              <div className="bg-brand-primary/5 rounded-2xl p-4 space-y-2 border border-brand-primary/10">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground uppercase font-black tracking-widest">Resumen</span>
                  <span className="font-bold text-brand-primary uppercase tracking-widest">{selectedDate}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-lg font-black italic tracking-tighter uppercase">{selectedSlot.start} – {selectedSlot.end}</span>
                  <span className="text-2xl font-black text-brand-primary italic tracking-tighter">${finalPrice.toLocaleString("es-CO")}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Notas para el dueño</Label>
                <textarea
                  rows={2}
                  placeholder="Ej: partido de cumpleaños, necesito chalecos…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-border/50 rounded-xl p-4 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all resize-none"
                />
              </div>

              {bookingError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-xs text-red-500 font-bold text-center">{bookingError}</p>
                </div>
              )}

              {!user ? (
                <Link href="/login">
                  <Button className="w-full h-12 rounded-xl bg-brand-primary font-black uppercase tracking-widest text-xs gap-2">
                    Iniciá sesión para reservar
                  </Button>
                </Link>
              ) : (
                <Button 
                  className="w-full h-14 rounded-2xl bg-brand-primary hover:bg-brand-primary/90 text-white font-black uppercase tracking-widest text-sm gap-2 shadow-xl shadow-brand-primary/20 active:scale-[0.98] transition-all" 
                  onClick={handleBook} 
                  disabled={booking}
                >
                  {booking ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Solicitar turno
                      <ChevronRight className="size-5" />
                    </>
                  )}
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
