import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ConditionalInput } from "@/lib/profiles/api";
import type { VisibilityLevel } from "@/lib/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VisibilityToggle } from "./VisibilityToggle";

const conditionalSchema = z.object({
  strength_tags: z.string().optional(),
  strength_notes: z.string().max(500, "Máximo 500 caracteres").nullable().optional(),
  speed_tags: z.string().optional(),
  speed_notes: z.string().max(500, "Máximo 500 caracteres").nullable().optional(),
  endurance_tags: z.string().optional(),
  endurance_notes: z.string().max(500, "Máximo 500 caracteres").nullable().optional(),
  flexibility_tags: z.string().optional(),
  flexibility_notes: z.string().max(500, "Máximo 500 caracteres").nullable().optional(),
  visibility: z.enum(["publico", "promotores", "privado"]),
});

type ConditionalFormData = z.infer<typeof conditionalSchema>;

interface Props {
  initial?: ConditionalInput & { visibility?: VisibilityLevel };
  onSubmit: (data: ConditionalInput & { visibility: VisibilityLevel }) => Promise<void>;
  isLoading: boolean;
}

const CATEGORIES = [
  { key: "strength" as const, label: "Fuerza" },
  { key: "speed" as const, label: "Velocidad" },
  { key: "endurance" as const, label: "Resistencia" },
  { key: "flexibility" as const, label: "Flexibilidad" },
];

function tagsToString(tags: string[] | undefined | null): string {
  if (!tags || tags.length === 0) return "";
  return tags.join(", ");
}

function stringToTags(str: string): string[] {
  return str
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function ConditionalForm({ initial, onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ConditionalFormData>({
    resolver: zodResolver(conditionalSchema),
    defaultValues: {
      strength_tags: tagsToString(initial?.strength_tags),
      strength_notes: initial?.strength_notes ?? null,
      speed_tags: tagsToString(initial?.speed_tags),
      speed_notes: initial?.speed_notes ?? null,
      endurance_tags: tagsToString(initial?.endurance_tags),
      endurance_notes: initial?.endurance_notes ?? null,
      flexibility_tags: tagsToString(initial?.flexibility_tags),
      flexibility_notes: initial?.flexibility_notes ?? null,
      visibility: initial?.visibility ?? "privado",
    },
  });

  async function handleFormSubmit(data: ConditionalFormData) {
    await onSubmit({
      strength_tags: stringToTags(data.strength_tags ?? ""),
      strength_notes: data.strength_notes ?? null,
      speed_tags: stringToTags(data.speed_tags ?? ""),
      speed_notes: data.speed_notes ?? null,
      endurance_tags: stringToTags(data.endurance_tags ?? ""),
      endurance_notes: data.endurance_notes ?? null,
      flexibility_tags: stringToTags(data.flexibility_tags ?? ""),
      flexibility_notes: data.flexibility_notes ?? null,
      visibility: data.visibility,
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {CATEGORIES.map(({ key, label }) => {
        const notesField = `${key}_notes` as const;
        const tagsField = `${key}_tags` as const;
        const notesValue = watch(notesField) ?? "";

        return (
          <div key={key} className="flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-zinc-50 dark:bg-zinc-800/30">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{label}</p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${key}_tags`} className="text-xs text-muted-foreground">
                Tags (separados por coma)
              </Label>
              <Input
                id={`${key}_tags`}
                placeholder="p.ej. explosivo, resistente"
                {...register(tagsField)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={notesField} className="text-xs text-muted-foreground">
                  Notas
                </Label>
                <span className="text-[10px] text-muted-foreground/60">
                  {(notesValue ?? "").length}/500
                </span>
              </div>
              <Textarea
                id={notesField}
                rows={3}
                maxLength={500}
                placeholder={`Describe tu ${label.toLowerCase()}…`}
                {...register(notesField)}
              />
              {errors[notesField] && (
                <p className="text-xs text-destructive">{errors[notesField]?.message}</p>
              )}
            </div>
          </div>
        );
      })}

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
        {isLoading ? "Guardando…" : "Guardar condición física"}
      </Button>
    </form>
  );
}
