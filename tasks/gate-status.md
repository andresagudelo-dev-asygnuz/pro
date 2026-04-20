# Gate Status — PRO

> Estado vivo del pipeline. **El agente y el fundador lo leen al inicio de sesión** y lo actualizan al aprobar o avanzar un gate.

| Gate | Nombre | Estado | Fecha | Aprobado por | Notas |
|------|--------|--------|-------|--------------|-------|
| G1 | Producto | **Aprobado** | 2026-04-17 | Andres Agudelo (fundador) | MVP Opción A Acotada, **6 RF** = RF-001 a RF-005 + RF-007; PRD, RF, RNF con umbral; modelo de perfil en 4 bloques + principio de configurabilidad por usuario; módulo post-MVP "Interacción social y gamificación" documentado. Aprobación vía PR #7. |
| G2 | Diseño | **Aprobado** | 2026-04-17 | Andres Agudelo (fundador) | Flujos + wireframes aprobados vía merge de PR #8: `design/user-flows.md` (6 flujos mapeados 1:1 a HU-001..HU-006 con mermaid) y `design/wireframes/01-register.md` … `10-standings-table.md` (10 pantallas clave + `README.md`). |
| G3 | Arquitectura + DB | **Aprobado** | 2026-04-17 | Andres Agudelo (fundador) | Aprobado vía merge de PR #9: `architecture/solution-architecture.md`, `db/data-model.md` (16 entidades + RLS + mat view standings + visibility_fields) y ADRs `architecture/adr/ADR-001..ADR-004`. |
| G4 | Desarrollo | **En curso — Sprint 2** | 2026-04-17 | — | Sprint 1 cerrado: PRs #10, #11, #13, #14 mergeados. Sprint 2 en curso: PR A (#15) mergeado (DB foundation); PR B (#16 Bloque 1 Identidad + visibilidad) testeado end-to-end 2/2 PASS (T1 happy path overrides + T2 catalog tamper rechazado server-side), reporte en `tasks/test-plans/pr-16-profile-identity-report.md`, pendiente merge. Plan Sprint 1: `tasks/sprint-week-01.md`. Plan Sprint 2: `tasks/sprint-week-02.md`. |
| G5 | QA | Pendiente | — | — | Tests + cobertura |
| G6 | UAT | Pendiente | — | — | Negocio |
| G7 | Release | Pendiente | — | — | Seguridad + deploy + trazabilidad |

**Leyenda sugerida:** Pendiente | En curso | Listo para revisión | Aprobado | Bloqueado

**Gate activo (rápido):** ver también `tasks/current-gate.txt` (número 1–7 para automatización).
