# PRO — Producto (desde template de fábrica)

Plataforma deportiva **PRO** (deportistas amateur/semipro + organizadores). Este repo sigue la estructura del template de la fábrica.

**Repositorio remoto:** [github.com/andresagudelo-dev-asygnuz/pro](https://github.com/andresagudelo-dev-asygnuz/pro)

## Documentación de producto

| Qué | Dónde |
|-----|--------|
| **Intake estándar (contexto negocio)** | [`docs/intake/`](docs/intake/) — archivos `00`–`08` (misma estructura que el template de fábrica) |
| **Changelog del producto (definición + construcción)** | [`docs/project-changelog.md`](docs/project-changelog.md) |
| **Índice + mapa de migración** | [`docs/intake/00-indice-y-alcance.md`](docs/intake/00-indice-y-alcance.md) |
| **Monolito consolidado (legado)** | [`PRO-gestion.documental.md`](PRO-gestion.documental.md) — volcar contenido a `01`–`08` con el tiempo |
| Normativa del intake | [`docs/intake/README.md`](docs/intake/README.md) |
| **PRD formal (Gate 1)** | [`docs/00-prd.md`](docs/00-prd.md) |
| RF / RNF formales | [`docs/01-requisitos-funcionales.md`](docs/01-requisitos-funcionales.md), [`docs/02-requisitos-no-funcionales.md`](docs/02-requisitos-no-funcionales.md) |

## Estado del pipeline

- `tasks/gate-status.md`, `tasks/current-gate.txt`
- Protocolo de agentes: `CLAUDE.md`, `GEMINI.md`

## Fábrica (perfiles, prompts, skills)

Definí **`FACTORY_ROOT`** al clon del repo `asygnuz-factory` (wrapper) para acceder a `factory/agents/`.

**Skills:** `./scripts/install-skills.sh` si hace falta refrescar.

---

## Plantilla base (recordatorio)

El contenido siguiente es el README genérico del template; las secciones de arriba son **específicas de PRO**.

### Stack por defecto
- Frontend/App: Next.js · UI: Tailwind + shadcn/ui · DB: Neon · Vercel + GitHub

### Flujo operativo y gates
Ver secciones inferiores del template en la fábrica o los mismos apartados en la documentación compartida.
