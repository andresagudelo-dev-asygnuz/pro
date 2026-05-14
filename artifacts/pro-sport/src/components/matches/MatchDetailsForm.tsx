import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENABLED_CITIES } from "@/lib/types/db";
import type { Sport } from "@/lib/types/db";

// Shape must match the form values used in useMatchForm
export interface MatchDetailsValues {
  title: string;
  sport_id: string;
  city: string;
  location: string;
  dateStr: string;
  timeStr: string;
  duration_minutes: number;
}

interface MatchDetailsFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<any>;
  sports: Sport[];
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function MatchDetailsForm({ control, errors, sports }: MatchDetailsFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Nombre del partido *</Label>
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <Input id="title" placeholder='Ej: "Pichanga de los martes"' {...field} />
          )}
        />
        {errors.title && <p className="text-xs text-destructive">{String(errors.title.message)}</p>}
      </div>

      {/* Sport */}
      <div className="flex flex-col gap-2">
        <Label>Deporte *</Label>
        <Controller
          name="sport_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Seleccioná el deporte" /></SelectTrigger>
              <SelectContent>
                {sports.map((sp) => (
                  <SelectItem key={sp.id} value={sp.id}>
                    {sp.icon && <span className="mr-1">{sp.icon}</span>}
                    {sp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.sport_id && <p className="text-xs text-destructive">{String(errors.sport_id.message)}</p>}
      </div>

      {/* City */}
      <div className="flex flex-col gap-2">
        <Label>Ciudad *</Label>
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Seleccioná la ciudad" /></SelectTrigger>
              <SelectContent>
                {ENABLED_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        {errors.city && <p className="text-xs text-destructive">{String(errors.city.message)}</p>}
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="location">Dirección / Lugar <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Controller
          name="location"
          control={control}
          render={({ field }) => (
            <Input id="location" placeholder="Ej: Cancha El Prado, Carrera 12 #45-67" {...field} />
          )}
        />
      </div>

      {/* Date */}
      <div className="flex flex-col gap-2">
        <Label>Fecha *</Label>
        <Controller
          name="dateStr"
          control={control}
          render={({ field }) => (
            <input
              type="date"
              min={todayDate()}
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              {...field}
            />
          )}
        />
        {errors.dateStr && <p className="text-xs text-destructive">{String(errors.dateStr.message)}</p>}
      </div>

      {/* Time */}
      <div className="flex flex-col gap-2">
        <Label>Hora *</Label>
        <Controller
          name="timeStr"
          control={control}
          render={({ field }) => (
            <input
              type="time"
              className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              {...field}
            />
          )}
        />
        {errors.timeStr && <p className="text-xs text-destructive">{String(errors.timeStr.message)}</p>}
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="duration">Duración (min) *</Label>
        <Controller
          name="duration_minutes"
          control={control}
          render={({ field }) => (
            <Input
              id="duration"
              type="number"
              min={15}
              max={600}
              step={15}
              {...field}
              onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
            />
          )}
        />
        {errors.duration_minutes && <p className="text-xs text-destructive">{String(errors.duration_minutes.message)}</p>}
      </div>
    </div>
  );
}
