import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { MorphoInput } from "@/lib/profiles/api";
import type { VisibilityLevel } from "@/lib/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VisibilityToggle } from "./VisibilityToggle";

const morphoSchema = z.object({
  height_m: z.number().min(1.0).max(2.5).nullable().optional(),
  weight_kg: z.number().min(30).max(200).nullable().optional(),
  wingspan_m: z.number().min(1.0).max(2.8).nullable().optional(),
  laterality: z.enum(["diestro", "zurdo", "ambos"]).nullable().optional(),
  somatotype: z.enum(["ectomorfo", "mesomorfo", "endomorfo", "mixto"]).nullable().optional(),
  visibility: z.enum(["publico", "promotores", "privado"]),
});

type MorphoFormData = z.infer<typeof morphoSchema>;

interface Props {
  initial?: MorphoInput & { visibility?: VisibilityLevel };
  onSubmit: (data: MorphoFormData) => Promise<void>;
  isLoading: boolean;
}

const LATERALITY_OPTIONS = [
  { value: "diestro", label: "Diestro" },
  { value: "zurdo", label: "Zurdo" },
  { value: "ambos", label: "Ambos" },
];

const SOMATOTYPE_OPTIONS = [
  { value: "ectomorfo", label: "Ectomorfo" },
  { value: "mesomorfo", label: "Mesomorfo" },
  { value: "endomorfo", label: "Endomorfo" },
  { value: "mixto", label: "Mixto" },
];

export function MorphoForm({ initial, onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MorphoFormData>({
    resolver: zodResolver(morphoSchema),
    defaultValues: {
      height_m: initial?.height_m ?? null,
      weight_kg: initial?.weight_kg ?? null,
      wingspan_m: initial?.wingspan_m ?? null,
      laterality: initial?.laterality ?? null,
      somatotype: initial?.somatotype ?? null,
      visibility: initial?.visibility ?? "privado",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="height_m">Altura (m)</Label>
          <Input
            id="height_m"
            type="number"
            step="0.01"
            placeholder="1.75"
            {...register("height_m", {
              setValueAs: (v) => (v === "" || v === null ? null : parseFloat(v)),
            })}
          />
          {errors.height_m && (
            <p className="text-xs text-destructive">{errors.height_m.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="weight_kg">Peso (kg)</Label>
          <Input
            id="weight_kg"
            type="number"
            step="0.01"
            placeholder="70"
            {...register("weight_kg", {
              setValueAs: (v) => (v === "" || v === null ? null : parseFloat(v)),
            })}
          />
          {errors.weight_kg && (
            <p className="text-xs text-destructive">{errors.weight_kg.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wingspan_m">Envergadura (m)</Label>
          <Input
            id="wingspan_m"
            type="number"
            step="0.01"
            placeholder="1.80"
            {...register("wingspan_m", {
              setValueAs: (v) => (v === "" || v === null ? null : parseFloat(v)),
            })}
          />
          {errors.wingspan_m && (
            <p className="text-xs text-destructive">{errors.wingspan_m.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Lateralidad</Label>
          <Controller
            name="laterality"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí tu lateralidad" />
                </SelectTrigger>
                <SelectContent>
                  {LATERALITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.laterality && (
            <p className="text-xs text-destructive">{errors.laterality.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Somatotipo</Label>
          <Controller
            name="somatotype"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí tu somatotipo" />
                </SelectTrigger>
                <SelectContent>
                  {SOMATOTYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.somatotype && (
            <p className="text-xs text-destructive">{errors.somatotype.message}</p>
          )}
        </div>
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
        {isLoading ? "Guardando…" : "Guardar morfología"}
      </Button>
    </form>
  );
}
