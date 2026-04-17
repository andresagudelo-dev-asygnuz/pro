# 04 — Requisitos funcionales — borrador (intake)

> Migrar a `docs/01-requisitos-funcionales.md` con criterios GIVEN/WHEN/THEN y trazabilidad a PRD.
> **Nota de alcance:** este documento contiene **visión extendida** (multi-deporte, perfil tipo “scouting”). El MVP1 decidido (Opción A Acotada, fútbol, 5 RF — ver `03-propuesta-valor-y-mvp.md` y `docs/00-prd.md`) usa **un subconjunto mínimo** de estos campos. La implementación completa queda como backlog priorizable post-MVP1.

## Módulo / área: Perfil del deportista — modelo detallado (visión)

Modelo **deporte-agnóstico** del “perfil tipo ficha” (RF-002). Estructurado en 4 bloques que combinan datos declarativos, métricas morfológicas, capacidades condicionales y destrezas técnicas. Permite fichas ricas tipo *scouting* para deportistas amateur y semipro, y es extensible a cualquier disciplina (fútbol en MVP1; voleibol, básquet, atletismo, etc. en fases posteriores). Ver ejemplo de llenado en `docs/intake/08-anexos.md`.

### Bloque 1 — Identidad y perfil personal

| Campo | Tipo / formato | Obligatorio | Notas |
|-------|----------------|-------------|-------|
| Nombre completo | texto | sí | Nombre legal del deportista. |
| Edad | entero (años) | sí | Derivable desde fecha de nacimiento. Verificación de edad en RF-007. |
| Ubicación | texto estructurado `Ciudad, Región, País` | sí | MVP1 focalizado en Eje Cafetero (Colombia). |
| Disciplina principal | enum / taxonomía | sí | MVP1: `fútbol`. Visión multi-deporte: volei sala, futsal, básquet, etc. |
| Intereses y estilo de vida | texto libre (opcional) | no | Nutrición, hobbies, lecturas, rutinas no competitivas. |
| Perfil social y habilidades blandas | texto libre (opcional) | no | Liderazgo, comunicación, disciplina, manejo de presión. |

**Dependencias:** RF-001 (registro/rol), RF-007 (verificación edad con documento).

### Bloque 2 — Análisis morfológico y biométrico

| Campo | Tipo / unidad | Obligatorio | Notas |
|-------|---------------|-------------|-------|
| Estatura | decimal (m) | sí | 1 decimal mínimo. |
| Peso competitivo | decimal (kg) | sí | Peso en temporada competitiva; histórico opcional. |
| Envergadura / cobertura | decimal (m) | no | Alcance total de brazos; relevante en voleibol, básquet, boxeo. |
| Lateralidad | enum (`diestro`, `zurdo`, `ambidiestro`) | sí | — |
| Somatotipo | enum (`ectomorfo`, `mesomorfo`, `endomorfo`, mixtos) | no | Campo opcional tipo scouting; sólo si hay auto-reporte o evaluación. |

**Privacidad:** datos sensibles; visibilidad configurable (público / solo promotores / privado). Definir en RNF (`02-requisitos-no-funcionales.md`).

### Bloque 3 — Capacidades condicionales

Campos cualitativos / cuantitativos sobre las 4 capacidades físicas base. En MVP1 se capturan como texto libre auto-reportado; evolución post-MVP: marcas cuantitativas y validación por evaluadores.

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|-------|
| Fuerza (explosiva / resistencia) | texto corto + tags | no | Ej. “alta potencia en salto vertical, fuerza en tren inferior”. |
| Velocidad (reacción / desplazamiento) | texto corto + tags | no | Ej. “tiempo de reacción alto, velocidad lateral”. |
| Resistencia (aeróbica / anaeróbica) | texto corto + tags | no | Ej. “capacidad anaeróbica alta para esfuerzos explosivos repetidos”. |
| Flexibilidad (rango articular) | texto corto + tags | no | Ej. “rango óptimo en hombros para remate”. |

**Visión post-MVP:** reemplazar texto libre por métricas numéricas (salto vertical cm, 40 m en segundos, VO₂ max estimado, rangos articulares en grados) y permitir registro por entrenador/evaluador acreditado.

### Bloque 4 — Destrezas técnicas y especialización

Bloque **dependiente de la disciplina**. En MVP1 se instancia sólo para fútbol; modelo general debe permitir esquemas por deporte.

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|-------|
| Rendimiento individual y marcas | texto + numéricos según deporte | no | Ej. voleibol: alcance en remate 3.20 m, récord de saques efectivos. Ej. fútbol: goles por partido, % de acierto en pases, velocidad máxima. |
| Rendimiento colectivo y rol táctico | texto estructurado | no | Ej. voleibol: “atacante externo, efectivo en bloqueo y defensa en segunda línea”. Ej. fútbol: posición (RF-002 MVP1), rol táctico, fortalezas en bloque defensivo/ofensivo. |

**Dependencia con RF-005 (resultados y tabla):** parte de este bloque se alimenta automáticamente desde estadísticas de torneos (goles, partidos, victorias). El resto es auto-reporte o validación cruzada (RF-006).

## Subconjunto del modelo que aplica a MVP1 (fútbol, Opción A Acotada)

El MVP1 implementa sólo campos estrictamente necesarios para el loop de valor registro → ficha → torneo → inscripción → resultados:

- **Bloque 1 (Identidad):** nombre, edad, ubicación, disciplina fija `fútbol`.
- **Bloque 2 (Morfológico):** estatura, peso, lateralidad.
- **Bloque 4 (Destrezas — fútbol):** posición preferida, pie hábil (≡ lateralidad), stats básicas alimentadas por RF-005 (partidos jugados, goles, victorias).
- **Bloques 2 (envergadura, somatotipo), 3 (capacidades condicionales) y 4 (rendimiento detallado):** fuera de alcance MVP1; quedan en backlog.

Ver RF-002 en `docs/01-requisitos-funcionales.md` para la versión formal con criterios GIVEN/WHEN/THEN del subconjunto MVP1.

## Módulo / área: [OTRO MÓDULO]

*No aplica por ahora; usar plantilla abajo cuando surjan nuevos RF en intake.*

```
- RF borrador N: [DESCRIPCIÓN]
```

## Dependencias o integraciones conocidas

- **Storage de imágenes** (foto de perfil, documento de identidad para RF-007): Supabase Storage o equivalente.
- **Taxonomía de disciplinas deportivas:** mantenible en tabla de catálogo (post-MVP multi-deporte).
- **Esquema por deporte del Bloque 4:** requiere modelo extensible (campos dinámicos o tablas por deporte) — decisión de arquitectura para Gate 3.

## Dudas abiertas

- ¿Verificación de edad (RF-007) aplica al MVP1 o sólo al catálogo completo? Confirmar con fundador.
- Visibilidad por defecto de campos morfológicos (peso, estatura): ¿públicos en la ficha o privados con opt-in? Decisión RNF.
- Post-MVP: ¿capacidades condicionales se registran por auto-reporte, evaluador acreditado, o test físico integrado (wearables)? Decidir en roadmap (`07-modelo-negocio-y-roadmap.md`).
- ¿Perfil social y habilidades blandas (Bloque 1) se mantienen como campo libre o se estructuran con tags curados? Evaluar en diseño (Gate 2).
