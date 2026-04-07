# PRD — PRO (borrador definición)

**Estado:** en definición (Gate 1). **Bloqueante:** elegir **un** MVP (ver `docs/intake/03-propuesta-valor-y-mvp.md`: Opción A torneos+social vs Opción B hiperlocal móvil).

---

## 1. Contexto del negocio

- **Problema:** deportistas amateur y semipro carecen de experiencia digital “tipo profesional” (perfil, stats, equipos, competencia visible); organizadores fragmentan gestión y promoción.
- **Oportunidad:** ecosistema que una perfil gamificado, torneos y comunidad; validación en Colombia (Eje Cafetero); monetización B2B sin cobrar al deportista (visión actual).
- **Estado actual:** coordinación vía WhatsApp/redes/planillas; poca portabilidad de logros y estadísticas.

## 2. Objetivo del producto

- **Resultado esperado en 1–4 semanas (post arranque desarrollo):** *[completar según MVP elegido — ej. “primer flujo registro + perfil + 1 torneo demo” vs “mapa + grupos fútbol en ciudad X”]*.
- **KPI principal (borrador):** registros con perfil completo; o torneos activos; o grupos/mapa (alinear con `intake/03`).
- **KPI secundarios:** retención semanal, organizadores con al menos un evento publicado, NPS o encuesta piloto.

## 3. Usuario objetivo

- **Segmento principal:** futbolistas **mayores de edad** amateur/semipro + organizadores de torneos/eventos (detalle en `docs/intake/02-usuarios-y-mercado.md`).
- **Dolor principal:** poca visibilidad del mérito deportivo; fricción para armar equipos y seguir competencias.
- **Escenario de uso:** *[pendiente MVP — “crear torneo e inscribir equipos” vs “encontrar compañeros y cancha en mapa local”]*.

## 4. Alcance

### En alcance (placeholder hasta decidir MVP)

- *[Lista corta tras cerrar Opción A, B o híbrido en `intake/03`]*

### Fuera de alcance (ejemplos del informe, confirmar por MVP)

- Pagos in-app de inscripciones (post-MVP en informe).
- Módulo árbitros y resolución de disputas (post-MVP).
- Transmisiones en vivo (RF7): **candidato fuerte a sacar del MVP1** si se elige Opción A acotada.

## 5. Hipótesis a validar

1. El perfil tipo “FIFA” + equipos/torneos genera **adopción** si el valor social es claro el primer día.
2. Organizadores migran desde Excel/WhatsApp si **ahorran tiempo** en inscripciones y tablas.
3. (Si hiperlocal) La densidad en **una ciudad** evita red vacía.

## 6. Criterios de éxito

- **Criterio 1:** *[métrica cuantitativa acordada en intake/03]*.
- **Criterio 2:** go/no-go de negocio tras UAT en ambiente QA (proceso en `uat/uat-checklist.md`).

## 7. Riesgos y supuestos

- **Riesgo:** dos MVPs en documentación sin decisión → **scope creep** o estimaciones imposibles.
- **Mitigación:** cerrar elección en `00-indice` y `03`; recortar RF en `01-requisitos-funcionales.md` a un set **prioritario** (5–10).
- **Riesgo:** complejidad social + live + chat en un solo release.
- **Mitigación:** fases MVP1 / MVP2 explícitas en PRD tras decisión.

## 8. Dependencias

- **Técnica:** stack acordado con fábrica (Next, Neon, Vercel) — ver template; app en `apps/web` cuando exista en el repo.
- **Negocio:** validación con organizadores locales; posibles alianzas con canchas (post-MVP según modelo).

## 9. Plan de entrega semanal

- **Semana 1:** cerrar MVP único + PRD este documento + RF prioritarios + RNF mínimos.
- **Semana 2:** diseño flujos MVP elegido (`design/user-flows.md`).
- **Semana 3+:** arquitectura y DB según gate 3.

---

**Referencias:** `docs/intake/00`–`03`, `PRO-gestion.documental.md` (RF1–8 y RNF completos hasta migración a `intake/04`–`05`).
