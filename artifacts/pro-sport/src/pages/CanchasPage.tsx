import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getAllCanchas } from "@/lib/canchas/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import {
  SPORT_TYPE_LABELS,
  SPORT_TYPE_ICONS,
  CANCHAS_SPORT_OPTIONS,
  type Cancha,
  type CanchaSportType,
} from "@/lib/types/db";
import { Search, Plus, MapPin, Users } from "lucide-react";


function CanchaCard({ cancha }: { cancha: Cancha }) {
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
            <div className="text-right shrink-0">
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

export default function CanchasPage() {
  const { roles } = useAuth();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [sportType, setSportType] = useState<CanchaSportType | "">("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAllCanchas(supabase, {
      city: city || undefined,
      sportType: sportType || undefined,
    }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error);
      else {
        setCanchas(data ?? []);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [city, sportType]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title="Canchas"
        actions={<>
          {roles?.is_cancha && (
            <Link href="/mis-canchas">
              <Button variant="outline" size="sm" className="rounded-xl text-xs">Mis canchas</Button>
            </Link>
          )}
          {roles?.is_cancha && (
            <Link href="/canchas/nueva">
              <Button size="sm" className="rounded-xl gap-1.5 bg-violet-600 hover:bg-violet-700">
                <Plus className="size-3.5" /> Agregar
              </Button>
            </Link>
          )}
        </>}
      />

      {/* Search + sport filters */}
      <div className="sticky top-14 z-40 bg-white dark:bg-zinc-900 border-b border-border/50 px-4 pb-3 pt-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ciudad…"
            className="pl-9 rounded-xl h-9 text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
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
      </div>

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-sm border border-destructive/20">
            {error}
          </div>
        ) : canchas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">
              🏟️
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                No hay canchas disponibles
              </p>
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
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              {canchas.length}{" "}
              {canchas.length === 1 ? "cancha disponible" : "canchas disponibles"}
            </p>
            {canchas.map((c) => (
              <CanchaCard key={c.id} cancha={c} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
