import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getCanchaById, getCanchaSchedules, upsertCanchaSchedules, getCanchaBookingsForDate, updateBookingStatus } from "@/lib/canchas/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { DAY_LABELS, type Cancha, type CanchaSchedule, type CanchaBooking } from "@/lib/types/db";
import { toast } from "sonner";

const supabase = createClient();

type ScheduleState = {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_available: boolean;
};

const DEFAULT_SCHEDULE: ScheduleState[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  opens_at: "08:00",
  closes_at: "22:00",
  is_available: i !== 0,
}));

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function CanchaAgendaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState[]>(DEFAULT_SCHEDULE);
  const [loadingCancha, setLoadingCancha] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [bookings, setBookings] = useState<CanchaBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    Promise.all([
      getCanchaById(supabase, id),
      getCanchaSchedules(supabase, id),
    ]).then(([canchaRes, schedRes]) => {
      if (canchaRes.data) setCancha(canchaRes.data);
      if (schedRes.data && schedRes.data.length > 0) {
        const merged = DEFAULT_SCHEDULE.map((def) => {
          const existing = (schedRes.data as CanchaSchedule[]).find(
            (s) => s.day_of_week === def.day_of_week,
          );
          if (!existing) return def;
          return {
            day_of_week: existing.day_of_week,
            opens_at: existing.opens_at.substring(0, 5),
            closes_at: existing.closes_at.substring(0, 5),
            is_available: existing.is_available,
          };
        });
        setSchedule(merged);
      }
      setLoadingCancha(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoadingBookings(true);
    getCanchaBookingsForDate(supabase, id, selectedDate).then(({ data }) => {
      setBookings(data ?? []);
      setLoadingBookings(false);
    });
  }, [id, selectedDate]);

  function updateDay(dayOfWeek: number, field: keyof ScheduleState, value: string | boolean) {
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d)),
    );
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    const { error } = await upsertCanchaSchedules(supabase, id, schedule);
    if (error) toast.error(error);
    else toast.success("Horarios guardados.");
    setSavingSchedule(false);
  }

  async function handleBookingAction(booking: CanchaBooking, action: "confirmada" | "cancelada") {
    const { error } = await updateBookingStatus(supabase, booking.id, action);
    if (error) {
      toast.error(error);
    } else {
      toast.success(action === "confirmada" ? "Reserva confirmada." : "Reserva cancelada.");
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status: action } : b)),
      );
    }
  }

  if (loadingCancha) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cancha || (user && cancha.owner_id !== user.id)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">No tenés permisos para gestionar esta cancha.</p>
        <Link href="/mis-canchas"><Button variant="outline">Mis canchas</Button></Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pendiente: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
    confirmada: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
    cancelada: "bg-muted text-muted-foreground border-transparent",
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-8">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/mis-canchas">
            <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold truncate">{cancha.name} — Agenda</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">

        {/* Horario semanal */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-base">Horario semanal</h2>
          <p className="text-xs text-muted-foreground">
            Configurá los días y rangos horarios en los que tu cancha está disponible para reservas.
          </p>

          <div className="space-y-2">
            {schedule.map((day) => (
              <div
                key={day.day_of_week}
                className={`flex items-center gap-3 rounded-lg p-3 border transition-colors ${
                  day.is_available ? "border-border" : "border-transparent bg-muted/40"
                }`}
              >
                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.is_available}
                    onChange={(e) => updateDay(day.day_of_week, "is_available", e.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  <span className={`text-sm font-medium w-8 ${!day.is_available ? "text-muted-foreground" : ""}`}>
                    {DAY_LABELS[day.day_of_week]}
                  </span>
                </label>

                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={day.opens_at}
                    disabled={!day.is_available}
                    onChange={(e) => updateDay(day.day_of_week, "opens_at", e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-background disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring flex-1"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">a</span>
                  <input
                    type="time"
                    value={day.closes_at}
                    disabled={!day.is_available}
                    onChange={(e) => updateDay(day.day_of_week, "closes_at", e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-background disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring flex-1"
                  />
                </div>
              </div>
            ))}
          </div>

          <Button onClick={saveSchedule} disabled={savingSchedule} className="w-full">
            {savingSchedule ? "Guardando…" : "Guardar horarios"}
          </Button>
        </div>

        {/* Reservas del día */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-base">Reservas</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {loadingBookings ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay reservas para este día.
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {b.start_time.substring(0, 5)} – {b.end_time.substring(0, 5)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${Number(b.total_price).toLocaleString("es-CO")}
                      {b.notes && ` · ${b.notes}`}
                    </p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${statusColors[b.status] || ""}`}>
                      {b.status}
                    </span>
                  </div>
                  {b.status === "pendiente" && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleBookingAction(b, "confirmada")}
                        className="text-green-600 hover:text-green-700"
                        title="Confirmar"
                      >
                        <CheckCircle2 className="size-5" />
                      </button>
                      <button
                        onClick={() => handleBookingAction(b, "cancelada")}
                        className="text-destructive hover:text-destructive/80"
                        title="Cancelar"
                      >
                        <XCircle className="size-5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
