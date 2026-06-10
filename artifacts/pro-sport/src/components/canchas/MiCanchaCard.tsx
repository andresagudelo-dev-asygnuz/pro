import { Link } from "wouter";
import {
  Calendar, Pencil, Users, BarChart2, Shield, ChevronRight, MapPin, Zap, Power,
} from "lucide-react";
import { SPORT_TYPE_LABELS, SPORT_TYPE_ICONS, type Cancha } from "@/lib/types/db";

const SPORT_GRADIENTS: Record<string, string> = {
  futbol_11:   "from-green-600 to-green-800",
  futbol_9:    "from-green-500 to-emerald-700",
  futbol_5:    "from-emerald-500 to-teal-700",
  futbol_sala: "from-teal-500 to-cyan-700",
  padel:       "from-violet-600 to-purple-800",
  tenis:       "from-yellow-500 to-amber-700",
  basket:      "from-orange-500 to-red-700",
  voleibol:    "from-blue-500 to-indigo-700",
  otro:        "from-zinc-500 to-zinc-700",
};

interface MiCanchaCardProps {
  cancha: Cancha;
  pendingCount: number;
  isToggling: boolean;
  onToggleActive: (cancha: Cancha) => void;
}

export function MiCanchaCard({ cancha: c, pendingCount: cPending, isToggling, onToggleActive }: MiCanchaCardProps) {
  const gradient = SPORT_GRADIENTS[c.sport_type] ?? SPORT_GRADIENTS.otro;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm overflow-hidden border border-border/50">
      {/* Sport color band */}
      <div className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{SPORT_TYPE_ICONS[c.sport_type]}</span>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{c.name}</p>
            <p className="text-white/70 text-xs">{SPORT_TYPE_LABELS[c.sport_type]}</p>
          </div>
        </div>
        {/* Active toggle */}
        <button
          onClick={() => onToggleActive(c)}
          disabled={isToggling}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors shrink-0 ${
            c.is_active
              ? "bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30"
              : "bg-white/10 text-white/60 hover:bg-white/20"
          }`}
        >
          {isToggling ? (
            <div className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Power className="size-3" />
          )}
          {c.is_active ? "Activa" : "Inactiva"}
        </button>
      </div>

      {/* Card body */}
      <div className="px-4 py-3">
        {/* Location + price row */}
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {c.city}
            {c.address && <span className="truncate max-w-[120px]"> · {c.address}</span>}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-violet-600 dark:text-violet-400">
              ${c.price_per_hour.toLocaleString("es-CO")}<span className="font-normal text-xs text-muted-foreground">/h</span>
            </span>
            {c.discount_percent > 0 && (
              <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                -{c.discount_percent}%
              </span>
            )}
          </div>
        </div>

        {/* Pending alert for this cancha */}
        {cPending > 0 && (
          <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl">
            <Zap className="size-3 shrink-0" />
            {cPending} reserva{cPending > 1 ? "s" : ""} pendiente{cPending > 1 ? "s" : ""} de confirmación
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/canchas/${c.id}/agenda`}>
            <button className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-center w-full transition-colors text-xs font-semibold ${
              cPending > 0
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}>
              <Calendar className="size-4" />
              Agenda
              {cPending > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm">
                  {cPending}
                </span>
              )}
            </button>
          </Link>
          <Link href={`/canchas/${c.id}/clientes`}>
            <button className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl w-full bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold">
              <Users className="size-4" />
              Clientes
            </button>
          </Link>
        </div>

        {/* Edit full-width */}
        <Link href={`/canchas/${c.id}/editar`}>
          <button className="mt-1.5 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Pencil className="size-3.5" /> Editar cancha
            </div>
            <ChevronRight className="size-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}
