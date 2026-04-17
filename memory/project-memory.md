# Project Memory

## Decisiones clave
- 2026-04-06: Intake unificado en `PRO-gestion.documental.md`. Pendiente: elegir MVP único.
- 2026-04-16: **MVP decidido — Opción A Acotada.** Núcleo torneos + perfil tipo ficha (RF-001 a RF-005), solo fútbol +18, lanzamiento Eje Cafetero. Se descartó Opción B pura (app móvil hiperlocal) por incompatibilidad con stack (Next.js/Vercel) y validación de encuesta (solo fútbol). Se conserva restricción geográfica de Opción B como go-to-market. G1 marcado "Listo para revisión"; pendiente aprobación fundador.
- 2026-04-17: **Ampliación MVP1 de 5 a 6 RF** — se incorpora RF-007 (verificación de edad con documento) por resolución del fundador; el MVP sólo admite mayores de edad. Se documenta modelo detallado del perfil del deportista en 4 bloques (Identidad, Morfológico/Biométrico, Capacidades Condicionales, Destrezas Técnicas) deporte-agnóstico, con MVP1 instanciando sólo fútbol. Se adopta **principio transversal de configurabilidad por usuario**: cada campo del perfil tiene selector de visibilidad (`público` / `promotores` / `privado`) con defaults sensibles (datos morfológicos y documento de identidad no son `público` por defecto). Bloque 4 (Destrezas) confirmado como estructura por deporte (implementación JSONB vs tablas satélite se define en G3). Habilidades blandas: sección compuesta con texto libre + tags curados complementarios. Ideas bajo consideración post-MVP: amistad entre usuarios, calificación por pares/amigos/participantes, sistema de XP por participación.
- 2026-04-17: **G1 aprobado por el fundador.** Transición a G2 (Diseño) iniciada. `tasks/current-gate.txt` = `2`. Plan de desarrollo G2–G7 documentado en `tasks/plan-desarrollo.md` con artefactos obligatorios por gate y orden. Backlog inicial de HU para MVP1 creado en `tasks/hu/HU-001.md` a `tasks/hu/HU-006.md` (mapeo 1:1 a los 6 RF del MVP). Próximo artefacto: `design/user-flows.md` con los flujos del MVP mapeados a RF, seguido de wireframes base.
- 2026-04-17: **G2 Diseño entregado para revisión.** `design/user-flows.md` con los 6 flujos del MVP1 mapeados 1:1 a HU-001..HU-006 (mermaid por flujo + mapa global). `design/wireframes/` con 10 wireframes base de baja fidelidad (registro, verificación edad, perfil edición con selector de visibilidad por campo, perfil público, listado/creación/detalle de torneo, inscripción con validaciones cruzadas RF-002/RF-007 por miembro, carga de resultados, tabla de posiciones) + `README.md` de convenciones. `tasks/gate-status.md` marca G2 como "Listo para revisión". Próxima decisión: aprobación del fundador para cerrar G2 y arrancar G3 (arquitectura + DB) con 4 ADRs críticas (Bloque 4, `visibility_level`, verificación edad, auth).

## Lecciones aprendidas
- 

## Riesgos recurrentes
- 

## Reglas del proyecto
- 
