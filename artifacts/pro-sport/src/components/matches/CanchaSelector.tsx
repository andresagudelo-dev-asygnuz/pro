import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SPORT_TYPE_LABELS, SPORT_TYPE_ICONS } from "@/lib/types/db";
import type { Cancha } from "@/lib/types/db";

interface CanchaSelectorProps {
  city: string;
  sportId?: string;
  selectedCanchaId?: string | null;
  onSelect: (canchaId: string | null, cancha: Cancha | null) => void;
}

export function CanchaSelector({ city, sportId, selectedCanchaId, onSelect }: CanchaSelectorProps) {
  const { data: canchas = [], isLoading } = useQuery<Cancha[]>({
    queryKey: ["canchas", city, sportId],
    queryFn: async () => {
      let query = supabase
        .from("canchas")
        .select("*")
        .eq("city", city)
        .order("name");
      // filter by sport type if applicable — best effort, no strict mapping here
      const { data } = await query;
      return (data ?? []) as Cancha[];
    },
    enabled: !!city,
  });

  if (!city) return null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-5">
        <div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (canchas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-1">
        No hay canchas registradas en {city} aún.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="size-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Canchas en {city}</p>
      </div>
      {canchas.map((c) => {
        const isSelected = selectedCanchaId === c.id;
        const finalPrice = c.discount_percent > 0
          ? c.price_per_hour * (1 - c.discount_percent / 100)
          : c.price_per_hour;

        return (
          <button
            type="button"
            key={c.id}
            onClick={() => onSelect(isSelected ? null : c.id, isSelected ? null : c)}
            className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all text-left ${
              isSelected
                ? "border-brand-primary bg-brand-primary/5 shadow-sm"
                : "border-border hover:border-foreground/30 bg-white dark:bg-zinc-900"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">{SPORT_TYPE_ICONS[c.sport_type] ?? "🏟️"}</span>
              <div className="min-w-0">
                <p className="font-semibold leading-tight truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {SPORT_TYPE_LABELS[c.sport_type] ?? c.sport_type} · {c.capacity} jug. · {c.address}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              {c.discount_percent > 0 && (
                <p className="text-xs text-muted-foreground line-through">
                  ${c.price_per_hour.toLocaleString("es-CO")}/h
                </p>
              )}
              <p className="font-bold text-brand-primary text-sm">
                ${finalPrice.toLocaleString("es-CO")}/h
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
