# PR #14 — HU-002 cola admin de verificaciones — test report

- **PR**: https://github.com/andresagudelo-dev-asygnuz/pro/pull/14
- **Commit testeado**: `8385251` (fix race condition + patrón submitter HTML)
- **CI**: 4/4 verde
- **Entorno**: Supabase local (127.0.0.1:54321) + dev server Next 16 local (127.0.0.1:3000), `ADMIN_EMAILS=admin@test.dev`
- **Plan**: [`pr-14-admin-review.md`](./pr-14-admin-review.md)
- **Sesión Devin**: https://app.devin.ai/sessions/a19a30284c6f4f5cabc2ecadb57ffbf5

## TL;DR

Ejecuté el plan completo contra Supabase local. 4/4 tests **PASS**. El fix de race condition del commit `8385251` se probó de la forma más adversarial posible: primer click sobre "Aprobar" en `/admin/verificaciones` recién cargado, sin ningún click previo. Antes del fix (commit `279cfcc`) este mismo click habría mostrado "Revisá los campos marcados." porque `decision=""`. Con el fix, la fila se aprueba en un solo click y la DB confirma `status='aprobada'` + `reviewed_by` + `reviewed_at`.

## Resultados

| # | Test | Resultado |
|---|---|---|
| T1 | Primer click de "Aprobar" aprueba la verificación (fix race condition) | PASS |
| T2 | Rechazar con motivo en la fila consecutiva | PASS |
| T3 | No-admin no ve nav "Admin" y `/admin/verificaciones` redirige | PASS |
| T4 | Banner rojo muestra motivo del rechazo al usuario | PASS |
| T5 | Race entre dos admins (opcional) | NO EJECUTADO — no es parte del cambio de `8385251` |

## Evidencia

### T1 — Primer click de "Aprobar" (PRIMARIO: fix race condition)

Pre: dos filas pendientes, recién logueado como admin, primer click absoluto sobre Aprobar de la primera fila.

Antes (2 pendientes, botones submit con `name="decision" value="aprobada"`):

![antes aprobar](https://app.devin.ai/attachments/a72b227d-ea40-4adc-a260-63ff6a83c730/screenshot_7b59c85804b94d5386cf88a334035be9.png)

Después del único click: la fila aprobada desaparece de la cola, queda 1 pendiente.

![después del primer click](https://app.devin.ai/attachments/4c7aaa41-3257-489f-b2e9-7c2f0cb4906b/screenshot_5bd3b8d45c9848d8a92976d06097555f.png)

DB inmediatamente después:
```
id=7a837b23...     status=aprobada   reviewed=t  reviewed_at=2026-04-20 20:13:50  rejection_reason=NULL
id=ebdd0067...     status=pendiente  reviewed=f
```

Por qué es adversarial: si el hidden input + `useState<decision>` del commit `279cfcc` siguieran en pie, FormData llevaría `decision=""` y Zod respondería "Revisá los campos marcados." — la fila NO habría cambiado de estado. Aquí cambió.

### T2 — Rechazar con motivo

Abrí "Rechazar…" sobre la fila restante, escribí el motivo, confirmé.

![motivo del rechazo](https://app.devin.ai/attachments/22deaff4-522b-4fa5-816a-09fd211108df/screenshot_74c99bc2d2a940cd80913d83abe73dcd.png)

Cola tras confirmar: "No hay verificaciones pendientes."

![cola vacía](https://app.devin.ai/attachments/0e406165-02ab-4c0a-a1c5-d58fee56690f/screenshot_4b1bd3c140864472b30fef3dce739ab3.png)

DB:
```
id=ebdd0067...     status=rechazada  reviewed=t  reviewed_at=2026-04-20 20:14:22  rejection_reason="Foto borrosa, no se lee la fecha de nacimiento."
```

### T3 — Guard anti-escalación (no-admin)

Signup fresh de `notadmin@test.dev` (no está en `ADMIN_EMAILS`). El nav de este usuario tiene solo Feed + Crear partido, **NO** tiene "Admin":

![nav sin admin](https://app.devin.ai/attachments/538e228e-f9cd-4442-b2ab-29a607b75a94/screenshot_23f2de9362904253abc4673038e2ac34.png)

Navegación manual a `/admin/verificaciones` devuelve 307 → `/feed` 307 → `/onboarding` 200 (logs del dev server). El usuario nunca renderiza la página admin. `requireAdmin()` redirige silenciosamente, sin revelar la existencia de rutas admin con 403/404.

Log exacto:
```
GET /admin/verificaciones 307 in 937ms
GET /feed 307 in 971ms
GET /onboarding 200 in 1023ms
```

### T4 — Banner del usuario refleja el rechazo

Login como `t4-none@test.dev` (reseteé su password vía admin API, service_role, para poder loguearme). Banner rojo al tope:

![banner rechazada](https://app.devin.ai/attachments/dd19326b-ecaf-4950-b97d-c0dc95ca3e83/screenshot_25cdbc6472954e79bcaecbb5754b5379.png)

Texto exacto: "Tu verificación fue rechazada. Motivo: Foto borrosa, no se lee la fecha de nacimiento.." — confirma que la acción admin llega end-to-end al UX del usuario.

## Issues encontrados durante el testing

- **Widespread 404 al arrancar dev server** (hard block temporal): `.next/dev` de sesiones previas devolvía 404 para todas las rutas de route groups (`/signup`, `/login`, `/feed`, `/verificacion`, etc.). Root `/` sí respondía 200. Fix: `rm -rf apps/web/.next` y reiniciar. No es un bug del PR — parece cache stale de Turbopack entre builds. Lo dejé anotado en la skill para futuras sesiones.
- **Friction menor (pre-existente, fuera de scope de PR #14)**: los logs siguen mostrando `invalid reference to FROM-clause entry for table "rate_limits"` en `[rate-limit] failed to check, allowing by default: ...`. La tabla `rate_limits` no existe en el esquema actual, el guard cae a "permitir por default". Ya venía reportado en el testing de PR #13 y pendiente para Sprint 2.

## Cobertura del checklist del PR

| Checklist del PR (human) | Cubierto |
|---|---|
| Setear `ADMIN_EMAILS` + ver "Admin" en nav | ✓ (T1 precondición + T3) |
| Smoke E2E admin (aprobar + rechazar) | ✓ (T1 + T2 + T4) |
| Guard anti-escalación no-admin | ✓ (T3) |
| Sin service_role key → error UX controlado | NO EJECUTADO (no reduje la env para no romper T1-T4) |

## Cosas que explícitamente NO testeé

- **5 additional findings del Devin Review** que GitHub no me expuso — el usuario ya dijo que procedemos sin abrirlos.
- **T5 race entre dos admins**: la lógica `.eq("status","pendiente")` + `maybeSingle()` es del commit `279cfcc` y no fue tocada por el fix a testear. La mantengo como bonus para un futuro plan.
- **Notificaciones por email al aprobar/rechazar**: explícitamente fuera de alcance MVP1 (según `sprint-week-01.md`).
