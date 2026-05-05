# Skills ([skills.sh](https://skills.sh/)) y perfiles por rol

Este template puede usarse **sin** el monorepo de la fábrica. Instalá los skills del stack y enlazalos a los roles que usás con agentes.

## Instalación en el repo del producto

Desde la raíz del proyecto (donde está `package.json` o la raíz del repo):

```bash
./scripts/install-skills.sh
```

Requiere Node.js y `npx`. Genera `.agents/skills/` (Cursor / Antigravity) y enlaces en `.claude/skills/` (Claude Code), igual que en la fábrica.

## Mapa rol → skills recomendados

| Rol (perfil) | Skills útiles (nombres en skills.sh) |
|--------------|--------------------------------------|
| Producto | `prd`, `writing-plans`, `executing-plans` |
| Diseño | `frontend-design`, `web-design-guidelines`, `design-md`, `enhance-prompt` |
| Arquitectura | `api-design-principles`, `vercel-composition-patterns` |
| DB | `neon-postgres` |
| Backend | `nodejs-backend-patterns`, `api-design-principles` |
| Frontend | `vercel-react-best-practices`, `next-best-practices`, `next-cache-components`, `shadcn` |
| QA | `webapp-testing` |
| DevOps | `deploy-to-vercel`, `create-github-action-workflow-specification` |
| Security | (añadir bajo demanda desde `npx skills find security`) |

El script `install-skills.sh` del template instala el **paquete estándar** de la fábrica (stack Next/Neon/Vercel/shadcn). Para más detalle y auditoría: catálogo en el repo de la fábrica, `factory/skills/README.md`.

## Perfiles y prompts (fábrica)

Los Markdown de **perfil** y **prompt ejecutable** viven en la fábrica: `factory/agents/profiles/` y `factory/agents/prompts/`. Definí `FACTORY_ROOT` o cloná el repo wrapper y seguí `CLAUDE.md` en este proyecto.
