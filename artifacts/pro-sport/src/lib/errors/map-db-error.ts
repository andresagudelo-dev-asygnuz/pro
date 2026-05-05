type PostgrestLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
};

const GENERIC = "Algo salió mal. Probá de nuevo en un momento.";

export function mapDbError(err: unknown, context?: string): string {
  const e = err as PostgrestLike | undefined;
  if (e) {
    console.error(`[db-error${context ? `:${context}` : ""}]`, {
      code: e.code,
      message: e.message,
      details: e.details,
    });
  }
  if (!e || !e.code) return GENERIC;
  switch (e.code) {
    case "23505":
      return "Ese valor ya existe. Probá con otro.";
    case "23503":
      return "Referencia inválida. Revisá los datos.";
    case "23514":
      return "Alguno de los datos no cumple las validaciones.";
    case "P0001":
      if (e.message?.includes("match_full")) return "El partido ya está completo.";
      if (e.message?.includes("rate_limited")) return "Muchos intentos seguidos. Esperá un ratito.";
      if (e.message?.includes("organizer_cannot_leave")) return "Como organizador no podés salir del partido.";
      return GENERIC;
    case "P0002":
      return "No encontramos el recurso.";
    case "42501":
    case "PGRST205":
      return "No tenés permisos para hacer esto.";
    default:
      return GENERIC;
  }
}

export function mapAuthError(rawMessage: string): string {
  const m = rawMessage.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid_credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("user already registered")) return "Ya existe una cuenta con ese email. Iniciá sesión.";
  if (m.includes("email not confirmed")) return "Todavía no confirmaste tu email. Revisá tu bandeja.";
  if (m.includes("rate limit") || m.includes("too many requests")) return "Muchos intentos seguidos. Esperá unos minutos.";
  if (m.includes("password")) return "La contraseña no cumple los requisitos mínimos.";
  return GENERIC;
}
