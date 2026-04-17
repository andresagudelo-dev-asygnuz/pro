# PRD — PRO (borrador definición)

**Estado:** G1 aprobado; G2 (Diseño) en curso (ver `tasks/gate-status.md` y `tasks/current-gate.txt`). **MVP decidido:** Opción A Acotada (torneos + perfil tipo ficha). Alcance **6 RF** (RF-001 a RF-005 + RF-007). Ver justificación original en `docs/intake/03-propuesta-valor-y-mvp.md` y la resolución que incorpora RF-007 (verificación de edad) en `docs/intake/04-requisitos-funcionales-borrador.md` (sección Resoluciones).

---

## 1. Contexto del negocio

- **Problema:** deportistas amateur y semipro carecen de experiencia digital “tipo profesional” (perfil, stats, equipos, competencia visible); organizadores fragmentan gestión y promoción.
- **Oportunidad:** ecosistema que una perfil gamificado, torneos y comunidad; validación en Colombia (Eje Cafetero); monetización B2B sin cobrar al deportista (visión actual).
- **Estado actual:** coordinación vía WhatsApp/redes/planillas; poca portabilidad de logros y estadísticas.

## 2. Objetivo del producto

- **Resultado esperado en 1–4 semanas (post arranque desarrollo):** primer flujo completo registro → perfil tipo ficha → creación de torneo → inscripción de equipo → resultados y tabla de posiciones, desplegado en Vercel y disponible para validación con usuarios reales en Eje Cafetero.
- **KPI principal:** 50 registros con perfil completo y 5 torneos activos creados por promotores en las primeras 4 semanas post-lanzamiento.
- **KPI secundarios:** retención semanal (WAU/MAU ≥ 30 %), al menos 3 organizadores con torneo publicado.

## 3. Usuario objetivo

- **Segmento principal:** futbolistas **mayores de edad** amateur/semipro + organizadores de torneos/eventos (detalle en `docs/intake/02-usuarios-y-mercado.md`).
- **Dolor principal:** poca visibilidad del mérito deportivo; fricción para armar equipos y seguir competencias.
- **Escenario de uso:** Un promotor crea un torneo de fútbol con reglas básicas, equipos se inscriben, se registran resultados y la tabla de posiciones se actualiza automáticamente; jugadores ven sus estadísticas reflejadas en su perfil tipo ficha.

## 4. Alcance

### En alcance (MVP1 — Opción A Acotada)

- **RF-001** Registro con rol (jugador / promotor)
- **RF-002** Perfil de jugador tipo ficha (foto, posición, stats básicas, sección social con texto libre + tags curados). Cada campo tiene **selector de visibilidad** `público` / `promotores` / `privado` configurable por el usuario (principio transversal de configurabilidad).
- **RF-003** Crear y configurar torneo (promotor)
- **RF-004** Inscripción de equipo o jugador a torneo
- **RF-005** Resultados y tabla de posiciones
- **RF-007** Verificación de edad con documento de identidad (obligatoria en onboarding; MVP sólo mayores de edad)
- Notificaciones simples (inscripción confirmada, resultado publicado)
- Solo fútbol, mayores de edad
- Lanzamiento geográfico: Eje Cafetero (Pereira / Manizales)

### Fuera de alcance (MVP1)

- Live streaming (RF7)
- Feed social completo + chat (RF5)
- Pagos in-app de inscripciones
- Módulo árbitros y resolución de disputas
- Mapa de recintos / discovery de usuarios (candidato MVP2)
- Multi-deporte
- Tracking de actividad física

## 5. Hipótesis a validar

1. El perfil tipo “FIFA” + equipos/torneos genera **adopción** si el valor social es claro el primer día.
2. Organizadores migran desde Excel/WhatsApp si **ahorran tiempo** en inscripciones y tablas.
3. La focalización geográfica (Eje Cafetero) genera suficiente densidad para masa crítica sin efecto red vacío.

## 6. Criterios de éxito

- **Criterio 1:** ≥50 registros con perfil completo y ≥5 torneos activos en 4 semanas post-lanzamiento (ver KPIs en `intake/03`).
- **Criterio 2:** go/no-go de negocio tras UAT en ambiente QA (proceso en `uat/uat-checklist.md`).

## 7. Riesgos y supuestos

- **Riesgo:** scope creep si se re-introducen features sociales o live antes de validar el loop básico.
- **Mitigación:** MVP decidido (Opción A Acotada, **6 RF** — RF-001 a RF-005 + RF-007); todo lo demás queda en backlog explícito; cualquier adición requiere aprobación en PRD.
- **Riesgo:** baja adopción si la densidad local no alcanza masa crítica.
- **Mitigación:** lanzamiento focalizado en Eje Cafetero con onboarding asistido a promotores clave.

## 8. Dependencias

- **Técnica:** stack acordado con fábrica (Next, Neon, Vercel) — ver template; app en `apps/web` cuando exista en el repo.
- **Negocio:** validación con organizadores locales; posibles alianzas con canchas (post-MVP según modelo).

## 9. Plan de entrega semanal

- **Semana 1:** cerrar MVP único + PRD este documento + RF prioritarios + RNF mínimos.
- **Semana 2:** diseño flujos MVP elegido (`design/user-flows.md`).
- **Semana 3+:** arquitectura y DB según gate 3.

---

**Referencias:** `docs/intake/00`–`03`, `PRO-gestion.documental.md` (RF1–8 y RNF completos hasta migración a `intake/04`–`05`).
