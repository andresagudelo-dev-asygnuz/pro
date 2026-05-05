# PR #16 · HU-003 PR B · Bloque 1 Identidad + visibilidad · Reporte end-to-end

**Rama:** `devin/1776720773-g4-sprint2-hu003-prb-identity`
**Build bajo test:** production build (`pnpm build && pnpm start`) contra Supabase local
**Fecha:** 2026-04-20
**Usuario de test:** `prbplayer@test.dev` (`2dcdfad8-b1d9-4fc1-a7c5-f0166ffe805b`), `age_verifications.status='aprobada'`, `profiles_core` limpio al iniciar.
**Recording:** adjunto en el mensaje.

## Resumen

- **T1 · Happy path con overrides de visibilidad** → **PASS**
- **T2 · Catalog tamper (primary_sport_id via DevTools)** → **PASS**

Ambos tests ejercitan código específico del PR: upsert a `profile_field_visibility` con `onConflict: user_id,field_key` (T1) y validación server-side contra el catálogo `sports` (T2).

## T1 · Happy path con overrides de visibilidad — PASS

**Procedimiento:**
1. Navegar a `/perfil` (logueado, edad aprobada).
2. Completar 7 campos: `full_name="Juan Alberto Pérez García"`, `birth_date=2000-05-10`, `city="Manizales"`, `region="Caldas"`, `country="CO"`, `primary_sport_id="futbol"` (default), `interests_raw="nutrición deportiva, senderismo"`.
3. Cambiar visibilidad: `identity.city` → **Privado**, `identity.interests` → **Promotores**.
4. Click **Guardar bloque 1**.

**Asserts UI:** banner de éxito `Perfil actualizado.` visible bajo el slug, sin errores.

![T1 success banner](./pr-16-t1-success.png)

**Asserts DB (`profile_field_visibility`):**

```
       field_key        |   level
------------------------+------------
 identity.city          | privado       ← override aplicado
 identity.country       | publico
 identity.full_name     | publico
 identity.interests     | promotores    ← override aplicado
 identity.primary_sport | publico
 identity.region        | publico
 identity.soft_skills   | publico
(7 rows)
```

**Asserts DB (`profiles_core`):** 1 fila con `full_name='Juan Alberto Pérez García'`, `city='Manizales'`, `country='CO'`, `primary_sport_id='futbol'`, `slug='juan-alberto-perez-garcia'`, `interests={"nutrición deportiva","senderismo"}`.

**Por qué este test distingue "funciona" de "roto":** si el batch upsert a `profile_field_visibility` ignorara los overrides y persistiera los defaults del catálogo, las filas `identity.city` e `identity.interests` aparecerían como `publico`. El test requiere los **valores exactos** `privado` y `promotores`, no un conjunto equivalente.

## T2 · Catalog tamper (primary_sport_id) — PASS

**Procedimiento (con T1 ya guardado — row `profiles_core` existe con `primary_sport_id='futbol'`):**
1. Con DevTools console inyectar una opción fake en el `<select>`:
   ```js
   const s = document.querySelector('select[name="primary_sport_id"]');
   const o = document.createElement('option');
   o.value = 'deporte-inexistente'; o.textContent = 'Tampered (DevTools)';
   s.appendChild(o); s.value = 'deporte-inexistente';
   s.dispatchEvent(new Event('change', { bubbles: true }));
   ```
2. Click **Guardar bloque 1**.

**Asserts UI:** fieldError exacto `Deporte no disponible.` bajo el `<select>` + banner general `Revisá los campos marcados.`.

![T2 fieldError](./pr-16-t2-error.png)

**Asserts DB (tras el submit fallido):**

```
 user_id                              | primary_sport_id | updated_at
--------------------------------------+------------------+---------------------------
 2dcdfad8-b1d9-4fc1-a7c5-f0166ffe805b | futbol           | 2026-04-20 22:26:07.41+00
```

`primary_sport_id` sigue siendo `futbol` (de T1), **no** `deporte-inexistente`. El server rechazó la request antes del upsert.

**Por qué este test distingue "funciona" de "roto":** la validación client-side del `<select>` aceptó el valor inyectado (la option fake se agregó al DOM). Si la Server Action `saveIdentityBlock` no hiciera el lookup server-side contra `sports` (L94–104 de `identity-actions.ts`), la DB quedaría con el valor inválido. El test requiere **ambos** el mensaje de error específico y la ausencia de update en DB.

## Fuera de scope del recording

- **BUG_0001 fix (fechas semánticamente inválidas)**: cubierto por 5 casos unit en `schemas.test.ts` (`2000-13-01`, `2000-00-01`, `2000-02-30`, `2000-04-31`, `2000-01-32`). El input `<type="date">` del navegador clampea client-side, por eso no es testeable por UI; la defensa server-side (`superRefine` con round-trip `Date → toISOString`) se valida en tests unit.

## Friction observado (no bloqueante, no afecta el veredicto)

- **Next.js 16 dev mode HMR cross-origin blocking**: durante la preparación del test noté que `pnpm dev` desde 127.0.0.1 hace full page reloads en vez de HMR updates, lo que reseteaba el form state al interactuar con los dropdowns. **Workaround**: usar production build (`pnpm build && pnpm start`) para testing. No es un bug del PR, es un tema del entorno dev con Next 16 cuando el host no es `localhost`. Anotado para actualizar el SKILL de testing local.

## Estado final de DB (verificación de cierre)

```sql
SELECT field_key, level FROM profile_field_visibility
WHERE user_id='2dcdfad8-b1d9-4fc1-a7c5-f0166ffe805b' ORDER BY field_key;
-- 7 rows: city=privado, interests=promotores, resto=publico ✓

SELECT COUNT(*) FROM profiles_core
WHERE user_id='2dcdfad8-b1d9-4fc1-a7c5-f0166ffe805b';
-- 1 ✓ (de T1; T2 no creó ni modificó filas)
```

## Veredicto

PR #16 cumple los criterios de HU-003 PR B para Bloque 1 Identidad: el upsert batch de visibilidad persiste overrides correctos y la Server Action valida catálogos server-side rechazando tampers client-side. Lista para merge desde el punto de vista de testing.
