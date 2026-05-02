/**
 * Valida que una string sea un path relativo same-origin seguro para hacer
 * `NextResponse.redirect(new URL(target, request.url))` sin riesgo de
 * open-redirect.
 *
 * Reglas:
 *   - Debe empezar con "/"
 *   - No puede empezar con "//" (protocol-relative)
 *   - No puede empezar con "/\" (ej. "/\\evil.com")
 */
export function safeRelativePath(input: string | null | undefined): string | null {
  if (!input) return null;
  if (!input.startsWith("/")) return null;
  if (input.startsWith("//")) return null;
  if (input.startsWith("/\\")) return null;
  return input;
}
