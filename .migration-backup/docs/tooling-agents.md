# Agentes y herramientas en el repo del producto

Los perfiles **canónicos** viven en el repositorio de la fábrica (`asygnuz-factory` u homónimo), bajo **`factory/agents/`**.

## Si desarrollas dentro del monorepo (wrapper + template)
Abre directamente `factory/agents/profiles/<rol>.md`, `factory/agents/prompts/<rol>.md` y `factory/agents/handoff-contracts.md`; las reglas `.cursor/rules/agent-*.mdc` viven en el wrapper.

En el repo del producto, **`CLAUDE.md`** (y `tasks/gate-status.md`) definen el protocolo de inicio para no perder el estado del pipeline entre sesiones.

**Skills:** `./scripts/install-skills.sh` y **`docs/skills-profiles.md`** (mapa rol → skills del stack).

## Si este producto es solo su propio repositorio (clon desde template)
Opciones para mantener el mismo comportamiento:

1. **Copiar o sincronizar** al crear el repo: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/`, `.agent/rules/` desde el repo de la fábrica (o un script).
2. **Skills ([skills.sh](https://skills.sh/)):** en el monorepo de la fábrica corre `./scripts/install-skills.sh`; en un repo solo de producto puedes copiar el script + `factory/skills/README.md` o ejecutar los mismos `npx skills add ...` listados allí.
3. **Submodule** del repo de la fábrica (solo si quieres actualizaciones automáticas de política).
4. **Manual:** pegar en el chat la ruta o contenido del perfil desde la última versión publicada de la fábrica.

La estructura de entregables de este template (`docs/`, `design/`, `qa/`, etc.) es la que los perfiles referencian; **no** sustituyas esa estructura sin un ADR en el producto.
