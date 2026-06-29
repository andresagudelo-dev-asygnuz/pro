import { z } from "zod";

export const tournamentSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  format: z.enum(["liga", "eliminatoria", "fase_grupos_eliminatoria"]),
  slots: z.coerce.number().min(2, "Debe haber al menos 2 cupos.").max(128, "Máximo 128 cupos."),
  location: z.string().min(2, "La ubicación es obligatoria."),
  startDate: z.string().min(1, "La fecha de inicio es obligatoria."),
  endDate: z.string().min(1, "La fecha de fin es obligatoria."),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
  path: ["endDate"],
});

export type TournamentFormValues = z.infer<typeof tournamentSchema>;
