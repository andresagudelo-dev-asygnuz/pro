# 03 — Propuesta de valor y MVP (intake) — PRO

## Propuesta de valor (síntesis)

- **Para deportistas:** espacio **gratuito** donde guardar **estadísticas, logros y perfil** comparable a un jugador “tipo FIFA”, con equipos, **transferencias** entre equipos, **retos** y resultados públicos; posibilidad futura de **dispositivos** para métricas en tiempo real (R// encuesta).
- **Para organizadores / espacios:** más **afluencia** y herramientas para **torneos y eventos**; monetización del lado **B2B** (alianzas, publicidad, eventos masivos) sin cobrar al deportista en la visión actual (R//).

**Gancho principal (R//):** sensación de **perfil profesional**, valoración por estadísticas, transferencias estilo mercado, retos regionales, y **seguimiento fácil** de torneos/ligas.

## Diferenciación

- Combinación **perfil deportivo gamificado + torneos + comunidad** frente a solo reserva de cancha o solo redes sociales genéricas.
- Enfoque en **pasión y competencia amateur** elevada a experiencia “pro” (nombre de marca alineado).

## Alcance del MVP — ⚠️ decisión pendiente (dos narrativas)

Conviven **dos MVPs posibles** en la documentación; **hay que elegir uno** para `docs/00-prd.md` y priorizar RF.

### Opción A — Plataforma torneos + social (informe Juan Pablo, RF1–RF8)

- **Incluye (objetivos MVP informe):** perfiles jugador/promotor detallados, equipos, **creación y gestión de torneos**, inscripción, resultados/tablas en tiempo real, **feed + notificaciones + chat**, UI tipo videojuego deportivo, protección de datos, verificación edad.
- **Post-MVP explícito en informe:** árbitros, disputas, **pagos** de inscripción.
- **Riesgo:** alcance **muy grande** para un primer entregable; live streaming (RF7) y social completo suben complejidad.

### Opción B — App hiperlocal Manizales (estudio IA / mercado)

- **MVP descrito:** registro, **perfiles** con deportes y nivel, **tracking básico** (correr, ciclismo, fútbol), **mapa** de recintos/usuarios, **grupos por deporte**, **agenda simple** de partidos informales.
- **Riesgo:** narrativa **móvil-first** y **multi-deporte** choca con acotación **solo fútbol +18** de encuesta; alinear explícitamente.

### Camino recomendado para definición

1. **Elegir A, B o un híbrido acotado** (ej. “A pero sin live ni chat en MVP1”).
2. Volcar la elección en `docs/intake/00-indice-y-alcance.md` y en `docs/00-prd.md`.
3. Priorizar **5–10 RF** en `docs/01-requisitos-funcionales.md` y dejar el resto como backlog en `intake/04` o monolito.

**MVP elegido para la siguiente iteración:** *[COMPLETAR — bloqueante para cerrar G1]*  

**Fuera del MVP actual (lista inicial):** *[COMPLETAR según opción]*  

## Hipótesis a validar

1. Los deportistas **valoran y usarán** un perfil con estadísticas comparables si el onboarding y el valor social (equipo/torneo) están claros.
2. Los organizadores **adoptan** la plataforma si reduce fricción en inscripciones y visibilidad de resultados.
3. (Si Opción B) La **densidad local** en una ciudad es suficiente para red mapa/grupos sin efecto red vacío.

## KPI de validación (borrador — afinar al elegir MVP)

| KPI | Objetivo inicial | Cómo medir |
|-----|------------------|------------|
| Registros / perfiles completos | *[definir número o %]* | Analytics producto |
| Equipos o torneos creados | *[definir]* | Eventos en backend |
| Retención semanal (WAU/MAU) | *[definir]* | Product analytics |
| Organizadores activos | *[definir]* | Cuentas promotor con torneo vivo |
| (Opción B) Grupos activos / eventos en mapa | *[definir]* | Métricas in-app |

## Fuentes

- Objetivos MVP informe; definición MVP Manizales; respuestas R// encuesta en `PRO-gestion.documental.md`.
