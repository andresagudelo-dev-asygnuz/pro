import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getAllCanchas } from "@/lib/canchas/api";
import { getAllVenues } from "@/lib/venues/api";
import { haversineKm, type GeoPoint } from "@/lib/geo/nominatim";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import {
  SPORT_TYPE_LABELS,
  SPORT_TYPE_ICONS,
  CANCHAS_SPORT_OPTIONS,
  type Cancha,
  type CanchaSportType,
  type Venue,
} from "@/lib/types/db";
import { Search, Plus, MapPin, Users, Map as MapIcon, List, Navigation, Check, ChevronsUpDown } from "lucide-react";

const CanchasMap = lazy(() =>
  import("@/components/canchas/CanchasMap").then((m) => ({ default: m.CanchasMap })),
);

function CanchaCard({ cancha, distanceKm }: { cancha: Cancha; distanceKm?: number }) {
  const finalPrice =
    cancha.discount_percent > 0
      ? cancha.price_per_hour * (1 - cancha.discount_percent / 100)
      : cancha.price_per_hour;

  return (
    <Link href={`/canchas/${cancha.id}`}>
      <div className="group bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-200 cursor-pointer overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/10 border border-violet-100 dark:border-violet-800 flex items-center justify-center text-2xl shrink-0">
                {SPORT_TYPE_ICONS[cancha.sport_type]}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-zinc-900 dark:text-white leading-tight group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors truncate">
                  {cancha.name}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {SPORT_TYPE_LABELS[cancha.sport_type]}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
              {distanceKm != null && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                  {distanceKm < 1
                    ? `${Math.round(distanceKm * 1000)} m`
                    : `${distanceKm.toFixed(1)} km`}
                </span>
              )}
              {cancha.discount_percent > 0 && (
                <p className="text-xs text-muted-foreground line-through">
                  ${cancha.price_per_hour.toLocaleString("es-CO")}/h
                </p>
              )}
              <p className="font-bold text-violet-600 dark:text-violet-400 text-sm">
                ${finalPrice.toLocaleString("es-CO")}/h
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3" /> {cancha.city}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" /> {cancha.capacity} jugadores
            </span>
            {cancha.discount_percent > 0 && (
              <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold">
                -{cancha.discount_percent}%
              </span>
            )}
          </div>

          {cancha.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {cancha.description}
            </p>
          )}
        </div>
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate">
            📍 {cancha.address}
          </span>
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 group-hover:underline shrink-0 ml-2">
            Reservar →
          </span>
        </div>
      </div>
    </Link>
  );
}

function computeDistance(
  cancha: Cancha,
  userLocation: GeoPoint,
  venueMap: Map<string, Venue>,
): number | null {
  const lat = cancha.lat ?? (cancha.venue_id ? (venueMap.get(cancha.venue_id)?.lat ?? null) : null);
  const lng = cancha.lng ?? (cancha.venue_id ? (venueMap.get(cancha.venue_id)?.lng ?? null) : null);
  if (lat == null || lng == null) return null;
  return haversineKm(userLocation, { lat, lng });
}

export default function CanchasPage() {
  const { roles } = useAuth();
  const [, navigate] = useLocation();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [sportType, setSportType] = useState<CanchaSportType | "">("");
  const [venueId, setVenueId] = useState<string>("__all__");
  const [venueComboOpen, setVenueComboOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">(
    () => (localStorage.getItem("canchas_view") as "list" | "map") ?? "map"
  );
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  // idle → checking → needs_permission | loading → ready | denied
  const [geoStatus, setGeoStatus] = useState<"idle" | "checking" | "needs_permission" | "loading" | "ready" | "denied">("idle");
  const [geoSkipped, setGeoSkipped] = useState(() => localStorage.getItem("geo_skipped") === "1");

  const venueMap = new globalThis.Map<string, Venue>(allVenues.map((v): [string, Venue] => [v.id, v]));

  // Venue combobox: only show suggestions when city is typed OR location is active
  // Prevents showing all venues when neither filter is active
  const filteredVenues = city.trim()
    ? allVenues.filter((v) => v.city.toLowerCase().includes(city.toLowerCase()))
    : geoStatus === "ready"
    ? allVenues
    : [];

  function switchView(mode: "list" | "map") {
    setViewMode(mode);
    localStorage.setItem("canchas_view", mode);
  }

  // Measure the sticky filter bar height to compute exact map height
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [filterBarHeight, setFilterBarHeight] = useState(130);
  useEffect(() => {
    const el = filterBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFilterBarHeight(el.offsetHeight));
    ro.observe(el);
    setFilterBarHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // Load canchas
  useEffect(() => {
    let active = true;
    setLoading(true);
    getAllCanchas(supabase, {
      city: city || undefined,
      sportType: sportType || undefined,
      venueId: venueId !== "__all__" ? venueId : undefined,
    }).then(({ data, error: err }) => {
      if (!active) return;
      if (err) setError(err);
      else {
        setCanchas(data ?? []);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [city, sportType, venueId]);

  // Load all venues once on mount
  useEffect(() => {
    getAllVenues(supabase).then(({ data }) => setAllVenues(data ?? []));
  }, []);

  // Step 2: actually call getCurrentPosition (user already gave permission or clicked Allow)
  function doGetLocation() {
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ready");
      },
      () => setGeoStatus("denied"),
      { timeout: 10000 },
    );
  }

  // Step 1: check permission state first, then decide
  async function checkAndRequestLocation() {
    if (!navigator.geolocation) { setGeoStatus("denied"); return; }
    setGeoStatus("checking");
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      if (result.state === "granted") {
        doGetLocation();
      } else if (result.state === "denied") {
        setGeoStatus("denied");
      } else {
        // "prompt" — ask the user via our UI first
        setGeoStatus("needs_permission");
      }
    } catch {
      // Browser doesn't support Permissions API — go straight to getCurrentPosition
      doGetLocation();
    }
  }

  function handleGetLocation() {
    checkAndRequestLocation();
  }

  function handleSwitchToMap() {
    switchView("map");
    if (geoStatus === "idle") checkAndRequestLocation();
  }

  // Sort canchas by distance when user location is ready
  const sortedCanchas = userLocation && geoStatus === "ready"
    ? [...canchas].sort((a, b) => {
        const dA = computeDistance(a, userLocation, venueMap);
        const dB = computeDistance(b, userLocation, venueMap);
        if (dA == null && dB == null) return 0;
        if (dA == null) return 1;
        if (dB == null) return -1;
        return dA - dB;
      })
    : canchas;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title="Canchas"
        actions={
          <>
            {roles?.is_cancha && (
              <Link href="/mis-canchas">
                <Button variant="outline" size="sm" className="rounded-xl text-xs">
                  Mis canchas
                </Button>
              </Link>
            )}
            {roles?.is_cancha && (
              <Link href="/canchas/nueva">
                <Button size="sm" className="rounded-xl gap-1.5 bg-violet-600 hover:bg-violet-700">
                  <Plus className="size-3.5" /> Agregar
                </Button>
              </Link>
            )}
          </>
        }
      />

      {/* Sticky filter bar */}
      <div ref={filterBarRef} className="sticky top-14 z-40 bg-white dark:bg-zinc-900 border-b border-border/50 px-4 pb-3 pt-2 space-y-2">
        {/* City search + geo button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ciudad…"
              className="pl-9 rounded-xl h-9 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 shrink-0"
            onClick={handleGetLocation}
            disabled={geoStatus === "loading" || geoStatus === "checking"}
            title="Usar mi ubicación"
          >
            <Navigation className="size-3.5" />
            {geoStatus === "loading" || geoStatus === "checking" ? "…" : geoStatus === "ready" ? "Activa" : "Mi ubicación"}
          </Button>
        </div>

        {/* Sport type chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setSportType("")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
              sportType === ""
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                : "bg-background border-border hover:border-foreground/30 text-muted-foreground"
            }`}
          >
            Todos
          </button>
          {CANCHAS_SPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSportType(sportType === opt.value ? "" : opt.value)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                sportType === opt.value
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                  : "bg-background border-border hover:border-foreground/30 text-muted-foreground"
              }`}
            >
              {SPORT_TYPE_ICONS[opt.value]} {opt.label}
            </button>
          ))}
        </div>

        {/* Venue / escenario filter — always visible */}
        {allVenues.length > 0 && (
          <Popover open={venueComboOpen} onOpenChange={setVenueComboOpen}>
            <PopoverTrigger asChild>
              <button
                role="combobox"
                aria-expanded={venueComboOpen}
                className={cn(
                  "h-8 w-full flex items-center justify-between gap-1 px-3 rounded-xl text-xs border transition-all",
                  venueId !== "__all__"
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-medium"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                )}
              >
                <span className="truncate">
                  {venueId !== "__all__"
                    ? allVenues.find((v) => v.id === venueId)?.name ?? "Escenario seleccionado"
                    : "Filtrar por escenario / conjunto…"}
                </span>
                <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Marchagaz, Arena, Polideportivo…" className="text-xs h-8" />
                <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                  {city.trim() || geoStatus === "ready"
                    ? "Sin escenarios en esta ciudad."
                    : "Escribí una ciudad para buscar escenarios."}
                </CommandEmpty>
                <CommandGroup className="max-h-56 overflow-y-auto">
                  <CommandItem
                    value="__all__"
                    onSelect={() => { setVenueId("__all__"); setVenueComboOpen(false); }}
                  >
                    <Check className={cn("mr-2 size-3", venueId === "__all__" ? "opacity-100" : "opacity-0")} />
                    Todos los escenarios
                  </CommandItem>
                  {filteredVenues.map((v) => (
                    <CommandItem
                      key={v.id}
                      value={v.name}
                      onSelect={() => { setVenueId(v.id); setVenueComboOpen(false); }}
                    >
                      <Check className={cn("mr-2 size-3", venueId === v.id ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{v.name}</span>
                      {v.city && (
                        <span className="ml-auto pl-2 text-xs text-muted-foreground shrink-0">{v.city}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {/* List / Map toggle */}
        <div className="flex justify-end gap-1">
          <button
            onClick={() => switchView("list")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              viewMode === "list"
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                : "bg-background border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            <List className="size-3" /> Lista
          </button>
          <button
            onClick={handleSwitchToMap}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              viewMode === "map"
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                : "bg-background border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            <MapIcon className="size-3" /> Mapa
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-sm border border-destructive/20">
            {error}
          </div>
        </div>
      ) : viewMode === "map" && geoStatus === "needs_permission" ? (
        /* Browser hasn't asked yet — explain and offer a button to trigger the native prompt */
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-3xl">
            📍
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">¿Usamos tu ubicación?</p>
            <p className="text-sm text-muted-foreground">
              Así te mostramos las canchas más cercanas en el mapa. Tu navegador te pedirá confirmar.
            </p>
          </div>
          <button
            onClick={doGetLocation}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
          >
            Permitir ubicación
          </button>
          <button
            onClick={() => setGeoStatus("idle")}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            Ver mapa sin ubicación
          </button>
        </div>
      ) : viewMode === "map" ? (
        /* Map view — always render the map; overlay banners for geo states */
        <div className="relative">
          {/* Denied: browser blocked — show banner with manual instructions */}
          {geoStatus === "denied" && (
            <div className="absolute top-2 left-3 right-3 z-[1001] bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-lg">
              <span className="text-lg shrink-0 mt-0.5">🔒</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">
                  Ubicación bloqueada
                </p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Ve a Configuración &gt; Privacidad &gt; Ubicación y permite el acceso para este sitio.
                </p>
              </div>
              <button
                onClick={doGetLocation}
                className="shrink-0 text-xs font-semibold text-violet-600 dark:text-violet-400 underline underline-offset-2 mt-0.5"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Checking / loading: small spinner overlay */}
          {(geoStatus === "checking" || geoStatus === "loading") && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1001] bg-white dark:bg-zinc-900 border border-border rounded-2xl px-4 py-2 flex items-center gap-2 shadow-md">
              <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {geoStatus === "checking" ? "Verificando permisos…" : "Obteniendo ubicación…"}
              </p>
            </div>
          )}

          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <CanchasMap
              canchas={sortedCanchas}
              venues={allVenues}
              userLocation={userLocation}
              onCanchaSelect={(id) => navigate(`/canchas/${id}`)}
              height={`calc(100dvh - 56px - ${filterBarHeight}px - 74px)`}
            />
          </Suspense>
        </div>
      ) : (
        /* List view */
        <>
          {/* Geo permission banner — only when idle and not skipped */}
          {geoStatus === "idle" && !geoSkipped && (
            <div className="container mx-auto px-4 pt-3 max-w-2xl">
              <div className="flex items-center gap-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-4 py-3">
                <Navigation className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-200 flex-1 leading-snug">
                  Permitinos acceder a tu ubicación para ordenar las canchas por cercanía.
                </p>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      setGeoSkipped(true);
                      localStorage.setItem("geo_skipped", "1");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Omitir
                  </button>
                  <button
                    onClick={doGetLocation}
                    className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline underline-offset-2 transition-colors"
                  >
                    Permitir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Denied banner */}
          {geoStatus === "denied" && viewMode === "list" && (
            <div className="container mx-auto px-4 pt-3 max-w-2xl">
              <div className="flex items-center gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 px-4 py-2.5">
                <span className="text-base shrink-0">🔒</span>
                <p className="text-xs text-amber-800 dark:text-amber-200 flex-1 leading-snug">
                  Ubicación bloqueada. Habilitala en Configuración para ver las canchas más cercanas.
                </p>
              </div>
            </div>
          )}

          {canchas.length === 0 ? (
        <main className="container mx-auto px-4 py-4 max-w-2xl">
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">
              🏟️
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">No hay canchas disponibles</p>
              {city && (
                <p className="text-sm text-muted-foreground">
                  Probá buscar en otra ciudad o sin filtros.
                </p>
              )}
            </div>
            {roles?.is_cancha && (
              <Link href="/canchas/nueva">
                <Button size="sm" className="rounded-xl">
                  Registrar mi cancha
                </Button>
              </Link>
            )}
          </div>
        </main>
      ) : (
        <main className="container mx-auto px-4 py-4 max-w-2xl">
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              {sortedCanchas.length}{" "}
              {sortedCanchas.length === 1 ? "cancha disponible" : "canchas disponibles"}
              {userLocation && " · ordenadas por distancia"}
            </p>
            {sortedCanchas.map((c) => {
              const dist = userLocation ? computeDistance(c, userLocation, venueMap) : undefined;
              return (
                <CanchaCard
                  key={c.id}
                  cancha={c}
                  distanceKm={dist ?? undefined}
                />
              );
            })}
          </div>
        </main>
      )}
        </>
      )}

      <BottomNav />
    </div>
  );
}
