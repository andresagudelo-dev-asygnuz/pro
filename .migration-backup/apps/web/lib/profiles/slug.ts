/**
 * Slug helpers para el perfil tipo ficha (HU-003 / RF-002).
 *
 * El slug vive en `public.profiles_core.slug` con CHECK:
 *   ^[a-z0-9]+(-[a-z0-9]+)*$    &&   char_length(slug) between 3 and 80
 *
 * Reglas:
 *   - normalizar Unicode (NFD) y remover diacríticos → ASCII.
 *   - minúsculas, dígitos o guiones.
 *   - un solo guion entre "palabras", sin guiones al inicio/fin.
 *   - máximo 80 caracteres (truncado por palabra completa cuando es posible).
 *   - fallback `"usuario"` si la entrada queda vacía tras normalizar (por
 *     ejemplo nombre sólo con emojis o caracteres no alfanuméricos).
 */
export function slugifyName(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length === 0) return "usuario";

  if (base.length <= 80) return base;

  const truncated = base.slice(0, 80).replace(/-+$/g, "");
  // Asegurar mínimo 3 caracteres tras truncar.
  return truncated.length >= 3 ? truncated : base.slice(0, 80);
}
