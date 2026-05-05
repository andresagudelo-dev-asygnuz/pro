import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getMyCanchas } from "@/lib/canchas/api";
import { getCanchaStats, type CanchaStats, type StatsPeriod } from "@/lib/canchas/stats-api";
import { AppLayout } from "@/components/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import {
  BarChart2, Star, ArrowRight, TrendingUp, Building2, Plus,
  CheckCircle2, XCircle, Clock, ChevronRight,
} from "lucide-react";
import { SPORT_TYPE_ICONS } from "@/lib/types/db";
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

interface CanchaWithStats {
  cancha: Cancha;
  stats: CanchaStats | null;
}

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [rows, setRows]     = useState<CanchaWithStats[]>([]);
  const [period, setPeriod] = useState<StatsPeriod>("month");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: canchas } = await getMyCanchas(supabase, user.id);
    if (!canchas || canchas.length === 0) { setRows([]); setLoading(false); return; }

    const statsResults = await Promise.all(
      canchas.map(c => getCanchaStats(supabase, c.id, period)),
    );

    setRows(canchas.map((c, i) => ({ cancha: c, stats: statsResults[i].data })));
    setLoading(false);
  }, [user, period]);

  useEffect(() => { load(); }, [load]);

  // ── Aggregated KPIs ──
  const totalRevenue   = rows.reduce((s, r) => s + (r.stats?.revenue           ?? 0), 0);
  const totalBookings  = rows.reduce((s, r) => s + (r.stats?.total_bookings    ?? 0), 0);
  const totalConfirmed = rows.reduce((s, r) => s + (r.stats?.confirmed         ?? 0), 0);
  const totalCancelled = rows.reduce((s, r) => s + (r.stats?.cancelled         ?? 0), 0);
  const totalPending   = rows.reduce((s, r) => s + (r.stats?.pending           ?? 0), 0);
  const avgCancel      = totalBookings > 0 ? Math.round((totalCancelled / totalBookings) * 100) : 0;
  const activeCanchas  = rows.filter(r => r.cancha.is_active).length;

  const sorted    = [...rows].sort((a, b) => (b.stats?.revenue ?? 0) - (a.stats?.revenue ?? 0));
  const starRow   = sorted[0] ?? null;
  const maxRevenue = Math.max(1, ...rows.map(r => r.stats?.revenue ?? 0));

  // Global top clients (merge across canchas)
  const globalClientMap = new Map<string, {
    full_name: string | null; username: string | null; avatar_url: string | null;
    total: number; revenue: number; cancelled: number;
  }>();
  for (const { stats } of rows) {
    for (const c of (stats?.top_clients ?? [])) {
      if (!globalClientMap.has(c.user_id)) {
        globalClientMap.set(c.user_id, { full_name: c.full_name, username: c.username, avatar_url: c.avatar_url, total: 0, revenue: 0, cancelled: 0 });
      }
      const gc = globalClientMap.get(c.user_id)!;
      gc.total    += c.total;
      gc.revenue  += c.revenue;
      gc.cancelled += c.cancelled;
    }
  }
  const globalTopClients = [...globalClientMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([uid, c]) => ({ user_id: uid, ...c }));

  // Global popular slots (sum counts)
  const globalSlotMap = new Map<string, number>();
  for (const { stats } of rows) {
    for (const s of (stats?.popular_slots ?? [])) {
      globalSlotMap.set(s.start_time, (globalSlotMap.get(s.start_time) ?? 0) + s.count);
    }
  }
  const globalSlots = [...globalSlotMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([start_time, count]) => ({ start_time, count }))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const maxSlot = Math.max(1, ...globalSlots.map(s => s.count));

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl mx-auto space-y-5 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart2 className="size-6 text-violet-600" />
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Vista consolidada de todas tus canchas.</p>
          </div>
          <Link href="/mis-canchas">
            <button className="flex items-center gap-1.5 text-sm text-violet-600 hover:underline">
              <Building2 className="size-3.5" /> Panel
            </button>
          </Link>
        </div>

        {/* Period */}
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

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-14 border border-border/60 rounded-2xl bg-muted/10">
            <p className="text-5xl mb-4">🏟️</p>
            <p className="text-sm text-muted-foreground mb-4">Registrá tu primera cancha para ver el dashboard.</p>
            <Link href="/canchas/nueva">
              <button className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
                <Plus className="size-4 inline mr-1.5" /> Nueva cancha
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Master KPIs ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatMoney(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ingresos</p>
                <p className="text-[10px] text-muted-foreground mt-1">confirmados</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <p className="text-xl sm:text-2xl font-bold text-violet-600">{totalBookings}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Reservas</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] text-green-600 flex items-center gap-0.5"><CheckCircle2 className="size-2.5" />{totalConfirmed}</span>
                  {totalPending > 0 && <span className="text-[10px] text-amber-500 flex items-center gap-0.5"><Clock className="size-2.5" />{totalPending}</span>}
                  {totalCancelled > 0 && <span className="text-[10px] text-red-400 flex items-center gap-0.5"><XCircle className="size-2.5" />{totalCancelled}</span>}
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <p className={`text-xl sm:text-2xl font-bold ${avgCancel > 20 ? "text-red-500" : avgCancel > 10 ? "text-amber-500" : "text-green-600"}`}>
                  {avgCancel}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Cancelaciones</p>
                <p className="text-[10px] text-muted-foreground mt-1">{totalCancelled} en total</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{activeCanchas}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Canchas activas</p>
                <p className="text-[10px] text-muted-foreground mt-1">de {rows.length} total</p>
              </div>
            </div>

            {/* ── Star Cancha ── */}
            {starRow && (starRow.stats?.revenue ?? 0) > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 border border-amber-200 dark:border-amber-700/60 rounded-2xl p-4 flex items-center gap-4">
                <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 text-xl">
                  {SPORT_TYPE_ICONS[starRow.cancha.sport_type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-amber-600 mb-0.5">
                    <Star className="size-3.5 fill-amber-500" />
                    <span className="text-[11px] font-semibold">Mejor cancha del período</span>
                  </div>
                  <p className="font-bold truncate">{starRow.cancha.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(starRow.stats?.revenue ?? 0)} · {starRow.stats?.total_bookings} reservas
                  </p>
                </div>
                <Link href={`/canchas/${starRow.cancha.id}/stats`}>
                  <button className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline shrink-0 font-medium">
                    Detalle <ArrowRight className="size-3" />
                  </button>
                </Link>
              </div>
            )}

            {/* ── Per-cancha comparison ── */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div>
                  <h3 className="text-sm font-semibold">Comparativa de canchas</h3>
                  <p className="text-[11px] text-muted-foreground">{PERIOD_LABELS[period]}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{rows.length} canchas</span>
              </div>
              <div className="divide-y divide-border/30">
                {sorted.map(({ cancha, stats }, idx) => (
                  <Link key={cancha.id} href={`/canchas/${cancha.id}/stats`}>
                    <div className="px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {idx === 0 && (stats?.revenue ?? 0) > 0 && (
                            <Star className="size-3.5 text-amber-500 fill-amber-400 shrink-0" />
                          )}
                          <span className="text-sm shrink-0">{SPORT_TYPE_ICONS[cancha.sport_type]}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{cancha.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {stats?.total_bookings ?? 0} reservas
                              {(stats?.cancellation_rate ?? 0) > 0 && (
                                <span className={`ml-2 ${(stats?.cancellation_rate ?? 0) > 20 ? "text-red-400" : "text-amber-400"}`}>
                                  ✗{stats?.cancellation_rate}%
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!cancha.is_active && (
                            <span className="text-[10px] text-muted-foreground border border-border/60 rounded-full px-1.5 py-0.5">Inactiva</span>
                          )}
                          <span className="text-sm font-bold text-emerald-600">{formatMoney(stats?.revenue ?? 0)}</span>
                          <ChevronRight className="size-3.5 text-muted-foreground" />
                        </div>
                      </div>
                      {/* Revenue bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${idx === 0 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-violet-500 to-violet-400"}`}
                            style={{ width: `${Math.max(2, ((stats?.revenue ?? 0) / maxRevenue) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">
                          {maxRevenue > 0 ? `${Math.round(((stats?.revenue ?? 0) / maxRevenue) * 100)}%` : "—"}
                        </span>
                      </div>
                      {/* Mini breakdown */}
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-[10px] text-green-600">✓ {stats?.confirmed ?? 0}</span>
                        {(stats?.pending ?? 0) > 0 && <span className="text-[10px] text-amber-500">⏳ {stats?.pending}</span>}
                        {(stats?.cancelled ?? 0) > 0 && <span className="text-[10px] text-red-400">✗ {stats?.cancelled}</span>}
                        <span className="text-[10px] text-muted-foreground ml-auto">{stats?.top_clients.length ?? 0} clientes</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* ── Global top clients ── */}
            {globalTopClients.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40">
                  <h3 className="text-sm font-semibold">Mejores clientes</h3>
                  <p className="text-[11px] text-muted-foreground">Consolidado de todas tus canchas</p>
                </div>
                <div className="divide-y divide-border/30">
                  {globalTopClients.map((c, i) => (
                    <Link key={c.user_id} href={`/profile/${c.user_id}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                        <span className={`text-sm font-bold w-5 text-center ${
                          i === 0 ? "text-amber-500" : i === 1 ? "text-zinc-400" : i === 2 ? "text-amber-700 dark:text-amber-600" : "text-muted-foreground"
                        }`}>{i + 1}</span>
                        <Avatar className="size-8 shrink-0">
                          {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                          <AvatarFallback className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                            {initialsFromName(c.full_name ?? c.username ?? null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.full_name ?? c.username ?? "Usuario"}</p>
                          <p className="text-[11px] text-muted-foreground">{c.total} reservas · {formatMoney(c.revenue)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <TrendingUp className="size-3.5 text-violet-500 inline" />
                          {c.cancelled > 0 && (
                            <p className="text-[10px] text-red-400 mt-0.5">✗{c.cancelled}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Popular slots (global) ── */}
            {globalSlots.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4">
                <h3 className="text-sm font-semibold mb-3">Horarios más demandados (todas las canchas)</h3>
                <div className="space-y-2">
                  {globalSlots.map(slot => (
                    <div key={slot.start_time} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">{slot.start_time}</span>
                      <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
                          style={{ width: `${(slot.count / maxSlot) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-violet-600 w-6 text-right shrink-0">{slot.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
