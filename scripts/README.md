# Scripts del template

| Script | Uso |
|--------|-----|
| `check-gate.sh` | Validación **mínima** de archivos por gate (`./scripts/check-gate.sh` o `./scripts/check-gate.sh 3`). |
| `install-skills.sh` | Instala skills del stack desde [skills.sh](https://skills.sh/) para Cursor, Claude Code y Antigravity. |

**Bootstrap de producto nuevo** (copia desde template + `git init`): en el monorepo de la fábrica existe `scripts/new-product.sh` en la raíz del wrapper; si solo tenés este repo, copiá la carpeta del template manualmente y ejecutá `install-skills.sh` aquí.
