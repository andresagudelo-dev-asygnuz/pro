# Test plan — PR #11: Registro con roles jugador/promotor (HU-001)

## Qué cambió (user-visible)

- El form de signup ahora muestra un **fieldset "Quiero usar PRO como"** con dos checkboxes: `Jugador` (marcado por default) y `Promotor`. El usuario puede elegir uno, los dos, o ninguno.
- Backend: `supabase.auth.signUp({ options: { data: { full_name, is_player, is_promoter } }})` propaga los flags; el trigger DB `on_auth_user_created_roles` crea la fila en `public.user_roles` con `is_player=true` por default si ambos llegan falsos.

## Flujo primario a demostrar

Probar los **4 estados del toggle** en un solo recording corto, verificando cada vez lo que queda en la DB. Esto es lo único que demuestra que el cambio funciona end-to-end.

### Precondiciones
- Supabase local en `http://127.0.0.1:54321`, migraciones aplicadas (incluida `20260417130000_g4_sprint1_auth_age.sql`).
- Dev server en `http://localhost:3000`.
- No hay filas previas en `public.user_roles` para los emails que vamos a usar.

### Casos (1 recording, 4 signups consecutivos)

Para cada caso: navegar a `/signup`, completar Nombre / Email / Password, **setear el estado exacto de los checkboxes**, submit, observar UI, luego salir y verificar DB.

| # | Email             | UI action en checkboxes               | Expected UI                           | Expected en `user_roles`                                             |
|---|-------------------|---------------------------------------|---------------------------------------|----------------------------------------------------------------------|
| 1 | t1-both@test.dev  | dejar `Jugador` ✔, marcar `Promotor` ✔| Redirect a `/onboarding`              | 1 fila: `is_player=t, is_promoter=t`                                 |
| 2 | t2-promoter@test.dev | desmarcar `Jugador`, marcar `Promotor` ✔ | Redirect a `/onboarding`           | 1 fila: `is_player=f, is_promoter=t`                                 |
| 3 | t3-player@test.dev | dejar `Jugador` ✔, `Promotor` sin marcar | Redirect a `/onboarding`          | 1 fila: `is_player=t, is_promoter=f`                                 |
| 4 | t4-none@test.dev  | **desmarcar ambos**                    | Redirect a `/onboarding` (UI ya NO bloquea; el fix del refine Zod lo permite) | 1 fila: `is_player=t, is_promoter=f` (default aplicado por trigger DB) |

### Assertions concretas (todas verificables)

1. **Caso 1 (ambos):** el `SELECT is_player, is_promoter FROM user_roles WHERE user_id = <id de t1>` devuelve `t | t`. Si devuelve cualquier otra combinación → FALLA.
2. **Caso 2 (sólo promotor):** devuelve `f | t`. Esto prueba que el action **propaga correctamente** flags y que el trigger **no fuerza jugador cuando el usuario explícitamente eligió promotor**. Si devolviera `t | t` o `t | f` → FALLA.
3. **Caso 3 (sólo jugador):** devuelve `t | f`.
4. **Caso 4 (ambos desmarcados):** devuelve `t | f` — esto es el **default aplicado por el trigger DB**, y prueba que:
   - El schema Zod aceptó `is_player=false, is_promoter=false` (antes del fix habría bloqueado con "Elegí al menos un rol").
   - El trigger `on_auth_user_created_roles` detectó `both false` y fuerza `is_player=true`.
   - Si devolviera `f | f` → FALLA (trigger no corrió o no aplicó default).
   - Si el submit hubiera sido bloqueado por validación Zod antes de llegar al action → FALLA (el refine no se quitó correctamente).

### ¿Esta misma secuencia se vería igual si el cambio estuviera roto?

No.
- Si el action **no propagara** los flags: los 4 casos quedarían como `is_player=true, is_promoter=false` (sólo el default del trigger). Caso 1 y 2 fallarían.
- Si el `.refine()` Zod siguiera vigente: Caso 4 mostraría error "Elegí al menos un rol" en vez de redirect.
- Si el trigger DB no estuviera: no habría fila en `user_roles` tras ningún signup (o fallaría el signup entero).

### Evidencia a capturar

- Recording del navegador ejecutando los 4 signups en orden (con record_annotate para cada caso).
- Screenshots del fieldset en al menos 2 estados distintos (por defecto + con ambos marcados).
- Output de `SELECT u.email, ur.is_player, ur.is_promoter FROM auth.users u JOIN public.user_roles ur ON ur.user_id = u.id WHERE u.email LIKE 't_-%@test.dev' ORDER BY u.email;` al final, mostrando las 4 filas esperadas en una sola tabla.

### Fuera de alcance de este test

- Confirmación por email (deshabilitada en local, `enable_confirmations=false`).
- Rate-limit de signup (orthogonal al cambio).
- Validación de password length / email format (no cambió en este PR; cubierto por vitest).
- Storage bucket / age_verifications (PR C).
