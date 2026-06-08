import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getMyBookings, updateBookingStatus, type BookingWithCancha } from "@/lib/canchas/api";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  SPORT_TYPE_ICONS,
  SPORT_TYPE_LABELS,
} from "@/lib/types/db";
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";


const STATUS_CONFIG: Record<
  string,
  { label: string; Icon: React.ElementType; color: string }
> = {
  pendiente: {
    label: "Pendiente",
    Icon: Clock,
    color:
      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700",
  },
  confirmada: {
    label: "Confirmada",
    Icon: CheckCircle2,
    color:
      "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700",
  },
  cancelada: {
    label: "Cancelada",
    Icon: XCircle,
    color: "text-muted-foreground bg-muted/50 border border-border",
  },
};

function BookingCard({
  booking,
  onCancel,
}: {
  booking: BookingWithCancha;
  onCancel?: () => void;
}) {
  const config = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pendiente;
  const { Icon } = config;
  const cancha = booking.canchas;
  const canCancel = !!onCancel && (booking.status === "pendiente" || booking.status === "confirmada");

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-200 overflow-hidden">
      <Link href={`/canchas/${booking.cancha_id}`}>
        <div className="group p-4 cursor-pointer">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-2xl shrink-0">
                {SPORT_TYPE_ICONS[cancha.sport_type]}
              </div>
              <div>
                <h3 className="font-semibold text-sm group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                  {cancha.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {SPORT_TYPE_LABELS[cancha.sport_type]} · {cancha.city}
                </p>
              </div>
            </div>
            <span
              className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${config.color}`}
            >
              <Icon className="size-3" />
              {config.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              📅{" "}
              {new Date(booking.booking_date + "T12:00:00").toLocaleDateString(
                "es-CO",
                { weekday: "short", day: "numeric", month: "short" },
              )}
            </span>
            <span>
              ⏰ {booking.start_time.substring(0, 5)}–
              {booking.end_time.substring(0, 5)}
            </span>
            <span className="font-semibold text-violet-600 dark:text-violet-400">
              ${Number(booking.total_price).toLocaleString("es-CO")}
            </span>
          </div>
          {booking.notes && (
            <p className="text-xs text-muted-foreground mt-2 bg-muted/40 rounded-lg px-3 py-2">
              📝 {booking.notes}
            </p>
          )}
        </div>
      </Link>

      {canCancel && (
        <div className="px-4 pb-4 -mt-1">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl border border-border/60"
              >
                <XCircle className="size-3.5 mr-1.5" />
                Cancelar reserva
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
                <AlertDialogDescription>
                  La reserva en <strong>{cancha.name}</strong> quedará cancelada.
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Mantener</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={onCancel}
                >
                  Cancelar reserva
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

export default function MisReservasPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithCancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getMyBookings(supabase, user.id).then(({ data, error }) => {
      if (error) setError(error);
      else setBookings(data ?? []);
      setLoading(false);
    });
  }, [user]);

  async function handleCancel(bookingId: string) {
    const { error: cancelErr } = await updateBookingStatus(supabase, bookingId, "cancelada");
    if (cancelErr) {
      toast.error("Error al cancelar la reserva.");
    } else {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelada" } : b))
      );
      toast.success("Reserva cancelada.");
    }
  }

  const active = bookings.filter((b) => b.status !== "cancelada");
  const cancelled = bookings.filter((b) => b.status === "cancelada");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader title="Mis Reservas" backHref="/perfil" />

      <main className="container mx-auto px-4 py-4 max-w-2xl space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-sm border border-destructive/20">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Building2 className="size-7 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                No tenés reservas aún
              </p>
              <p className="text-sm text-muted-foreground">
                Reservá una cancha desde el catálogo.
              </p>
            </div>
            <Link href="/canchas">
              <Button size="sm" className="rounded-xl">
                Ver canchas
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Activas · {active.length}
                </p>
                <div className="flex flex-col gap-3">
                  {active.map((b) => (
                    <BookingCard key={b.id} booking={b} onCancel={() => handleCancel(b.id)} />
                  ))}
                </div>
              </section>
            )}
            {cancelled.length > 0 && (
              <section className="opacity-60">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Canceladas · {cancelled.length}
                </p>
                <div className="flex flex-col gap-3">
                  {cancelled.map((b) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
