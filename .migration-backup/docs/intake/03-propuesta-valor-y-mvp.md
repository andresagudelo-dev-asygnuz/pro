# 03 — Propuesta de valor y MVP (intake) — PRO

## Propuesta de valor (síntesis)

- **Para deportistas:** espacio **gratuito** donde guardar **estadísticas, logros y perfil** comparable a un jugador “tipo FIFA”, con equipos, **transferencias** entre equipos, **retos** y resultados públicos; posibilidad futura de **dispositivos** para métricas en tiempo real (R// encuesta).
- **Para organizadores / espacios:** más **afluencia** y herramientas para **torneos y eventos**; monetización del lado **B2B** (alianzas, publicidad, eventos masivos) sin cobrar al deportista en la visión actual (R//).

**Gancho principal (R//):** sensación de **perfil profesional**, valoración por estadísticas, transferencias estilo mercado, retos regionales, y **seguimiento fácil** de torneos/ligas.

## Diferenciación

- Combinación **perfil deportivo gamificado + torneos + comunidad** frente a solo reserva de cancha o solo redes sociales genéricas.
- Enfoque en **pasión y competencia amateur** elevada a experiencia “pro” (nombre de marca alineado).

## Alcance del MVP — decisión cerrada

Convivían dos MVPs posibles en la documentación. Tras análisis de trade-offs se eligió un **híbrido acotado** ("Opción A Acotada"). Abajo se conservan las opciones originales como referencia y se documenta la decisión.

### Opción A — Plataforma torneos + social (informe Juan Pablo, RF1–RF8)

- **Incluye (objetivos MVP informe):** perfiles jugador/promotor detallados, equipos, **creación y gestión de torneos**, inscripción, resultados/tablas en tiempo real, **feed + notificaciones + chat**, UI tipo videojuego deportivo, protección de datos, verificación edad.
- **Post-MVP explícito en informe:** árbitros, disputas, **pagos** de inscripción.
- **Riesgo:** alcance **muy grande** para un primer entregable; live streaming (RF7) y social completo suben complejidad.

### Opción B — App hiperlocal Manizales (estudio IA / mercado)

- **MVP descrito:** registro, **perfiles** con deportes y nivel, **tracking básico** (correr, ciclismo, fútbol), **mapa** de recintos/usuarios, **grupos por deporte**, **agenda simple** de partidos informales.
- **Riesgo:** narrativa **móvil-first** y **multi-deporte** choca con acotación **solo fútbol +18** de encuesta; alinear explícitamente.

### Decisión: Híbrido — Opción A Acotada

Se elige el **núcleo de Opción A** (perfil tipo ficha + torneos) recortando las features sociales y de media pesadas, y se aplica la **restricción geográfica de Opción B** (lanzamiento en Eje Cafetero) como decisión de go-to-market.

**Justificación:**

1. **Alineación con marca** — "PRO" promete experiencia profesional; el loop perfil → equipo → torneo → resultados entrega esa promesa con superficie mínima.
2. **RF ya especificados** — RF-001 a RF-004 tienen criterios GWT escritos; se agrega RF-005 (resultados y tabla de posiciones) para cerrar el ciclo de valor.
3. **Stack fit** — Next.js + Neon + Vercel (stack acordado) es ideal para plataforma web con perfiles SSR y páginas de torneo. Opción B pura requeriría stack nativo diferente.
4. **Validación bilateral** — Un MVP prueba las dos hipótesis centrales: jugadores adoptan por perfil + valor social, y organizadores adoptan si ahorran tiempo vs. WhatsApp/Excel.
5. **Scope realista** — 5 RF vs ~40 del informe completo. Diseñable en 1 semana, construible en 2–3.

**MVP elegido para la siguiente iteración:** **Opción A Acotada** — registro con roles, perfil tipo ficha, creación de torneos, inscripción de equipos, resultados y tabla de posiciones. Solo fútbol, +18, lanzamiento Eje Cafetero. Plataforma web responsiva.

**Fuera del MVP actual:**

- Live streaming (RF7)
- Feed social completo + chat (RF5); se reemplaza por notificaciones simples
- Pagos in-app de inscripciones
- Módulo árbitros y resolución de disputas
- Mapa de recintos / discovery de usuarios (candidato MVP2)
- Multi-deporte (solo fútbol en MVP1)
- Tracking de actividad física (correr, ciclismo) de Opción B

## Hipótesis a validar

1. Los deportistas **valoran y usarán** un perfil con estadísticas comparables si el onboarding y el valor social (equipo/torneo) están claros.
2. Los organizadores **adoptan** la plataforma si reduce fricción en inscripciones y visibilidad de resultados.
3. La **focalización geográfica** (Eje Cafetero) genera suficiente densidad para que torneos y equipos tengan masa crítica sin efecto red vacío.

## KPI de validación

| KPI | Objetivo inicial (primeras 4 semanas post-lanzamiento) | Cómo medir |
|-----|------------------|------------|
| Registros con perfil completo | 50 | Analytics producto |
| Torneos creados por promotores | 5 activos | Eventos en backend |
| Retención semanal (WAU/MAU) | 30 % semana a semana | Product analytics |
| Organizadores con ≥1 torneo publicado | 3 | Cuentas promotor con torneo vivo |

## Fuentes

- Objetivos MVP informe; definición MVP Manizales; respuestas R// encuesta en `PRO-gestion.documental.md`.
