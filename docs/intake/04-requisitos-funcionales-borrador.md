# 04 — Requisitos funcionales — borrador (intake)

> Migrar a `docs/01-requisitos-funcionales.md` con criterios GIVEN/WHEN/THEN y trazabilidad a PRD.
> **Nota de alcance:** este documento contiene **visión extendida** (multi-deporte, perfil tipo “scouting”). El MVP1 decidido (Opción A Acotada — ver `03-propuesta-valor-y-mvp.md` y `docs/00-prd.md`) usa **un subconjunto mínimo** de estos campos. La implementación completa queda como backlog priorizable post-MVP1.

## Módulo / área: Perfil del deportista — modelo detallado (visión)

Modelo **deporte-agnóstico** del “perfil tipo ficha” (RF-002). Estructurado en 4 bloques que combinan datos declarativos, métricas morfológicas, capacidades condicionales y destrezas técnicas. Permite fichas ricas tipo *scouting* para deportistas amateur y semipro, y es extensible a cualquier disciplina (fútbol en MVP1; voleibol, básquet, atletismo, etc. en fases posteriores). Ver ejemplo de llenado en `docs/intake/08-anexos.md`.

### Principio transversal — Configurabilidad por el usuario

**Todo campo del perfil es configurable por el usuario (deportista) en dos dimensiones:**

1. **Llenado:** opcional salvo un núcleo mínimo imprescindible para el funcionamiento del MVP (ver subconjunto MVP1 abajo). El usuario decide qué completa y qué deja vacío.
2. **Visibilidad por campo:** cada campo tiene un selector de visibilidad con al menos 3 niveles:
   - `público` — visible para cualquiera (incluye visitantes no autenticados, si el perfil es público).
   - `promotores` — visible sólo para promotores de torneos a los que el jugador está inscrito.
   - `privado` — sólo el propio usuario lo ve.
   (Niveles adicionales como `equipo` o `amigos` son candidatos post-MVP.)
3. **Defaults sensibles por bloque:** el sistema propone un default razonable por campo (ver tabla en cada bloque), pero el usuario siempre puede sobrescribirlo. Los **datos sensibles** (peso, estatura, edad exacta, documento de identidad) vienen por defecto en `promotores` o `privado`, nunca `público`.

Este principio se documenta como RNF de privacidad/configurabilidad en `docs/02-requisitos-no-funcionales.md` (ver `intake/05-requisitos-no-funcionales-borrador.md`).

### Bloque 1 — Identidad y perfil personal

| Campo | Tipo / formato | Obligatorio | Visibilidad default | Notas |
|-------|----------------|-------------|---------------------|-------|
| Nombre completo | texto | sí | público | Nombre legal del deportista. |
| Edad | entero (años) | sí | público | Derivable desde fecha de nacimiento. Verificación con documento en RF-007 (**en alcance MVP1**). |
| Ubicación | texto estructurado `Ciudad, Región, País` | sí | público | MVP1 focalizado en Eje Cafetero (Colombia). |
| Disciplina principal | enum / taxonomía | sí | público | MVP1: `fútbol`. Visión multi-deporte: volei sala, futsal, básquet, etc. |
| Intereses y estilo de vida | texto libre (opcional) | no | público | Nutrición, hobbies, lecturas, rutinas no competitivas. |
| Perfil social y habilidades blandas | **sección compuesta** (ver abajo) | no | público | Liderazgo, comunicación, disciplina, manejo de presión. |

#### Sección compuesta — “Perfil social y habilidades blandas”

La sección combina **dos subcampos complementarios** (no excluyentes):

| Subcampo | Tipo | Notas |
|----------|------|-------|
| Descripción libre | texto (markdown ligero, 500–1000 chars) | Narrativa propia del deportista; útil para onboarding y diferenciación. |
| Tags curados | multi-select desde catálogo cerrado | Catálogo inicial sugerido: `liderazgo`, `comunicación asertiva`, `disciplina`, `resiliencia`, `trabajo en equipo`, `manejo de presión`, `autocrítica`, `puntualidad`. Ampliable post-MVP. |

La ficha muestra ambos: primero los tags (scanneable) y debajo la descripción libre como complemento.

**Dependencias:** RF-001 (registro/rol), RF-007 (verificación edad con documento — **en alcance MVP1**).

### Bloque 2 — Análisis morfológico y biométrico

| Campo | Tipo / unidad | Obligatorio | Visibilidad default | Notas |
|-------|---------------|-------------|---------------------|-------|
| Estatura | decimal (m) | sí | promotores | 1 decimal mínimo. Configurable por el usuario. |
| Peso competitivo | decimal (kg) | sí | promotores | Peso en temporada competitiva; histórico opcional. Sensible → default `promotores`. |
| Envergadura / cobertura | decimal (m) | no | promotores | Alcance total de brazos; relevante en voleibol, básquet, boxeo. |
| Lateralidad | enum (`diestro`, `zurdo`, `ambidiestro`) | sí | público | — |
| Somatotipo | enum (`ectomorfo`, `mesomorfo`, `endomorfo`, mixtos) | no | promotores | Campo opcional tipo scouting; sólo si hay auto-reporte o evaluación. |

**Privacidad:** confirmada como configurable por el usuario (principio transversal). Defaults sensibles: peso/estatura/envergadura/somatotipo en `promotores` por defecto; el usuario puede subir a `público` o bajar a `privado`. Ver RNF correspondiente.

### Bloque 3 — Capacidades condicionales

Campos cualitativos / cuantitativos sobre las 4 capacidades físicas base. En MVP1 se capturan como texto libre auto-reportado + tags; evolución post-MVP: marcas cuantitativas y validación por evaluadores.

| Campo | Tipo | Obligatorio | Visibilidad default | Notas |
|-------|------|-------------|---------------------|-------|
| Fuerza (explosiva / resistencia) | texto corto + tags | no | público | Ej. “alta potencia en salto vertical, fuerza en tren inferior”. |
| Velocidad (reacción / desplazamiento) | texto corto + tags | no | público | Ej. “tiempo de reacción alto, velocidad lateral”. |
| Resistencia (aeróbica / anaeróbica) | texto corto + tags | no | público | Ej. “capacidad anaeróbica alta para esfuerzos explosivos repetidos”. |
| Flexibilidad (rango articular) | texto corto + tags | no | público | Ej. “rango óptimo en hombros para remate”. |

**Visión post-MVP:** reemplazar texto libre por métricas numéricas (salto vertical cm, 40 m en segundos, VO₂ max estimado, rangos articulares en grados) y permitir registro por entrenador/evaluador acreditado. Cada métrica numérica también será configurable en visibilidad (default propuesto: `promotores`).

### Bloque 4 — Destrezas técnicas y especialización

Bloque **dependiente de la disciplina**. El modelo se estructura **por deporte** con un esquema propio por disciplina (decisión confirmada). En MVP1 se instancia sólo para fútbol; post-MVP se añaden esquemas por deporte (voleibol, futsal, básquet, etc.).

**Forma de implementación propuesta (decisión final en Gate 3 — arquitectura):**

- Tabla/entidad base `athlete_sport_profile` con `sport_id` + columnas comunes (rendimiento_individual_texto, rendimiento_colectivo_texto, rol_tactico_texto, visibilidad_por_campo).
- Campos específicos por deporte almacenados en:
  - opción A — JSONB con schema validado por `sport_id` (más flexible, menos queryable);
  - opción B — tablas satélite por deporte (`football_profile`, `volleyball_profile`, …) con FK a `athlete_sport_profile` (más queryable, más tablas).
- Un usuario puede tener **múltiples perfiles por deporte** (un mismo deportista puede ser jugador de fútbol **y** voleibol); cada uno con su propio set de campos y su propia visibilidad.

**Campos comunes (todos los deportes):**

| Campo | Tipo | Obligatorio | Visibilidad default | Notas |
|-------|------|-------------|---------------------|-------|
| Rendimiento individual y marcas | texto + numéricos según deporte | no | público | Ej. voleibol: alcance en remate 3.20 m, récord de saques efectivos. Ej. fútbol: goles por partido, % de acierto en pases, velocidad máxima. |
| Rendimiento colectivo y rol táctico | texto estructurado | no | público | Ej. voleibol: “atacante externo, efectivo en bloqueo y defensa en segunda línea”. Ej. fútbol: posición (RF-002 MVP1), rol táctico, fortalezas en bloque defensivo/ofensivo. |

**Campos específicos — fútbol (MVP1):**

| Campo | Tipo | Obligatorio | Visibilidad default |
|-------|------|-------------|---------------------|
| Posición preferida | enum (`portero`, `defensa`, `mediocampista`, `delantero`, + subposiciones) | sí | público |
| Pie hábil | enum (`derecho`, `izquierdo`, `ambos`) | sí | público |
| Stats derivadas (partidos jugados, goles, victorias) | numéricos calculados | n/a | público | Alimentadas por RF-005. Configurable ocultar/mostrar. |

**Campos específicos — voleibol (ejemplo post-MVP):**

| Campo | Tipo |
|-------|------|
| Posición (atacante externo, central, opuesto, líbero, armador) | enum |
| Alcance en remate (m) | decimal |
| Alcance en bloqueo (m) | decimal |
| Récord de saques efectivos | entero |

**Dependencia con RF-005 (resultados y tabla):** parte de este bloque se alimenta automáticamente desde estadísticas de torneos (goles, partidos, victorias). El resto es auto-reporte o validación cruzada (RF-006).

## Subconjunto del modelo que aplica a MVP1 (fútbol, Opción A Acotada)

El MVP1 implementa sólo campos estrictamente necesarios para el loop de valor registro → verificación de edad → ficha → torneo → inscripción → resultados:

- **Principio transversal:** selector de visibilidad por campo (`público` / `promotores` / `privado`) en todos los campos del perfil, con defaults según tablas arriba.
- **Bloque 1 (Identidad):** nombre, edad (+ verificación por RF-007), ubicación, disciplina fija `fútbol`, intereses (opcional), sección social compuesta (texto libre + tags curados — ambos opcionales).
- **Bloque 2 (Morfológico):** estatura, peso, lateralidad.
- **Bloque 3 (Capacidades condicionales):** fuera de alcance MVP1; backlog.
- **Bloque 4 (Destrezas — fútbol):** posición preferida, pie hábil, stats básicas alimentadas por RF-005 (partidos jugados, goles, victorias). Multi-deporte y voleibol/otros: fuera de alcance MVP1.

Campos fuera de alcance MVP1 que quedan en backlog explícito: envergadura, somatotipo, capacidades condicionales detalladas, rendimiento técnico detallado multi-deporte.

Ver RF-002 en `docs/01-requisitos-funcionales.md` para la versión formal con criterios GIVEN/WHEN/THEN del subconjunto MVP1.

## Módulo / área: [OTRO MÓDULO]

*No aplica por ahora; usar plantilla abajo cuando surjan nuevos RF en intake.*

```
- RF borrador N: [DESCRIPCIÓN]
```

## Dependencias o integraciones conocidas

- **Storage de imágenes** (foto de perfil, documento de identidad para RF-007): Supabase Storage o equivalente.
- **Taxonomía de disciplinas deportivas:** mantenible en tabla de catálogo (post-MVP multi-deporte).
- **Esquema por deporte del Bloque 4:** confirmado como estructura por disciplina; elegir entre JSONB validado por schema vs tablas satélite en Gate 3 (arquitectura).
- **Catálogo de tags curados** (habilidades blandas, capacidades condicionales): tabla de catálogo administrable post-MVP.
- **Sistema de privacidad por campo:** requiere modelo de `visibility_level` persistido por (usuario, campo) — decisión de schema en Gate 3.

## Resoluciones (decisiones del fundador)

Las siguientes dudas fueron resueltas y quedan documentadas para trazabilidad:

1. **Verificación de edad (RF-007) en MVP1: SÍ.** RF-007 entra al alcance del MVP1, ampliando de 5 a 6 RF (RF-001 a RF-005 + RF-007). Ver `docs/00-prd.md` sección 4 “En alcance”.
2. **Visibilidad por defecto de campos morfológicos: configurable por el usuario.** Datos sensibles (peso, estatura, envergadura, somatotipo) tienen default `promotores`; el usuario puede elevar a `público` o restringir a `privado`. El principio se generaliza a todo el perfil (ver sección “Principio transversal”).
3. **Bloque 4 — estructura por deporte: SÍ.** Modelo base deporte-agnóstico + esquemas específicos por disciplina. MVP1 instancia sólo fútbol; post-MVP añadir voleibol y otros. Decisión de implementación técnica (JSONB vs tablas satélite) en Gate 3.
4. **Perfil social y habilidades blandas: texto libre + tags curados (ambos).** Sección compuesta donde los dos subcampos se complementan — los tags permiten scaneo rápido y la descripción libre da contexto narrativo. Catálogo inicial de tags sugerido en Bloque 1.

## Dudas abiertas

- Post-MVP: ¿capacidades condicionales se registran por auto-reporte, evaluador acreditado, o test físico integrado (wearables)? Decidir en roadmap (`07-modelo-negocio-y-roadmap.md`).
- ¿El catálogo de tags (habilidades blandas, capacidades condicionales) admite sugerencias de usuarios con moderación, o es cerrado por admin? Definir en diseño (Gate 2).
- ¿Un deportista puede tener **múltiples disciplinas principales** activas simultáneamente en su perfil, o debe elegir una y el resto son secundarias? Relevante para multi-deporte post-MVP.
