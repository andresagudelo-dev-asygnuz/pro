import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FeedFilters } from "@/lib/feed/api";

interface FeedFiltersBarProps {
  filters: FeedFilters;
  onFilterChange: (f: FeedFilters) => void;
  cities: string[];
  sports: Array<{ id: string; name: string; icon?: string | null }>;
}

export function FeedFiltersBar({ filters, onFilterChange, cities, sports }: FeedFiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <div className="flex-1 min-w-0">
        <Select
          value={filters.city ?? "all"}
          onValueChange={(v) => onFilterChange({ ...filters, city: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="h-9 text-xs rounded-xl w-full">
            <SelectValue placeholder="Ciudad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-0">
        <Select
          value={filters.sport_id ?? "all"}
          onValueChange={(v) =>
            onFilterChange({ ...filters, sport_id: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger className="h-9 text-xs rounded-xl w-full">
            <SelectValue placeholder="Deporte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los deportes</SelectItem>
            {sports.map((sp) => (
              <SelectItem key={sp.id} value={sp.id}>
                {sp.icon && <span className="mr-1">{sp.icon}</span>}
                {sp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
