# Sprint 6 · Hotfixes HU-005 (RLS + trigger) — 2026-04-30

Sprint acotado posterior al merge de HU-006 (PR #30). Cierra la deuda técnica
que quedó registrada desde el review de HU-005 (PR #29), donde el fundador
eligió explícitamente mergear tal cual y mover los 🔴 secundarios a Sprint 6.

## Objetivo

Cerrar los dos hardenings de `public.tournament_registrations` que el review
de Devin Review marcó como 🔴:

1. **Trigger `sync_tournament_slots_on_status_change`** sin validación del
   estado del torneo al re-confirmar.
2. **RLS `tr_update_self_or_owner`** sin `WITH CHECK` por rol.

Ningún cambio de producto ni de UI — solo hotfixes en DB.

## Cambios entregados

### DB — `apps/web/supabase/migrations/20260430140000_g4_sprint6_hotfixes_registrations.sql`

- `create or replace function public.sync_tournament_slots_on_status_change()`
  que adicionalmente:
  - Lee `tournaments.status` junto con `slots`/`slots_filled` bajo el mismo
    `for update`.
  - Al transicionar `cancelada|lista_espera → confirmada`, valida que el
    torneo esté en `abierto_inscripciones`. Si no, `raise exception
    'tournament_not_open' using errcode = 'P0001'`.
  - Mantiene el comportamiento previo para `confirmada → !confirmada`
    (liberar cupo sigue permitido aunque el torneo ya esté cerrado — cancelar
    un inscripto en un torneo `cerrado_inscripciones` sigue siendo legítimo).
- `drop policy ... + create policy "tr_update_self_or_owner"` con
  `WITH CHECK` explícito:
  - Rama **promotor**: `exists (select 1 from tournaments tr where tr.id =
    tournament_registrations.tournament_id and tr.owner_id = auth.uid())` —
    puede setear los tres estados operativos.
  - Rama **self**: `registered_by = auth.uid() AND status = 'cancelada'` —
    cualquier otro destino queda fuera del check y RLS lo rechaza.
  - Documentada con `comment on policy ...` que explica el contrato.

### Backend / Frontend

No hay cambios. `mapRegistrationError` ya mapea `tournament_not_open` a
"El torneo no está abierto a inscripciones." desde HU-005, así que el
nuevo `raise exception` del trigger se reporta al usuario con texto humano
sin tocar una línea de TS.

### Tests

No se agregaron tests nuevos: los 153 tests existentes siguen pasando. Los
fixes son a nivel DB (trigger + RLS) y se validan end-to-end en QA (Sprint
QA / G5), no en vitest con mocks de `supabase-js`.

## Validación local

| Check | Resultado |
|---|---|
| `pnpm lint` (apps/web) | 0 errors · 15 warnings (preexistentes, no tocados) |
| `pnpm typecheck` | OK |
| `pnpm test` | 153/153 PASS |
| `pnpm build` | OK (sin cambios en rutas) |

## Deuda técnica restante post Sprint 6

- **6 findings menores de Devin Review** en PR #30: la app web de Devin
  Review devolvió error 500 al intentar cargarlos (`Error: Unable to preload
  CSS for /assets/PRDetailPage-*.css`) y los detalles no están expuestos por
  la API de GitHub. Se revisan en G5 QA cuando Devin Review restablezca la
  UI o cuando se haga QA manual del módulo. Registrado en
  `memory/daily/2026-04-30.md`.
- **Migración consolidada a G5**: el trigger `sync_tournament_slots_on_status_change`
  fue `create or replace`-ado, así que la definición canónica vive ahora en
  la Sprint 6 migration. Conviene validar en ambiente limpio que el Sprint 5
  original + Sprint 6 hotfix produce el mismo esquema que un "full rebuild"
  desde scratch antes de cerrar G4.

## Cierre

Con este sprint se considera cerrada la deuda 🔴 del flujo de torneos end-to-end
(HU-004 + HU-005 + HU-006). Queda listo para arrancar **G5 QA**: plan de
pruebas E2E, test accounts con rol promotor + jugador, cobertura ≥80% en
`lib/tournaments/*` y verificación RLS en ambiente Supabase real.
