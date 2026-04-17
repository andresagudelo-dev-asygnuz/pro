# Changelog del producto — definición y construcción

Bitácora **del producto** (negocio, alcance, gates y hitos de entrega). Mantener **la fecha más reciente arriba**. El detalle de decisiones largas va en `memory/project-memory.md` y el día a día en `memory/daily/`.

## Convención

- Una sección por fecha: `## YYYY-MM-DD`
- Viñetas cortas; enlazar PRD, intake o gate cuando aplique
- Etiquetas opcionales: `[Definición]` `[Construcción]` `[Gate]` `[Alcance]`

---

## Unreleased

- `[Definición]` Intake `01`–`03` con síntesis desde monolito; PRD y RNF borrador; RF prioritarios (candidatos Opción A); **decisión MVP única pendiente**. Monolito `PRO-gestion.documental.md` en migración a `01–08`. G1 en curso (`tasks/gate-status.md`).
- `[Construcción]` Repositorio remoto: https://github.com/andresagudelo-dev-asygnuz/pro
- Estado de gates: `tasks/gate-status.md`, `tasks/current-gate.txt`.

## 2026-04-17

- `[Alcance]` **MVP1 ampliado de 5 a 6 RF**: se agrega RF-007 (verificación de edad con documento) al onboarding obligatorio por resolución del fundador.
- `[Definición]` Modelo del perfil del deportista documentado como **4 bloques deporte-agnóstico** (Identidad, Morfológico/Biométrico, Capacidades Condicionales, Destrezas Técnicas) con MVP1 instanciando sólo fútbol. Ver `docs/intake/04-requisitos-funcionales-borrador.md`.
- `[Definición]` **Principio transversal de configurabilidad por usuario**: selector de visibilidad `público`/`promotores`/`privado` por cada campo del perfil, con defaults sensibles (morfológicos en `promotores`, documento de identidad en `privado`).
- `[Definición]` Módulo **post-MVP "Interacción social y gamificación"** agregado al intake: RF-borrador IS-01 (amistad), IS-02 (calificación por pares con fuentes `amigo`/`participante`), IS-03 (XP por participación).
- `[Gate]` **G1 Producto aprobado por el fundador** (ver PR #7). Transición a G2 (Diseño) iniciada; `tasks/current-gate.txt` = `2`.
- `[Construcción]` Plan de desarrollo G2–G7 creado en `tasks/plan-desarrollo.md`. Backlog inicial de HU para MVP1 en `tasks/hu/HU-001.md` – `tasks/hu/HU-006.md` (mapeo 1:1 con los 6 RF).
- `[Gate]` **G2 Diseño entregado para revisión.** Flujos en `design/user-flows.md` (6 flujos mapeados a HU-001..HU-006 con mermaid) y wireframes base en `design/wireframes/01-register.md`..`10-standings-table.md` (10 pantallas) + `README.md`. `tasks/gate-status.md` marca G2 como "Listo para revisión". Pendiente aprobación del fundador antes de avanzar a G3.
