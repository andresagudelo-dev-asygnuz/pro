# PR #13 — HU-002 Verificación de edad — Reporte de testing

> Branch `devin/1776532510-g4-sprint1-prc-age-verification` @ `3b29819`. Contra Supabase local (stack sano) + Next.js dev (Turbopack). Sesión Devin: https://app.devin.ai/sessions/a19a30284c6f4f5cabc2ecadb57ffbf5

## TL;DR

- **3/3 tests PASS**. Los dos fixes del Devin Review (form reset con `uploadedAt` + `revalidatePath("/", "layout")`) funcionan.
- DB y Storage consistentes: 2 filas `status='pendiente'` en `public.age_verifications`, 2 objetos en el bucket privado `age-verifications`, nombres alineados con el `storage_path`.
- **Escalación**: durante el testing encontré un **runtime blocker independiente** que tuve que arreglar antes de poder probar (Next.js 16 rechaza re-exports no-async en archivos `"use server"`). Fix commiteado como `3b29819` y CI pasó verde antes de testear. Ver §Issues encontrados.
- **Findings no abordados** (ya reportados antes): `requireAgeVerificationAprobada` no invoca `requireUser()`; no se ejercita en Sprint 1, decisión tuya si va en este PR o followup.

## Entorno

- Dev server: `http://localhost:3000` (Next.js 16.2.4 Turbopack).
- Supabase local: todos los contenedores sanos.
- Usuario de prueba: `t4-none@test.dev` / id `46a921be-ce7b-4b7f-8cc3-18e0a5e41790` (reutilizado del testing de PR #11, sin fila previa en `age_verifications`).
- Archivos: `/tmp/test-files/dni-1.pdf` y `dni-2.pdf` (551 B cada uno, PDFs mínimos válidos).

## Tests

### 1. `It should upload a doc, reset form, and refresh banner layout-wide` — **PASS**

Precondición: `/verificacion` sin fila previa → badge "Sin verificar", banner naranja (warn) arriba con "Para inscribirte a torneos necesitamos verificar que sos +18." + link "Subí tu documento".

![baseline /verificacion warn banner](https://app.devin.ai/attachments/ac02af5f-bcae-413f-b256-c6d5c0a8f897/screenshot_31854d52dcdd441f82d5aff075598095.png)

Tras subir `dni-1.pdf` y clic en "Enviar para revisión":

- Mensaje exacto de éxito: **"Documento subido. Lo vamos a revisar y te avisamos por email cuando esté aprobado."**
- Form **reseteado**: `input[type=file]` vacío (sin `text="..."` en el DOM, sin línea "Seleccionado: ...").
- Botón **"Enviar para revisión"** → `disabled="true"`.
- Panel **"Estado actual"** pasa a badge **"Pendiente"** + copy **"Tu documento está en revisión. Te avisamos por email cuando se resuelva."** + timestamp del último documento subido.
- Banner superior pasa de naranja `warn` a gris `info` con texto **"Tu documento está en revisión. Te avisamos cuando se resuelva."** + link **"Ver estado"**.

![1er upload completo — form reseteado + banner info](https://app.devin.ai/attachments/8dfa96cc-e83c-4fae-89d6-5315928a783d/screenshot_84839d342ccd419aa6c1998ca1e20738.png)

### 2. `It should reset form on second consecutive upload (uploadedAt dep)` — **PASS**

Sin recargar la página, subí `dni-2.pdf` y lo envié. Assertion adversarial del fix #1: si el `useEffect` dependiera de `state.message` (string idéntico entre ambos uploads), React no re-dispararía el effect y el form quedaría con `dni-2.pdf` aún seleccionado.

Lo observado:

- Segundo mensaje de éxito aparece.
- Form reseteado **de nuevo** (input vacío, botón disabled).
- "Último documento subido" en el panel cambia de `00:50 a. m.` a `00:51 a. m.` → confirma que la Server Action corrió dos veces distintas.

![2do upload — form reseteado otra vez + timestamp actualizado](https://app.devin.ai/attachments/cf417ef8-822d-4932-afdb-99e079341864/screenshot_848538ff687d4fa99c601f2a18888401.png)

### 3. `It should show pending banner in /feed without reload (layout revalidate)` — **PASS**

Clic en "Feed" en el header → el user aún tiene onboarding incompleto, así que Next hace `redirect(/onboarding)`. Tanto `/onboarding` como `/feed` viven bajo el mismo layout `(app)` que renderiza el banner. Observé:

- URL `/onboarding` (no forcé reload; fue navegación client-side seguida de server redirect).
- Banner en la parte superior: gris `info`, texto **"Tu documento está en revisión. Te avisamos cuando se resuelva."**, link "Ver estado" → `/verificacion`.

Esto prueba que `revalidatePath("/", "layout")` funciona: el banner se actualizó no sólo en `/verificacion` sino en otras rutas del grupo `(app)`. Sin el fix, el banner en esta ruta seguiría siendo naranja con "Subí tu documento".

![Banner en /onboarding tras upload — info pendiente](https://app.devin.ai/attachments/dcc4db29-d62a-43f7-a597-c89b5944d598/screenshot_6479db5491d6430a9f8af89e52bbd108.png)

### 4. DB + Storage consistencia — **PASS**

```
$ docker exec supabase_db_pro psql -U postgres -d postgres -c "select u.email, av.status, av.storage_path, av.uploaded_at from public.age_verifications av join auth.users u on u.id=av.user_id order by av.created_at desc limit 5;"
      email       |  status   |                              storage_path                              |        uploaded_at
------------------+-----------+------------------------------------------------------------------------+----------------------------
 t4-none@test.dev | pendiente | 46a921be-ce7b-4b7f-8cc3-18e0a5e41790/1776646276221_74e4eeb65bbe556a.pdf | 2026-04-20 00:51:16.273+00
 t4-none@test.dev | pendiente | 46a921be-ce7b-4b7f-8cc3-18e0a5e41790/1776646248102_ff6823d0bb4c68a1.pdf | 2026-04-20 00:50:48.171+00
(2 rows)
```

```
$ docker exec supabase_db_pro psql -U postgres -d postgres -c "select name, bucket_id from storage.objects where bucket_id='age-verifications' order by created_at desc limit 5;"
                                  name                                   |   bucket_id
-------------------------------------------------------------------------+-----------------
 46a921be-ce7b-4b7f-8cc3-18e0a5e41790/1776646276221_74e4eeb65bbe556a.pdf | age-verifications
 46a921be-ce7b-4b7f-8cc3-18e0a5e41790/1776646248102_ff6823d0bb4c68a1.pdf | age-verifications
(2 rows)
```

`storage_path` en DB **coincide exactamente** con `name` en storage.

## Issues encontrados durante el testing

### Blocker resuelto: Next.js 16 `"use server"` validation (3b29819)

Primer submit devolvió 500 con `"A 'use server' file can only export async functions, found number."`. Causa: `apps/web/lib/auth/age-verification-actions.ts` exportaba `AGE_VERIFICATION_MAX_BYTES` (constante numérica) como "sanity check". Next.js 16 lo rechaza a runtime. Nadie importa ese constant desde este archivo (la UI y los tests ya lo toman directo de `@/lib/validation/schemas`), así que el fix fue remover el re-export + import. CI 4/4 verde tras el push.

### Friction menor durante el setup (no afecta el PR)

Log del dev server mostró: `[rate-limit] failed to check, allowing by default: { code: '42P01', message: 'invalid reference to FROM-clause entry for table "rate_limits"' }`. El guard del rate-limit **cae correctamente en "permitir por default"**, así que no bloquea el flujo, pero indica que la tabla/vista `rate_limits` no está presente en la migración del Sprint 1. No es parte del scope de este PR; lo dejo como nota para un followup.

## Finding abierto de Devin Review — decisión tuya

`lib/auth/age-verification.ts::requireAgeVerificationAprobada` no llama a `requireUser()` antes de chequear el estado; la docstring dice que sí. El helper **no** se invoca en Sprint 1 (se usará en Sprint 3 desde la inscripción a torneos), así que no afecta este test. Opciones:

- (a) Fixear el helper en este mismo PR antes de mergear.
- (b) Dejar como followup y atender cuando se cablee al inscribir a torneos.

## No cubierto (fuera de scope PR C)

- Flujo admin de aprobar/rechazar (PR D, Sprint 2).
- Enforcement en `/torneos/*` (Sprint 3).
- Caso `menor_edad` (sin UI user-facing en MVP1).
- Rate-limit end-to-end (tabla ausente en la migración actual — ver §Friction).
