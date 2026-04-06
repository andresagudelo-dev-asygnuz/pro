# Contexto del producto (Claude Code)

## Estado actual (leer primero)

1. **`tasks/gate-status.md`** — en qué gate estás, qué está aprobado y qué falta.
2. **`tasks/current-gate.txt`** — número del gate activo (1–7) para scripts y CI.
3. **`.factory/state.json`** — espejo opcional para herramientas; si existe, alinear con lo anterior.
4. **`memory/project-memory.md`** — decisiones y contexto acumulado.
5. **`memory/daily/`** — última entrada de diario (fecha más reciente).

## Protocolo de inicio de sesión

1. Leer `tasks/gate-status.md` y `tasks/current-gate.txt` → no asumir: **pregunta si hay duda** antes de reescribir estado.
2. Cargar el **perfil del rol** que corresponda al gate activo desde la fábrica (ver abajo).
3. Cargar el **prompt ejecutable** de esa fase: `prompts/<rol>.md` bajo el repo de la fábrica (`FACTORY_ROOT`).
4. Proponer **siguientes acciones** alineadas al gate y a los artefactos obligatorios.
5. Al cerrar trabajo relevante: actualizar `tasks/gate-status.md`, `memory/daily/YYYY-MM-DD.md` y, si aplica, `.factory/state.json`.

## Dónde están perfiles y prompts (fábrica)

Variable opcional: **`FACTORY_ROOT`** = ruta al clon del repo wrapper (p. ej. `asygnuz-factory`).

| Recurso | Ruta |
|---------|------|
| Perfiles por rol | `$FACTORY_ROOT/factory/agents/profiles/<rol>.md` |
| Prompts por fase | `$FACTORY_ROOT/factory/agents/prompts/<rol>.md` |
| Contratos handoff | `$FACTORY_ROOT/factory/agents/handoff-contracts.md` |

Si `FACTORY_ROOT` no está definido y trabajás en monorepo `POC-factory`, usa rutas relativas: `../../factory/agents/...` desde `projects/<producto>/` o la profundidad que corresponda.

## Validación de gates

Desde la raíz del repo del producto:

```bash
./scripts/check-gate.sh "$(cat tasks/current-gate.txt)"
```

## Perfiles (IDs)

`product` | `design` | `architecture` | `db` | `backend` | `frontend` | `qa` | `uat` | `devops` | `security`
