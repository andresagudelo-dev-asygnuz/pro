import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { getCanchaById } from "@/lib/canchas/api";
import { getCanchaStats, type CanchaStats, type StatsPeriod } from "@/lib/canchas/stats-api";
import { CanchaOwnerTabs } from "@/components/CanchaOwnerTabs";
import { BottomNav } from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import type { Cancha } from "@/lib/types/db";

const supabase = createClient();

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  week:  "Esta semana",
  month: "Este mes",
  year:  "Este año",
};

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return "$" + n.toLocaleString("es-CO");
}

function formatDateShort(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export default function CanchaStatsPage() {
  const { id } = useParams<{ id: string }>();
  const [cancha, setCancha]   = useState<Cancha | null>(null);
  const [stats, setStats]     = useState<CanchaStats | null>(null);
  const [period, setPeriod]   = useState<StatsPeriod>("month");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [canchaRes, statsRes] = await Promise.all([
      getCanchaById(supabase, id),
      getCanchaStats(supabase, id, period),
    ]);
    if (canchaRes.data) setCancha(canchaRes.data);
    setStats(statsRes.data);
    setLoading(false);
  }, [id, period]);

  useEffect(() => { load(); }, [load]);

  const maxSlotCount = Math.max(1, ...(stats?.popular_slots.map(s => s.count) ?? []));
  const maxDayRevenue = Math.max(1, ...(stats?.daily_summary.map(d => d.revenue) ?? []));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <CanchaOwnerTabs canchaId={id!} canchaName={cancha?.name} />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Period selector */}
        <div className="flex gap-2">
          {(["week","month","year"] as StatsPeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                period === p
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : "bg-white dark:bg-zinc-900 border-border/60 text-muted-foreground hover:border-violet-400"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {!stats || stats.total_bookings === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-5xl mb-4">📊</p>
            <p className="text-sm">Sin reservas en {PERIOD_LABELS[period].toLowerCase()}.</p>
          </div>
        ) : (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <p className="text-2xl font-bold text-violet-600">{stats.total_bookings}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total reservas</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] text-green-600 font-medium">✓ {stats.confirmed} conf.</span>
                  <span className="text-[10px] text-amber-500 font-medium">⏳ {stats.pending} pend.</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <p className="text-2xl font-bold text-emerald-600">{formatMoney(stats.revenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ingresos confirmados</p>
                {stats.total_bookings > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Prom. {formatMoney(Math.round(stats.revenue / Math.max(1, stats.confirmed)))} / reserva
                  </p>
                )}
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <p className={`text-2xl font-bold ${stats.cancellation_rate > 20 ? "text-red-500" : stats.cancellation_rate > 10 ? "text-amber-500" : "text-green-600"}`}>
                  {stats.cancellation_rate}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Tasa cancelación</p>
                <p className="text-[10px] text-muted-foreground mt-2">{stats.cancelled} canceladas</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <p className="text-2xl font-bold text-blue-600">{stats.top_clients.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Clientes únicos</p>
                {stats.top_clients[0] && (
                  <p className="text-[10px] text-muted-foreground mt-2 truncate">
                    Top: {stats.top_clients[0].full_name ?? stats.top_clients[0].username ?? "—"}
                  </p>
                )}
              </div>
            </div>

            {/* Top clientes */}
            {stats.top_clients.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40">
                  <h3 className="text-sm font-semibold">Top clientes</h3>
                  <p className="text-[11px] text-muted-foreground">{PERIOD_LABELS[period]}</p>
                </div>
                <div className="divide-y divide-border/30">
                  {stats.top_clients.map((c, i) => (
                    <Link key={c.user_id} href={`/profile/${c.user_id}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                        <span className={`text-sm font-bold w-5 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-zinc-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                          {i + 1}
                        </span>
                        <Avatar className="size-8 shrink-0">
                          {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                          <AvatarFallback className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-700">
                            {initialsFromName(c.full_name ?? c.username ?? null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.full_name ?? c.username ?? "Usuario"}</p>
                          <p className="text-[11px] text-muted-foreground">{c.total} reservas · {formatMoney(c.revenue)}</p>
                        </div>
                        {c.cancelled > 0 && (
                          <span className="text-[10px] text-red-400">✗{c.cancelled}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Horarios populares */}
            {stats.popular_slots.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <h3 className="text-sm font-semibold mb-3">Horarios más reservados</h3>
                <div className="space-y-2">
                  {stats.popular_slots.map(slot => (
                    <div key={slot.start_time} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">{slot.start_time}</span>
                      <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all"
                          style={{ width: `${(slot.count / maxSlotCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-violet-600 w-6 text-right shrink-0">{slot.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actividad diaria */}
            {stats.daily_summary.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <h3 className="text-sm font-semibold mb-3">Actividad por día</h3>
                <div className="space-y-2">
                  {stats.daily_summary.map(day => (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground w-16 shrink-0">{formatDateShort(day.date)}</span>
                      <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                          style={{ width: day.revenue > 0 ? `${(day.revenue / maxDayRevenue) * 100}%` : "4%" }}
                        />
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-emerald-600">{formatMoney(day.revenue)}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({day.total})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
