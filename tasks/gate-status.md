# Gate Status — PRO

> Estado vivo del pipeline. **El agente y el fundador lo leen al inicio de sesión** y lo actualizan al aprobar o avanzar un gate.

| Gate | Nombre | Estado | Fecha | Aprobado por | Notas |
|------|--------|--------|-------|--------------|-------|
| G1 | Producto | **Aprobado** | 2026-04-17 | Andres Agudelo (fundador) | MVP Opción A Acotada, **6 RF** = RF-001 a RF-005 + RF-007; PRD, RF, RNF con umbral; modelo de perfil en 4 bloques + principio de configurabilidad por usuario; módulo post-MVP "Interacción social y gamificación" documentado. Aprobación vía PR #7. |
| G2 | Diseño | **Aprobado** | 2026-04-17 | Andres Agudelo (fundador) | Flujos + wireframes aprobados vía merge de PR #8: `design/user-flows.md` (6 flujos mapeados 1:1 a HU-001..HU-006 con mermaid) y `design/wireframes/01-register.md` … `10-standings-table.md` (10 pantallas clave + `README.md`). |
| G3 | Arquitectura + DB | **Aprobado** | 2026-04-17 | Andres Agudelo (fundador) | Aprobado vía merge de PR #9: `architecture/solution-architecture.md`, `db/data-model.md` (16 entidades + RLS + mat view standings + visibility_fields) y ADRs `architecture/adr/ADR-001..ADR-004`. |
| G4 | Desarrollo | **En curso — Sprint 5** | 2026-04-28 | — | Sprint 1–3 cerrados (HU-001/002/003 + módulo lateral matches/venues/notifications). Sprint 4: codebase estabilizado (ESLint + Build OK), CI/CD corregido (pnpm lockfile), landing premium + market validation, **HU-004 Torneos restaurada** (regresión por merge de landing, PR #28 merged). Sprint 5: **HU-005 Inscripciones (RF-004)** con `teams` / `team_members` / `tournament_registrations`, trigger atómico de cupos, gate RF-007 vía SECURITY DEFINER RPC (PR #29, pendiente de merge); **HU-006 Resultados+Standings (RF-005)** con `tournament_matches` / `match_events` / mat view `standings` con `REFRESH CONCURRENTLY`, algoritmo puro de standings + UI promotor para cargar resultados, tabla pública (PR nuevo en esta sesión). Quedan pendientes los 🔴 secundarios del review de #29 (2 hardenings de RLS/triggers en HU-005) a incluir en Sprint 6. |
| G5 | QA | Pendiente | — | — | Tests + cobertura |
| G6 | UAT | Pendiente | — | — | Negocio |
| G7 | Release | Pendiente | — | — | Seguridad + deploy + trazabilidad |

**Leyenda sugerida:** Pendiente | En curso | Listo para revisión | Aprobado | Bloqueado

**Gate activo (rápido):** ver también `tasks/current-gate.txt` (número 1–7 para automatización).
