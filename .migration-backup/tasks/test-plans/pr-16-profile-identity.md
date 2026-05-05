# Test plan — PR #16 (HU-003 PR B · Bloque 1 Identidad + visibilidad por campo)

PR: https://github.com/andresagudelo-dev-asygnuz/pro/pull/16
Branch: `devin/1776720773-g4-sprint2-hu003-prb-identity`
Session: https://app.devin.ai/sessions/a19a30284c6f4f5cabc2ecadb57ffbf5

## Qué cambió (user-visible)

- Ruta nueva `/perfil` (link "Mi perfil" en `AppNav`) con el Bloque 1 de la
  ficha deportiva: nombre, fecha de nacimiento, ciudad, región, país, deporte
  principal, intereses, habilidades blandas (texto + tags) y slug.
- Cada campo tiene al lado un dropdown de **Visibilidad**:
  Público / Promotores / Privado. Arranca con el default del catálogo
  `visibility_fields` y el usuario puede sobreescribir por campo.
- Al guardar: upsert en `profiles_core` + upsert batch en
  `profile_field_visibility` (uno por campo con visibilidad).
- Gate: si la verificación de edad no está aprobada, `/perfil` redirige a
  `/verificacion`.

## Setup previo (ya hecho, no incluido en la recording)

- Stack Supabase local (`supabase start`).
- Usuario seed: `prbplayer@test.dev` / `Password123!`, `email_confirm=true`,
  `is_player=t`, `age_verifications.status='aprobada'`. Evitamos el flujo de
  signup+admin (probado ya en PR #11 y #14) para enfocar la recording en el
  cambio real de este PR.
- Antes de cada test: `docker exec supabase_db_pro psql ... delete from
  profile_field_visibility where user_id = <seed>; delete from profiles_core
  where user_id = <seed>;` para partir desde estado limpio.

Evidencia que vincula el plan al código:

- Gate: `apps/web/app/(app)/perfil/page.tsx:32`
  (`await requireAgeVerificationAprobada()`).
- Server Action: `apps/web/lib/profiles/identity-actions.ts:51` (validación
  Zod + catálogo `sports` L94-104 + catálogo `skill_tags` L107-128 + upsert
  visibility L181-201).
- Validación fecha semánticamente inválida (fix `e189282`):
  `apps/web/lib/validation/schemas.ts:340-355` (round-trip
  `Date → toISOString`).
- Selector nativo (sin controlled state):
  `apps/web/components/profile/visibility-select.tsx`.
- Default → override visible en DB: `apps/web/lib/profiles/identity.ts`
  combina defaults de catálogo con filas del usuario.

## Tests (primary flow + 1 edge adversarial)

### T1 · Happy path con override de visibilidad

**Objetivo**: demostrar que el form persiste `profiles_core` **y** la visibilidad
elegida por campo — no queda en los defaults del catálogo.

Pasos (en el navegador, ya logueado como `prbplayer@test.dev`):

1. Navegar a `http://127.0.0.1:3000/perfil`.
2. Completar:
   - Nombre: `Juan Alberto Pérez García`
   - Fecha de nacimiento: `2000-05-10`
   - Ciudad: `Manizales`
   - Región: `Caldas`
   - País: `co` (se fuerza a mayúsculas server-side)
   - Deporte: dejar el primero del select (`futbol`)
   - Intereses: `nutrición deportiva, senderismo`
   - Texto habilidades blandas: `Liderazgo positivo bajo presión.`
   - Tags habilidades blandas: click en los pills "Liderazgo" y "Disciplina".
   - Slug: dejar autogenerado.
3. Cambiar visibilidad del campo **Ciudad** a `Privado`.
4. Cambiar visibilidad del campo **Intereses** a `Promotores`.
5. Click **Guardar perfil**.

**Expected**:

- Banner verde "Perfil actualizado." visible en el form.
- Consulta DB `select full_name, city, country, slug from profiles_core where
  user_id = '<seed>'` → `('Juan Alberto Pérez García','Manizales','CO',
  'juan-alberto-perez-garcia')`.
- Consulta DB `select field_key, level from profile_field_visibility where
  user_id='<seed>' and field_key in
  ('identity.city','identity.interests') order by field_key;`:
  - `identity.city | privado`  ← cambió desde default `publico`.
  - `identity.interests | promotores`  ← cambió desde default `publico`.
- Consulta DB `select field_key, level from profile_field_visibility where
  user_id='<seed>' and field_key not in
  ('identity.city','identity.interests');` → el resto queda en `publico`
  (los que el form envió igual al default también se persistieron).

**Por qué este test distingue roto vs. correcto**: si el server ignorara los
`visibility[<field_key>]` del FormData, los niveles quedarían en los defaults
del catálogo (todos `publico`). El test mira explícitamente que **city** y
**interests** sean `privado` y `promotores`, respectivamente. Si `saveIdentity
Block` olvidara el segundo upsert, quedaría sólo la fila de `profiles_core` sin
filas del usuario en `profile_field_visibility`.

### T2 · Tamper adversarial del catálogo (primary_sport_id inexistente)

**Objetivo**: el checklist del PR (#16) pide explícitamente "Intentar guardar
con `primary_sport_id` inexistente (vía DevTools) y verificar que el server
rechaza con fieldError legible." Esto prueba que la validación cruzada contra
`sports` (L94-104) está viva — sin ella, el `onConflict: user_id` upsert podría
escribir un valor basura en `profiles_core.primary_sport_id` y sólo fallar en el
FK constraint con un 500.

Pasos:

1. Desde `/perfil`, abrir DevTools.
2. En la consola, ejecutar:
   ```js
   const opt = document.querySelector('select[name="primary_sport_id"]');
   const fake = document.createElement('option');
   fake.value = 'deporte-inexistente';
   fake.textContent = 'deporte-inexistente';
   opt.appendChild(fake);
   opt.value = 'deporte-inexistente';
   ```
3. Completar el resto de campos obligatorios como en T1 (nombre, fecha, ciudad,
   país).
4. Click **Guardar perfil**.

**Expected**:

- Banner rojo "Revisá los campos marcados." visible.
- Debajo de **Deporte principal**: texto `Deporte no disponible.`.
- DB: `select count(*) from profiles_core where user_id = '<seed>'` → `0`
  (la action retorna antes de alcanzar el upsert).

**Por qué distingue roto vs. correcto**: sin la validación server-side contra
`sports`, el upsert a `profiles_core` violaría el FK `primary_sport_id` y el
usuario vería el mensaje genérico "No pudimos guardar tu perfil." en vez del
fieldError puntual. O peor, si no hubiera FK, quedaría persistido el valor
fake.

## No-goals explícitos (fuera de scope de esta recording)

- T regresión fecha inválida `2000-13-01` — cubierto por 5 tests unitarios en
  `tests/lib/schemas.test.ts` (`pnpm test` local pasa 105/105). El input
  `<input type="date">` del browser clampea la fecha cliente-side así que el
  bypass requeriría DevTools adicional; al tener cobertura unit sólida se deja
  fuera del recording.
- Signup + flujo de admin aprobación — probado en PR #11 y #14.
- Bloques 2/3/4 y vista pública `/u/[slug]` — PR C y PR D.
- `rate_limits` table missing — friction ya reportada en PR #13.
