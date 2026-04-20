# PR #14 — HU-002 cola admin de verificaciones — test plan

- **PR**: https://github.com/andresagudelo-dev-asygnuz/pro/pull/14
- **Branch**: `devin/1776713429-g4-sprint1-prd-admin-verifications`
- **Last commit**: `8385251` — fix race condition en `verification-review-form.tsx` (patrón submitter HTML).
- **CI**: 4/4 verde.
- **Entorno**: Supabase local (127.0.0.1:54321), dev server local (127.0.0.1:3000).

## ¿Qué cambió y por qué esto es un test adversarial?

El commit **`8385251`** eliminó un bug crítico reportado por Devin Review:

- **Antes** (`279cfcc`): el form usaba `useState<decision>` + un `<input type="hidden" value={decision}>`. Los botones Aprobar/Rechazar llamaban `setDecision(...)` en `onClick` y después el form submiteaba. React batchea el `setState` y el hidden input todavía tiene `""` cuando `FormData` se colecta → Zod rechaza con "Decisión inválida." (mensaje "Revisá los campos marcados.") **en el primer click**.
- **Después** (`8385251`): se removió `useState<decision>` y el hidden input. Los botones submit tienen `name="decision"` con `value="aprobada"` o `value="rechazada"` directo. El submitter de un `<form>` HTML garantiza que su par name/value va en `FormData` sin depender de un re-render.

**El test primario es adversarial porque**: basta un único click **inmediato** sobre Aprobar al entrar fresh a `/admin/verificaciones` para diferenciar ambos mundos. Si el mensaje es "Verificación aprobada." el fix funciona; si es "Revisá los campos marcados." el fix está revertido.

## Fixture

- Usuario `t4-none@test.dev` ya tiene **2 filas `pendiente`** en `age_verifications` (de la sesión de testing de PR #13).
- Admin seeding: `admin@test.dev` (creado en esta sesión vía `/signup`). `ADMIN_EMAILS=admin@test.dev` en `.env.local`.

## Tests

### T1 — PRIMARIO: Primer click de "Aprobar" acepta la verificación (fix race condition)

**Pre**: admin logueado, va a `/admin/verificaciones`. Ve la fila más antigua de `t4-none@test.dev`.

**Acción**: sin tocar ningún otro control, clickear **"Aprobar"** una sola vez.

**Assertions**:
- UI: aparece mensaje de éxito "Verificación aprobada." (no "Revisá los campos marcados.")
- UI: al refrescar la cola, la fila desaparece (queda 1 pendiente).
- DB (`age_verifications` WHERE id = <row1.id>):
  - `status = 'aprobada'`
  - `reviewed_by = <admin.id>`
  - `reviewed_at IS NOT NULL`
  - `rejection_reason IS NULL`

### T2 — Rechazar con motivo, segunda fila consecutiva (patrón submitter sigue funcionando)

**Pre**: queda 1 fila `pendiente` después de T1.

**Acción**: click en "Rechazar…" → se expande textarea → escribir motivo "Foto borrosa, no se lee fecha de nacimiento." → click en "Confirmar rechazo".

**Assertions**:
- UI: aparece mensaje "Verificación rechazada. El usuario verá el motivo al revisar su estado."
- UI: tras la respuesta, el textarea/panel de rechazo se cierra (fix `reviewedAt`).
- UI: la fila desaparece.
- DB (`age_verifications` WHERE id = <row2.id>):
  - `status = 'rechazada'`
  - `reviewed_by = <admin.id>`
  - `reviewed_at IS NOT NULL`
  - `rejection_reason = 'Foto borrosa, no se lee fecha de nacimiento.'`

### T3 — Guard anti-escalación: no-admin no puede entrar a `/admin/verificaciones`

**Pre**: logout del admin. Login como `t4-none@test.dev` (no está en `ADMIN_EMAILS`).

**Acción A**: mirar el nav header → **NO** debe haber link "Admin".

**Acción B**: navegar manualmente a `/admin/verificaciones`.

**Assertions**:
- Acción A: DOM del `<nav>` no incluye `"Admin"` ni href `/admin/verificaciones`.
- Acción B: la URL final es `/feed` (redirect silencioso, sin 403/404 visible).

### T4 — Sanity del banner del usuario (regresión cruzada con PR #13)

**Pre**: después de T1 y T2, `t4-none@test.dev` tiene 1 aprobada + 1 rechazada (ninguna pendiente).

**Acción**: login como `t4-none@test.dev`, ir a `/feed`.

**Assertions**:
- El layout `(app)` debería elegir la última revisión relevante. Dado que `getLatestAgeVerification` ordena por `created_at desc`, y la rechazada es la más reciente (uploaded_at posterior), el banner esperado es **rojo "rechazada"** con el motivo visible.
- Regresión: al pasar a `/verificacion`, la página renderiza el badge "Rechazada" con el motivo del rechazo.

### T5 — (OPCIONAL) Dos admins aprueban la misma fila

Se salta si el tiempo aprieta: esta lógica (`.eq("status","pendiente")` + `maybeSingle`) ya existía en `279cfcc` y **no fue modificada por el fix**, así que no es parte del riesgo del commit a testear. Si se ejecuta: simular el segundo admin enviando directamente al Server Action vía otra pestaña; esperar error UX "La verificación ya fue revisada por otro admin o cambió de estado.".

## Cómo se verifica la DB

```bash
docker exec supabase_db_pro psql -U postgres -d postgres -c "
select av.id, u.email, av.status, av.reviewed_by is not null as reviewed,
       av.reviewed_at, av.rejection_reason
  from public.age_verifications av
  join auth.users u on u.id = av.user_id
 where u.email = 't4-none@test.dev'
 order by av.created_at;
"
```

## Recording

Anotaciones planeadas:
- `setup`: "Seeding admin user + opening /admin/verificaciones"
- `test_start T1`: "It should approve with a single click (race condition fix)"
- `assertion T1`: "Verificación aprobada - row removed, DB confirms status=aprobada"
- `test_start T2`: "It should reject with reason on second consecutive row"
- `assertion T2`: "Verificación rechazada - reason persisted in DB"
- `test_start T3`: "It should redirect non-admin to /feed and hide admin nav"
- `assertion T3`: "Non-admin redirected, no Admin nav link"
- `test_start T4`: "Banner shows correct final state for user"
- `assertion T4`: "Banner shows rechazada with reason"

## Fuera de scope

- Code review (ya lo hizo Devin Review).
- Tests unitarios (84 verdes).
- Los 5 findings adicionales que Devin Review no expuso por GitHub: el usuario ya decidió no abrirlos en esta ronda.
- Notificación por email al aprobar/rechazar (explícitamente fuera de MVP1 por `sprint-week-01.md`).
