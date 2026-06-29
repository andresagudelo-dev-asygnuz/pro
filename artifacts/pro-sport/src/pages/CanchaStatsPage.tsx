import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getCanchaById } from "@/lib/canchas/api";
import { CanchaOwnerTabs } from "@/components/CanchaOwnerTabs";
import { BarChart2, TrendingUp, Clock, DollarSign } from "lucide-react";

export default function CanchaStatsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: cancha } = useQuery({
    queryKey: ["cancha", id],
    queryFn: () => getCanchaById(supabase, id!).then((r) => r.data),
    enabled: !!id,
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <CanchaOwnerTabs canchaId={id!} canchaName={cancha?.name} />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Coming soon banner */}
        <div className="rounded-2xl border border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10 p-8 text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30">
              <BarChart2 className="size-7 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <h2 className="text-lg font-bold mb-2">Estadísticas — Próximamente</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Aquí verás métricas detalladas de tu cancha: ingresos, ocupación, horas pico y rendimiento por período.
          </p>
        </div>

        {/* Preview cards (illustrative) */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: DollarSign,  label: "Ingresos del mes",   value: "—",   sub: "Liquidaciones pendientes" },
            { icon: TrendingUp,  label: "Ocupación promedio", value: "—",   sub: "% de slots usados" },
            { icon: Clock,       label: "Hora pico",          value: "—",   sub: "Franja con más reservas" },
            { icon: BarChart2,   label: "Reservas totales",   value: "—",   sub: "Últimos 30 días" },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div
              key={label}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-4 opacity-50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="size-4 text-violet-500 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{label}</span>
              </div>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
