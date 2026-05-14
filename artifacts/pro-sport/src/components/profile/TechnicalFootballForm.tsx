import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TechnicalInput } from "@/lib/profiles/api";
import type { VisibilityLevel } from "@/lib/types/db";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VisibilityToggle } from "./VisibilityToggle";

const technicalSchema = z.object({
  position: z.enum(["arquero", "defensa", "mediocampista", "delantero"]).nullable().optional(),
  // dominant_foot here is football-specific technique; profiles.preferred_foot is for match filtering
  dominant_foot: z.enum(["derecho", "izquierdo", "ambos"]).nullable().optional(),
  performance_notes: z.string().max(500, "Máximo 500 caracteres").nullable().optional(),
  tactical_role_notes: z.string().max(500, "Máximo 500 caracteres").nullable().optional(),
  visibility: z.enum(["publico", "promotores", "privado"]),
});

type TechnicalFormData = z.infer<typeof technicalSchema>;

interface Props {
  initial?: TechnicalInput & { visibility?: VisibilityLevel };
  onSubmit: (data: TechnicalFormData) => Promise<void>;
  isLoading: boolean;
}

const POSITION_OPTIONS = [
  { value: "arquero", label: "Arquero / Portero" },
  { value: "defensa", label: "Defensa" },
  { value: "mediocampista", label: "Mediocampista" },
  { value: "delantero", label: "Delantero" },
];

const DOMINANT_FOOT_OPTIONS = [
  { value: "derecho", label: "Derecho" },
  { value: "izquierdo", label: "Izquierdo" },
  { value: "ambos", label: "Ambos" },
];

export function TechnicalFootballForm({ initial, onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<TechnicalFormData>({
    resolver: zodResolver(technicalSchema),
    defaultValues: {
      position: initial?.position ?? null,
      dominant_foot: initial?.dominant_foot ?? null,
      performance_notes: initial?.performance_notes ?? null,
      tactical_role_notes: initial?.tactical_role_notes ?? null,
      visibility: initial?.visibility ?? "privado",
    },
  });

  const performanceNotes = watch("performance_notes") ?? "";
  const tacticalRoleNotes = watch("tactical_role_notes") ?? "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Posición</Label>
          <Controller
            name="position"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná tu posición" />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.position && (
            <p className="text-xs text-destructive">{errors.position.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Pie dominante (técnico)</Label>
          <Controller
            name="dominant_foot"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pie dominante" />
                </SelectTrigger>
                <SelectContent>
                  {DOMINANT_FOOT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.dominant_foot && (
            <p className="text-xs text-destructive">{errors.dominant_foot.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="performance_notes">Notas de rendimiento</Label>
          <span className="text-[10px] text-muted-foreground/60">
            {performanceNotes.length}/500
          </span>
        </div>
        <Textarea
          id="performance_notes"
          rows={3}
          maxLength={500}
          placeholder="Describe tu rendimiento en cancha…"
          {...register("performance_notes")}
        />
        {errors.performance_notes && (
          <p className="text-xs text-destructive">{errors.performance_notes.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="tactical_role_notes">Rol táctico</Label>
          <span className="text-[10px] text-muted-foreground/60">
            {tacticalRoleNotes.length}/500
          </span>
        </div>
        <Textarea
          id="tactical_role_notes"
          rows={3}
          maxLength={500}
          placeholder="Describe tu rol táctico preferido…"
          {...register("tactical_role_notes")}
        />
        {errors.tactical_role_notes && (
          <p className="text-xs text-destructive">{errors.tactical_role_notes.message}</p>
        )}
      </div>

      <Controller
        name="visibility"
        control={control}
        render={({ field }) => (
          <VisibilityToggle
            value={field.value}
            onChange={field.onChange}
            disabled={isLoading}
          />
        )}
      />

      <Button
        type="submit"
        disabled={isLoading}
        className="rounded-xl bg-violet-600 hover:bg-violet-700"
      >
        {isLoading ? "Guardando…" : "Guardar técnica"}
      </Button>
    </form>
  );
}
