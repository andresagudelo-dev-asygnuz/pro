import { CheckCircle2, AlertCircle, Building2, MapPin, CalendarCheck, Clock, DollarSign, Phone } from "lucide-react";
import type { FullBooking } from "@/hooks/useMatchDetail";

const STATUS_MAP = {
  pendiente:  { label: "Pendiente de aprobación", color: "text-amber-700 dark:text-amber-300",       bg: "bg-amber-50 dark:bg-amber-950/40",        border: "border-amber-200 dark:border-amber-800",    dot: "bg-amber-500"   },
  confirmada: { label: "Cancha confirmada",        color: "text-emerald-700 dark:text-emerald-300",   bg: "bg-emerald-50 dark:bg-emerald-950/40",     border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  cancelada:  { label: "Reserva cancelada",        color: "text-zinc-500",                            bg: "bg-zinc-50 dark:bg-zinc-800/40",           border: "border-zinc-200 dark:border-zinc-700",      dot: "bg-zinc-400"    },
};

interface Props { canchaBooking: FullBooking }

export function MatchCanchaCard({ canchaBooking }: Props) {
  const s = STATUS_MAP[canchaBooking.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.cancelada;
  const cancha = canchaBooking.canchas;

  return (
    <div className={`rounded-2xl border ${s.border} ${s.bg} overflow-hidden`}>
      <div className={`px-4 py-2.5 flex items-center gap-2.5 border-b ${s.border}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
        <p className={`text-xs font-bold uppercase tracking-wide ${s.color}`}>{s.label}</p>
        {canchaBooking.status === "confirmada" && <CheckCircle2 className="size-3.5 text-emerald-500 ml-auto" />}
        {canchaBooking.status === "pendiente"  && <AlertCircle  className="size-3.5 text-amber-500 ml-auto animate-pulse" />}
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="col-span-2 flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-bold text-foreground">{cancha?.name ?? "Cancha"}</span>
        </div>
        {cancha?.address && (
          <div className="col-span-2 flex items-center gap-2">
            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">{cancha.address}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <CalendarCheck className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-foreground font-medium">{canchaBooking.booking_date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-foreground font-medium">
            {canchaBooking.start_time?.substring(0, 5)} – {canchaBooking.end_time?.substring(0, 5)}
          </span>
        </div>
        {cancha?.price_per_hour != null && (
          <div className="flex items-center gap-2">
            <DollarSign className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground font-medium">${cancha.price_per_hour.toLocaleString("es-CO")}/hora</span>
          </div>
        )}
        {cancha?.phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 text-muted-foreground" />
            <a href={`tel:${cancha.phone}`} className="text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline">
              {cancha.phone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
