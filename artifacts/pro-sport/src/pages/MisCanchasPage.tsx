import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SUPABASE_DB_SCHEMA } from "@/lib/supabase/schema";
import { useAuth } from "@/context/AuthContext";
import {
  getMyCanchas,
  updateCancha,
  getOwnerPendingBookings,
  assignCanchaToVenue,
} from "@/lib/canchas/api";
import { getVenueByOwner } from "@/lib/venues/api";
import { Button } from "@/components/ui/button";
import { type Cancha } from "@/lib/types/db";
import { MiCanchaCard } from "@/components/canchas/MiCanchaCard";
import {
  Plus,
  Bell,
  Shield,
  BarChart2,
  ChevronRight,
  Building2,
  MapPin,
  ExternalLink,
  Link2,
} from "lucide-react";
import { toast } from "sonner";


function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function MisCanchasPage() {
  const { user, roles } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingCancha, setTogglingCancha] = useState<string | null>(null);
  const [assigningCancha, setAssigningCancha] = useState<string | null>(null);

  const { data: venue, isLoading: loadingVenue } = useQuery({
    queryKey: ["owner-venue", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await getVenueByOwner(supabase, user.id);
      return data ?? null;
    },
    enabled: !!user,
  });

  const { data: canchas = [], isLoading: loadingCanchas, error: errorCanchas } = useQuery({
    queryKey: ["owner-canchas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await getMyCanchas(supabase, user.id);
      if (error) throw new Error(error);
      return data ?? [];
    },
    enabled: !!user
  });

  const { data: pending = [] } = useQuery({
    queryKey: ["owner-pending-bookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await getOwnerPendingBookings(supabase, user.id);
      if (error) throw new Error(error);
      return data ?? [];
    },
    enabled: !!user
  });

  const loading = loadingCanchas || loadingVenue;
  const error = errorCanchas ? (errorCanchas as Error).message : null;

  useEffect(() => {
    if (!user || canchas.length === 0) return;
    const canchaIds = canchas.map((c) => c.id);
    const channel = supabase
      .channel(`owner-bookings-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: SUPABASE_DB_SCHEMA, table: "cancha_bookings" },
        (payload: { new: { cancha_id: string; status: string } }) => {
          if (!canchaIds.includes(payload.new.cancha_id)) return;
          if (payload.new.status !== "pendiente") return;
          queryClient.invalidateQueries({ queryKey: ["owner-pending-bookings", user.id] });
          toast.info("¡Nueva reserva pendiente!", { icon: "🏟️" });
        })
      .on("postgres_changes", { event: "UPDATE", schema: SUPABASE_DB_SCHEMA, table: "cancha_bookings" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["owner-pending-bookings", user.id] });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, canchas, queryClient]);

  async function handleAssignToVenue(canchaId: string) {
    if (!venue) return;
    setAssigningCancha(canchaId);
    const { error } = await assignCanchaToVenue(supabase, canchaId, venue.id);
    if (error) {
      toast.error("No se pudo asignar la cancha al centro.");
    } else {
      queryClient.setQueryData(["owner-canchas", user?.id], (old: Cancha[] | undefined) => {
        if (!old) return old;
        return old.map(c => c.id === canchaId ? { ...c, venue_id: venue.id } : c);
      });
      toast.success(`Cancha asignada a ${venue.name} ✓`);
    }
    setAssigningCancha(null);
  }

  async function toggleActive(cancha: Cancha) {
    setTogglingCancha(cancha.id);
    const { error } = await updateCancha(supabase, cancha.id, { is_active: !cancha.is_active });
    if (error) {
      toast.error("No se pudo actualizar.");
    } else {
      queryClient.setQueryData(["owner-canchas", user?.id], (old: Cancha[] | undefined) => {
        if (!old) return old;
        return old.map(c => c.id === cancha.id ? { ...c, is_active: !c.is_active } : c);
      });
      toast.success(cancha.is_active ? "Cancha desactivada." : "¡Cancha activada!");
    }
    setTogglingCancha(null);
  }

  if (!roles?.is_cancha && !loading) {
    return (
      <>
        <div className="container py-8 max-w-lg mx-auto">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">Rol de Cancha no activado</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
              Necesitás activar el rol de Administrador de Cancha para registrar y gestionar tus canchas.
            </p>
            <Button className="rounded-xl" onClick={() => setLocation("/perfil")}>Ir a mi perfil</Button>
          </div>
        </div>
      </>
    );
  }

  const today = todayStr();
  const todayPending = pending.filter((b) => b.booking_date === today).length;
  const filteredCanchas = canchas.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const unlinkedCount = venue ? canchas.filter(c => c.venue_id !== venue.id).length : 0;

  return (
    <>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="pt-6 pb-4 px-4 w-full">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">Panel Principal</h1>
              <p className="text-muted-foreground text-xs mt-1">Gestión de centro deportivo</p>
            </div>
            <Link href="/canchas/nueva">
              <Button size="sm" className="rounded-xl gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-white shadow-sm">
                <Plus className="size-3.5" /> Nueva cancha
              </Button>
            </Link>
          </div>

          {/* ── Mi Centro Deportivo ──────────────────────────────── */}
          {loadingVenue ? (
            <div className="h-28 bg-white dark:bg-zinc-900 rounded-2xl animate-pulse mb-5 border border-border/40" />
          ) : venue ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden mb-5">
              <div
                className="h-20 relative bg-gradient-to-r from-violet-600 to-purple-800"
                style={venue.banner_url ? { backgroundImage: `url(${venue.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              >
                <div className="absolute inset-0 bg-black/25" />
                {venue.logo_url && (
                  <img
                    src={venue.logo_url}
                    alt={venue.name}
                    className="absolute bottom-0 translate-y-1/2 left-4 size-12 rounded-xl border-2 border-white dark:border-zinc-900 object-cover shadow-lg"
                  />
                )}
                <span className="absolute top-2.5 left-3 text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                  Mi Centro Deportivo
                </span>
              </div>
              <div className={`px-4 py-3 flex items-center justify-between gap-3 ${venue.logo_url ? "pt-7" : ""}`}>
                <div className="min-w-0">
                  <p className="font-bold text-base text-zinc-900 dark:text-white truncate">{venue.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 shrink-0" />
                    {venue.city}
                    <span className="mx-1">·</span>
                    {canchas.length} cancha{canchas.length !== 1 ? "s" : ""}
                    {unlinkedCount > 0 && (
                      <span className="ml-1 text-amber-500 font-medium">({unlinkedCount} sin asignar)</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/venues/${venue.id}`}>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-xl px-2.5 py-1.5 transition-colors">
                      <ExternalLink className="size-3" /> Ver
                    </button>
                  </Link>
                  <Link href="/mis-canchas/centro">
                    <button className="flex items-center gap-1 text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl px-3 py-1.5 transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-100">
                      Editar
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/mis-canchas/centro">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-violet-300 dark:border-violet-800 p-5 flex items-center gap-4 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors cursor-pointer mb-5 group">
                <div className="size-12 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center shrink-0">
                  <Building2 className="size-6 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-white">Crear Centro Deportivo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Registrá tu sede y agrupá tus canchas bajo una identidad.</p>
                </div>
                <ChevronRight className="size-5 text-violet-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )}

          {/* ── Quick Access ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Link href="/mis-canchas/dashboard">
              <button className="w-full flex items-center gap-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-3.5 rounded-2xl transition-all shadow-sm border border-border/60">
                <div className="size-9 rounded-full border border-border flex items-center justify-center shrink-0">
                  <BarChart2 className="size-4 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">Estadísticas</p>
                  <p className="text-xs text-muted-foreground">Finanzas y uso</p>
                </div>
              </button>
            </Link>
            <Link href="/mis-canchas/equipo">
              <button className="w-full flex items-center gap-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-3.5 rounded-2xl transition-all shadow-sm border border-border/60">
                <div className="size-9 rounded-full border border-border flex items-center justify-center shrink-0">
                  <Shield className="size-4 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">Equipo</p>
                  <p className="text-xs text-muted-foreground">Colaboradores</p>
                </div>
              </button>
            </Link>
          </div>

          {/* ── Bookings banner ─────────────────────────── */}
          {(pending.length > 0 || canchas.length > 0) && (
            <Link href="/mis-canchas/reservas">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer group mb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full border border-border flex items-center justify-center shrink-0">
                      <Bell className="size-4 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                        Reservas de Sedes
                        {todayPending > 0 && (
                          <span className="text-[10px] font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {todayPending} HOY
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pending.length > 0 ? `Tienes ${pending.length} reserva(s) esperando confirmación.` : "Gestionar reservas pendientes, próximas y canceladas."}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* ── Canchas list ──────────────────────────────────────────────── */}
        <div className="px-4 pb-28 space-y-4 w-full">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-sm">{error}</div>
          ) : canchas.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-2xl bg-white dark:bg-zinc-900">
              <p className="text-5xl mb-4">🏟️</p>
              <p className="font-semibold text-zinc-900 dark:text-white mb-1">Sin canchas registradas</p>
              <p className="text-sm text-muted-foreground mb-5">Registrá tu primera cancha para empezar a recibir reservas.</p>
              <Link href="/canchas/nueva">
                <button className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-colors">
                  + Registrar cancha
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-1 mb-4">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                  {venue ? `${venue.name} · ` : "Mis canchas · "}{canchas.length}
                </p>
                <input
                  type="text"
                  placeholder="Buscar por nombre o ciudad..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-border/60 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-full md:max-w-md shadow-sm"
                />
              </div>
              {filteredCanchas.length === 0 ? (
                <div className="text-center py-12 text-base text-muted-foreground border border-dashed border-border/50 rounded-2xl bg-white/50 dark:bg-zinc-900/50">
                  No hay canchas que coincidan con tu búsqueda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {filteredCanchas.map((c) => {
                    const cPending = pending.filter((b) => b.cancha_id === c.id).length;
                    const isToggling = togglingCancha === c.id;
                    const isUnlinked = venue && c.venue_id !== venue.id;
                    const isAssigning = assigningCancha === c.id;

                    return (
                      <div key={c.id} className="flex flex-col">
                        <MiCanchaCard
                          cancha={c}
                          pendingCount={cPending}
                          isToggling={isToggling}
                          onToggleActive={toggleActive}
                        />
                        {isUnlinked && (
                          <button
                            onClick={() => handleAssignToVenue(c.id)}
                            disabled={isAssigning}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-t-0 border-amber-200 dark:border-amber-800/60 rounded-b-2xl -mt-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors disabled:opacity-60"
                          >
                            <div className="flex items-center gap-1.5">
                              {isAssigning ? (
                                <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Link2 className="size-3.5 shrink-0" />
                              )}
                              Sin centro asignado
                            </div>
                            <span className="font-semibold underline underline-offset-2">
                              {isAssigning ? "Asignando…" : `Asignar a ${venue?.name}`}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
