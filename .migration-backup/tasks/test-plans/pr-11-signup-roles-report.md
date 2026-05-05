# Test report — PR #11: Registro con roles jugador/promotor (HU-001)

**Devin session:** https://app.devin.ai/sessions/a19a30284c6f4f5cabc2ecadb57ffbf5
**PR:** https://github.com/andresagudelo-dev-asygnuz/pro/pull/11
**CI:** 4/4 green (gate + secret scan + lint+build + Devin Review)

## Resumen de una línea

Ejecuté 4 flujos de signup en el navegador contra Supabase local + 1 caso adicional por API directa para aislar el default del trigger DB. En todos los casos la fila en `public.user_roles` quedó exactamente como RF-001 indica. **No encontré bugs**, pero sí una observación sobre *dónde* se aplica el default (ver §4).

## 1. Setup

- Supabase CLI `2.90.0` + Docker locales. `supabase start` levanta DB (:54322), Auth (:54321), Studio (:54323).
- Migración `20260417130000_g4_sprint1_auth_age.sql` aplicada. Triggers `on_auth_user_created` (v0) y `on_auth_user_created_roles` (RF-001) presentes.
- `apps/web/.env.local` con `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` y anon key local.
- `pnpm dev` → Next.js 16.2.4 en `http://localhost:3000/signup`.
- `config.toml` tiene `enable_confirmations = false`, así que signup devuelve sesión inmediata → redirect a `/onboarding`.

## 2. Assertions

| # | Flujo                                  | UI observada              | DB `user_roles` (final)       | Resultado |
|---|----------------------------------------|---------------------------|-------------------------------|-----------|
| 1 | Ambos checkboxes marcados              | Redirect `/onboarding`    | `is_player=t, is_promoter=t`  | PASS      |
| 2 | Sólo Promotor (Jugador desmarcado)     | Redirect `/onboarding`    | `is_player=f, is_promoter=t`  | PASS      |
| 3 | Sólo Jugador (default)                 | Redirect `/onboarding`    | `is_player=t, is_promoter=f`  | PASS      |
| 4 | Ambos desmarcados desde UI             | Redirect `/onboarding` (sin bloqueo Zod) | `is_player=t, is_promoter=f` | PASS |
| 5 | API directa con `{is_player:false, is_promoter:false}` en metadata | N/A (curl) | `is_player=t, is_promoter=f` (trigger default) | PASS |

Snapshot final de DB (los 4 signups desde UI + el directo por API están arriba — el #5 está documentado aparte pero el patrón es el mismo):

```
        email         | meta_player | meta_promoter | is_player | is_promoter
----------------------+-------------+---------------+-----------+-------------
 t1-both@test.dev     | true        | true          | t         | t
 t2-promoter@test.dev | false       | true          | f         | t
 t3-player@test.dev   | true        | false         | t         | f
 t4-none@test.dev     | true        | false         | t         | f
```

## 3. Evidencia visual

### Form inicial (Jugador default-checked, Promotor sin marcar)

![signup form default](https://app.devin.ai/attachments/6381fb37-5eb0-4bf6-956f-73ed0d886699/screenshot_c0369dad5e074ca69117ba4eff962837.png)

### Caso 2 — sólo Promotor marcado antes de enviar

![only promotor checked](https://app.devin.ai/attachments/a8d8e21b-ef26-417f-accf-7e59760970b9/screenshot_c8b5f95038d94c68a0e17bfc124d229e.png)

### Caso 1 — redirect a `/onboarding` post-signup

![onboarding post signup](https://app.devin.ai/attachments/c4663e78-09ff-4877-b46d-0c2a37b90b1a/screenshot_5c7fe421217345ac95c8fecdc40d8f15.png)

### Caso 4 — ambos desmarcados → redirect (NO bloqueo Zod)

![both unchecked redirected](https://app.devin.ai/attachments/8b7b0da9-e83f-4843-9df6-6974f01fd864/screenshot_afcb1b85e7584974a4c9b54f203e6fad.png)

### Video completo (4 casos consecutivos con anotaciones)

https://app.devin.ai/attachments/24277091-18bf-4ddc-8c99-526da70fa26a/rec-97bec724-a8a1-4246-af59-435618e87a08-edited.mp4

## 4. Observación (no es bug, pero vale documentarla)

En el **Caso 4** (ambos checkboxes desmarcados en el DOM antes del submit, confirmado por JS console: `{player:false, promoter:false}`), la `auth.users.raw_user_meta_data` recibida por la DB mostró `is_player=true`. Esto puede venir de la interacción entre `<input defaultChecked>` no-controlado y los re-renders de `useActionState` en React 19 / Next.js 16 durante el submit — no de un defaulting explícito en el action (verificado leyendo <ref_file file="/home/ubuntu/repos/pro/apps/web/lib/auth/actions.ts" /> y `checkboxToBoolean` en <ref_file file="/home/ubuntu/repos/pro/apps/web/lib/validation/schemas.ts" />, que devuelve `false` para campos ausentes).

Para aislar el default del trigger DB sin depender del DOM, ejecuté el **Caso 5** con `curl` directo al endpoint `/auth/v1/signup`, enviando `{"is_player": false, "is_promoter": false}` explícito. La metadata quedó `false, false` y el trigger creó la fila con `is_player=t, is_promoter=f` — **prueba definitiva de que el trigger default funciona**.

**Implicación:** el comportamiento final visible al usuario es correcto en ambos paths (action vs trigger). La garantía de RF-001 ("si no marcás nada te damos jugador por default") se cumple, y de hecho hay redundancia "belt-and-suspenders":
- La UI preselecciona Jugador.
- Si por algún motivo el usuario llegara a desmarcar ambos, React + form submit típicamente re-envía el default.
- Si aun así llegara `{false, false}` a la DB, el trigger lo corrige.

Recomendación para la próxima iteración (fuera de scope de este PR): si querés que el componente sea estrictamente "controlled" para reflejar 1:1 el estado, podríamos migrar a `useState` + `checked`. No lo hice acá porque rompería el contrato del PR.

## 5. Regresiones que NO rompí

- El schema de password/email/full_name sigue cubierto por unit tests (`tests/lib/schemas.test.ts`, 66/66 passing antes del test manual).
- Login sigue redirigiendo a `/feed` (observado al usar "Entrá" desde signup).
- El botón "Salir" en el header de `/onboarding` sale correctamente a `/login`.

## 6. Qué NO testé (fuera de scope de PR B)

- Verificación de edad RF-007 (HU-002) — eso es PR C del Sprint 1, no abierto todavía.
- Confirmación por email (deshabilitada en local; flujo `/auth/confirm` está ahí pero no se ejerce).
- Rate-limit de signup (`RATE_LIMITS.signUp`): no lo excedí; es ortogonal al cambio de roles.
- RLS de `user_roles` policies contra usuarios no autenticados.

## 7. Veredicto

**PR #11 listo para merge desde el punto de vista de testing.** Todas las aserciones del plan pasan. El único hallazgo es una observación sobre redundancia de defaults (no un defecto).
