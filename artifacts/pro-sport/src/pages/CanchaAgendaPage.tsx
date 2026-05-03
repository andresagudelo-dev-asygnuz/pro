import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  getCanchaById,
  getCanchaSchedules,
  upsertCanchaSchedules,
  getCanchaBookingsForDate,
  updateBookingStatus,
} from "@/lib/canchas/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, Pencil, Users } from "lucide-react";
import {
  DAY_LABELS,
  type Cancha,
  type CanchaSchedule,
  type CanchaBooking,
  type Profile,
} from "@/lib/types/db";
import { initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const STATUS_CONFIG = {
  pendiente: {
    label: "Pendiente",
    style:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  },
  confirmada: {
    label: "Confirmada",
    style:
      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
  },
  cancelada: {
    label: "Cancelada",
    style: "bg-muted text-muted-foreground border-transparent",
  },
};

export default function CanchaAgendaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState[]>(DEFAULT_SCHEDULE);
  const [loadingCancha, setLoadingCancha] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [bookings, setBookings] = useState<CanchaBooking[]>([]);
  const [bookerProfiles, setBookerProfiles] = useState<Map<string, Profile>>(
    new Map(),
  );
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
    getCanchaBookingsForDate(supabase, id, selectedDate).then(
      async ({ data }) => {
        const bks = data ?? [];
        setBookings(bks);

        const ids = [...new Set(bks.map((b) => b.booked_by))].filter(Boolean);
        if (ids.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", ids);
          const map = new Map<string, Profile>();
          ((profiles ?? []) as Profile[]).forEach((p) => map.set(p.id, p));
          setBookerProfiles(map);
        } else {
          setBookerProfiles(new Map());
        }
        setLoadingBookings(false);
      },
    );
  }, [id, selectedDate]);

  function updateDay(
    dayOfWeek: number,
    field: keyof ScheduleState,
    value: string | boolean,
  ) {
    setSchedule((prev) =>
      prev.map((d) =>
        d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d,
      ),
    );
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    const { error } = await upsertCanchaSchedules(supabase, id, schedule);
    if (error) toast.error(error);
    else toast.success("Horarios guardados.");
    setSavingSchedule(false);
  }

  async function handleBookingAction(
    booking: CanchaBooking,
    action: "confirmada" | "cancelada",
  ) {
    const { error } = await updateBookingStatus(supabase, booking.id, action);
    if (error) {
      toast.error(error);
    } else {
      toast.success(
        action === "confirmada" ? "Reserva confirmada." : "Reserva cancelada.",
      );
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, status: action } : b,
        ),
      );
    }
  }

  if (loadingCancha) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cancha || (user && cancha.owner_id !== user.id)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">
          No tenés permisos para gestionar esta cancha.
        </p>
        <Link href="/mis-canchas">
          <Button variant="outline">Mis canchas</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-8">
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/mis-canchas">
            <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="size-4" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">{cancha.name}</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Agenda y horarios</p>
          </div>
          <Link href={`/canchas/${id}/editar`}>
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
              <Pencil className="size-3.5" /> Editar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 max-w-2xl space-y-5">
        {/* Horario semanal */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-5 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-base">Horario semanal</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configurá los días y rangos horarios disponibles para reservas.
            </p>
          </div>

          <div className="space-y-2">
            {schedule.map((day) => (
              <div
                key={day.day_of_week}
                className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                  day.is_available
                    ? "border-border/60 bg-background"
                    : "border-transparent bg-muted/40"
                }`}
              >
                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.is_available}
                    onChange={(e) =>
                      updateDay(
                        day.day_of_week,
                        "is_available",
                        e.target.checked,
                      )
                    }
                    className="size-4 rounded border-input accent-violet-600"
                  />
                  <span
                    className={`text-sm font-medium w-8 ${!day.is_available ? "text-muted-foreground" : ""}`}
                  >
                    {DAY_LABELS[day.day_of_week]}
                  </span>
                </label>

                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={day.opens_at}
                    disabled={!day.is_available}
                    onChange={(e) =>
                      updateDay(day.day_of_week, "opens_at", e.target.value)
                    }
                    className="border border-border/60 rounded-lg px-2 py-1.5 text-sm bg-background disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">
                    a
                  </span>
                  <input
                    type="time"
                    value={day.closes_at}
                    disabled={!day.is_available}
                    onChange={(e) =>
                      updateDay(day.day_of_week, "closes_at", e.target.value)
                    }
                    className="border border-border/60 rounded-lg px-2 py-1.5 text-sm bg-background disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={saveSchedule}
            disabled={savingSchedule}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-700"
          >
            {savingSchedule ? "Guardando…" : "Guardar horarios"}
          </Button>
        </div>

        {/* Reservas del día */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-base">Reservas del día</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Seleccioná una fecha para ver y gestionar reservas.
              </p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-border/60 rounded-xl px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {loadingBookings ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-6">
              <Users className="size-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay reservas para este día.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const booker = bookerProfiles.get(b.booked_by);
                const cfg =
                  STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pendiente;
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 border border-border/60 rounded-xl p-3.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Booker avatar */}
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                          {initialsFromName(
                            booker?.full_name ?? booker?.username ?? null,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {booker?.full_name ??
                            booker?.username ??
                            "Usuario desconocido"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.start_time.substring(0, 5)} –{" "}
                          {b.end_time.substring(0, 5)} ·{" "}
                          <span className="font-medium text-violet-600 dark:text-violet-400">
                            ${Number(b.total_price).toLocaleString("es-CO")}
                          </span>
                        </p>
                        {b.notes && (
                          <p className="text-xs text-muted-foreground truncate">
                            📝 {b.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.style}`}
                      >
                        {cfg.label}
                      </span>
                      {b.status === "pendiente" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleBookingAction(b, "confirmada")}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Confirmar"
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleBookingAction(b, "cancelada")}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                            title="Cancelar"
                          >
                            <XCircle className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
