import { useEffect, useState } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getAllCanchas } from "@/lib/canchas/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SPORT_TYPE_LABELS, SPORT_TYPE_ICONS, CANCHAS_SPORT_OPTIONS, type Cancha, type CanchaSportType } from "@/lib/types/db";
import { Search, Plus, MapPin, Users, Clock } from "lucide-react";

const supabase = createClient();

function CanchaCard({ cancha }: { cancha: Cancha }) {
  const finalPrice = cancha.discount_percent > 0
    ? cancha.price_per_hour * (1 - cancha.discount_percent / 100)
    : cancha.price_per_hour;

  return (
    <Link href={`/canchas/${cancha.id}`}>
      <div className="rounded-xl border bg-white dark:bg-zinc-900 p-4 shadow-sm hover:border-foreground/30 transition-colors cursor-pointer space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{SPORT_TYPE_ICONS[cancha.sport_type]}</span>
              <h3 className="font-semibold text-zinc-900 dark:text-white leading-tight">{cancha.name}</h3>
            </div>
            <span className="text-xs text-muted-foreground">{SPORT_TYPE_LABELS[cancha.sport_type]}</span>
          </div>
          <div className="text-right shrink-0">
            {cancha.discount_percent > 0 && (
              <p className="text-xs text-muted-foreground line-through">
                ${cancha.price_per_hour.toLocaleString("es-CO")}
              </p>
            )}
            <p className="font-bold text-brand-primary text-sm">
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
            <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium">
              -{cancha.discount_percent}% dto.
            </span>
          )}
        </div>

        {cancha.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{cancha.description}</p>
        )}
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
    getAllCanchas(supabase, { city: city || undefined, sportType: sportType || undefined }).then(
      ({ data, error }) => {
        if (!active) return;
        if (error) setError(error);
        else { setCanchas(data ?? []); setError(null); }
        setLoading(false);
      },
    );
    return () => { active = false; };
  }, [city, sportType]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Canchas</h1>
          <div className="flex items-center gap-2">
            {roles?.is_cancha && (
              <Link href="/canchas/nueva">
                <Button size="sm">
                  <Plus className="size-4 mr-1" /> Agregar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-4 pb-2 max-w-2xl space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ciudad…"
            className="pl-9"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSportType("")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              sportType === ""
                ? "bg-foreground text-background border-foreground"
                : "bg-background border-border hover:border-foreground/40"
            }`}
          >
            Todos
          </button>
          {CANCHAS_SPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSportType(sportType === opt.value ? "" : opt.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                sportType === opt.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background border-border hover:border-foreground/40"
              }`}
            >
              {SPORT_TYPE_ICONS[opt.value]} {opt.label}
            </button>
          ))}
        </div>
      </div>

      <main className="container mx-auto px-4 py-3 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm">{error}</div>
        ) : canchas.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No hay canchas disponibles.</p>
            {city && (
              <p className="text-sm text-muted-foreground">
                Probá buscar en otra ciudad o sin filtros.
              </p>
            )}
            {roles?.is_cancha && (
              <Link href="/canchas/nueva">
                <Button className="mt-4">Registrar mi cancha</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {canchas.map((c) => (
              <CanchaCard key={c.id} cancha={c} />
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-14">
            <Link href="/feed" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏠</span><span>Inicio</span>
            </Link>
            <Link href="/tournaments" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏆</span><span>Torneos</span>
            </Link>
            <Link href="/canchas" className="flex flex-col items-center gap-0.5 text-xs font-medium text-brand-primary">
              <span>🏟️</span><span>Canchas</span>
            </Link>
            <Link href="/amigos" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>👥</span><span>Amigos</span>
            </Link>
            <Link href="/perfil" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>👤</span><span>Perfil</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
