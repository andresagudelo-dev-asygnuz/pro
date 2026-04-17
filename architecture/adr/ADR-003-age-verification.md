# ADR-003 — Estrategia de verificación de edad (RF-007)

- **Estado:** Aceptada
- **Fecha:** 2026-04-17
- **Decisores:** Andres Agudelo (fundador) + arquitectura / seguridad.
- **Relacionado con:** RF-007, `design/user-flows.md` Flujo 2, `design/wireframes/02-age-verification.md`, `db/data-model.md` §3.2.

## Contexto

El MVP1 sólo admite mayores de edad. RF-007 exige:

- Subir un documento de identidad (JPG, PNG o PDF, ≤ 5 MB).
- Estado del trámite visible al usuario (`pendiente`, `aprobada`, `rechazada`, `menor_edad`).
- El documento **nunca** es accesible para terceros ni para el propio usuario desde el cliente (se gestiona como evidencia).
- La aprobación desbloquea RF-002 (perfil completo) y RF-004 (inscribirse a torneo).

El producto debe elegir entre:

1. Integrar un proveedor externo de verificación de identidad (p.ej. Veriff, Jumio, Metamap, TruCo en LATAM).
2. Flujo interno con upload del documento + revisión manual por administrador.

## Opciones evaluadas

### Opción A — Proveedor externo de identidad (KYC)

**Pros**
- Verificación automatizada, menor carga operativa.
- Mejor experiencia (OCR + liveness + validación documento).
- Compliance robusto listo (LGPD/GDPR adjacent).

**Contras**
- Costo fijo por verificación (≥ USD 0.80–2.50 por intento según proveedor) inviable para MVP de lanzamiento regional sin ingresos.
- Integración no trivial; requiere SDK, webhooks, kms propio del proveedor.
- Dependencia de vendor crítica para onboarding (bloqueo total si el proveedor falla).
- Supervisión anti-fraude deseable también en MVP operado regionalmente.

### Opción B — Upload interno + revisión manual por admin

**Pros**
- Sin costo variable por usuario.
- Control total del flujo, datos y retención.
- El tráfico esperado de MVP1 (50–200 usuarios concurrentes, onboarding diario pequeño) hace viable una cola manual revisada en horas hábiles.
- Aprovecha Supabase Storage + RLS ya parte del stack.

**Contras**
- Requiere operación humana (el propio fundador o un admin designado). Time-to-approval depende de disponibilidad.
- Riesgo de sesgo o error humano; se mitiga con trazabilidad (reviewer_id, notas) + criterios escritos.
- Obliga a manejar PII con cuidado (acceso mínimo, retención limitada, borrado seguro).

### Opción C — Híbrido (OCR local + revisión manual)

Usar una librería open-source de OCR + detección básica (p.ej. `tesseract` para fecha) + revisión manual como fallback.

**Pros**
- Sugerencias automáticas de campos (fecha de nacimiento) reducen tiempo de revisión.
- No hay costos por verificación.

**Contras**
- Complejidad operativa (pipeline de OCR en Next.js/Edge es awkward; Edge Runtime no lo soporta).
- Un pipeline robusto probablemente empuja a mover OCR a función serverless + queue, añadiendo complejidad innecesaria para un MVP de volumen bajo.

## Decisión

**Se adopta la Opción B** (upload interno + revisión manual) para MVP1.

### Implementación

- **Storage:** bucket privado `age-verifications` en Supabase Storage.
  - RLS del bucket: `insert` permitido a usuarios autenticados sobre `age-verifications/<user_id>/*`; `select` permitido únicamente con service role (admin).
  - Archivos renombrados al ingresar: `<user_id>/<timestamp>_<uuid>.<ext>`.
  - Los metadatos visibles al dueño son sólo: nombre original, tamaño, fecha de carga, estado.
- **Tabla:** `public.age_verifications` (ver `db/data-model.md` §3.2) con estados, timestamps y `reviewed_by`.
- **Validación cliente:** `zod` valida `mime_type` y `file_size_bytes` antes de subir.
- **UI admin:** ruta interna `/admin/age-verifications` (detrás de `service_role` o claim custom) que lista la cola y permite aprobar/rechazar con nota.
- **Trigger en Postgres:** `public.ensure_verification_aprobada(user uuid)` usado por `tournament_registrations.insert` para bloquear inscripciones de usuarios sin verificación.
- **Retención:** documento eliminado automáticamente **90 días** después de aprobación (cron job o edge function). Los metadatos (`status`, `reviewed_at`) se conservan; el archivo no.
- **Acceso de lectura del doc:** **sólo service role, sólo desde la interfaz admin, con logging explícito**. El dueño nunca re-descarga el archivo.

### Criterios de aprobación (escritos para la cola admin)

- Documento oficial con fecha de nacimiento legible (cédula de ciudadanía, pasaporte, cédula de extranjería CO).
- Fecha de nacimiento ≥ 18 años al día de hoy.
- Nombre y foto coinciden con el perfil (cuando el perfil tenga avatar).
- Si el documento no cumple, estado `rechazada` con motivo estándar (baja calidad, caducado, ilegible, no coincide).
- Si el usuario es menor, estado `menor_edad` (bloqueo permanente para MVP1).

## Consecuencias

- **Positivas:**
  - Costo marginal cero por verificación.
  - Control total sobre datos sensibles, hosting Supabase sin vendor extra.
  - Cumple RF-007 y los pendientes de MVP1 sin dilatar G3.
- **Negativas:**
  - Requiere una operación humana; si crece el volumen habrá que migrar a un proveedor externo.
  - No hay liveness check; se acepta el riesgo para el tamaño de MVP1.

## Revisión (trigger de re-evaluación)

Re-evaluar pasar a Opción A si:

- Onboarding diario supera 20 usuarios / día durante 2 semanas seguidas.
- Se detecta evidencia de fraude sistemático (múltiples cuentas con mismo documento, etc.).
- El producto expande a jurisdicciones con KYC obligatorio.

## Seguimiento

- ADR-003 se anota en `docs/project-changelog.md` y se vincula a la futura HU-002 / Sprint 1.
- Documentar SOP de la revisión manual (qué mirar, cómo rechazar, cómo comunicar) en `security/age-verification-sop.md` cuando G7 requiera checklists de seguridad.
