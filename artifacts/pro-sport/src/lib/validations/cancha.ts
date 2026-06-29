import { z } from "zod";

export const canchaSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  description: z.string().optional(),
  sport_type: z.enum([
    "futbol_11", "futbol_9", "futbol_5", "futbol_sala", "padel", "tenis", "basket", "voleibol", "otro"
  ]),
  capacity: z.coerce.number().min(1, "La capacidad debe ser mayor a 0."),
  price_per_hour: z.coerce.number().min(0, "Precio inválido."),
  discount_percent: z.coerce.number().min(0).max(100).optional(),
});

export type CanchaFormValues = z.infer<typeof canchaSchema>;
