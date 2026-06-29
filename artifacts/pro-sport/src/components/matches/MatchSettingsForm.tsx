import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SKILL_LEVELS } from "@/lib/types/db";

interface MatchSettingsFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<any>;
}

export function MatchSettingsForm({ control, errors }: MatchSettingsFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Max players */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="max_players">Máx. jugadores *</Label>
        <Controller
          name="max_players"
          control={control}
          render={({ field }) => (
            <Input
              id="max_players"
              type="number"
              min={2}
              max={64}
              {...field}
              onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
            />
          )}
        />
        {errors.max_players && <p className="text-xs text-destructive">{String(errors.max_players.message)}</p>}
      </div>

      {/* Skill level */}
      <div className="flex flex-col gap-2">
        <Label>Nivel de dificultad <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Controller
          name="skill_level"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? "any"} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Cualquier nivel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquier nivel</SelectItem>
                {SKILL_LEVELS.map((lvl) => (
                  <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              id="description"
              placeholder="Detalles del partido, reglas especiales…"
              rows={3}
              {...field}
            />
          )}
        />
      </div>
    </div>
  );
}
