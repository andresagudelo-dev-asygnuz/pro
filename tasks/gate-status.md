# Gate Status — PRO

> Estado vivo del pipeline. **El agente y el fundador lo leen al inicio de sesión** y lo actualizan al aprobar o avanzar un gate.

| Gate | Nombre | Estado | Fecha | Aprobado por | Notas |
|------|--------|--------|-------|--------------|-------|
| G1 | Producto | **Aprobado** | 2026-04-17 | Andres Agudelo (fundador) | MVP Opción A Acotada, **6 RF** = RF-001 a RF-005 + RF-007; PRD, RF, RNF con umbral; modelo de perfil en 4 bloques + principio de configurabilidad por usuario; módulo post-MVP "Interacción social y gamificación" documentado. Aprobación vía PR #7. |
| G2 | Diseño | **Aprobado** | 2026-04-17 | Andres Agudelo (fundador) | Flujos + wireframes aprobados vía merge de PR #8: `design/user-flows.md` (6 flujos mapeados 1:1 a HU-001..HU-006 con mermaid) y `design/wireframes/01-register.md` … `10-standings-table.md` (10 pantallas clave + `README.md`). |
| G3 | Arquitectura + DB | **Listo para revisión** | 2026-04-17 | — | Entregados: `architecture/solution-architecture.md`, `db/data-model.md` y ADRs `architecture/adr/ADR-001..ADR-004`. Pendiente: validación del fundador para aprobar cierre de G3 antes de arrancar G4. |
| G4 | Desarrollo | Pendiente | — | — | HU + PRs |
| G5 | QA | Pendiente | — | — | Tests + cobertura |
| G6 | UAT | Pendiente | — | — | Negocio |
| G7 | Release | Pendiente | — | — | Seguridad + deploy + trazabilidad |

**Leyenda sugerida:** Pendiente | En curso | Listo para revisión | Aprobado | Bloqueado

**Gate activo (rápido):** ver también `tasks/current-gate.txt` (número 1–7 para automatización).
