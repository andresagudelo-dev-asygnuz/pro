# Intake — fuente de contexto de negocio / producto

Carpeta **canónica** para todo lo que llega **antes** o **en paralelo** al PRD formal. Objetivo: misma estructura en **todos** los proyectos de la fábrica, lectura predecible para personas y agentes, y trazabilidad hacia `docs/00-prd.md` y RF/RNF oficiales.

## Intake vs documentos formales (Gate 1)

| Capa | Ubicación | Rol |
|------|-----------|-----|
| **Intake** | `docs/intake/*.md` | Investigación, borradores, notas, encuestas, visiones largo plazo. Puede ser imperfecto o redundante. |
| **Formal** | `docs/00-prd.md`, `01`, `02` | Versión acordada para desarrollo: criterios comprobables, alcance cerrado, alineado a gates. |

**Flujo:** el intake alimenta el PRD; no sustituye `00-prd.md` hasta que el equipo lo consolide.

## Archivos (orden sugerido de lectura)

| Archivo | Contenido |
|---------|-----------|
| [`00-indice-y-alcance.md`](00-indice-y-alcance.md) | Entrada única: nombre producto, decisión de MVP, índice del resto, enlaces externos. |
| [`01-contexto-y-vision.md`](01-contexto-y-vision.md) | Problema, oportunidad, contexto, misión/visión si existen. |
| [`02-usuarios-y-mercado.md`](02-usuarios-y-mercado.md) | Segmentos, competencia, tamaño mercado, geografía. |
| [`03-propuesta-valor-y-mvp.md`](03-propuesta-valor-y-mvp.md) | Propuesta de valor, alcance MVP explícito, **fuera de alcance**, hipótesis. |
| [`04-requisitos-funcionales-borrador.md`](04-requisitos-funcionales-borrador.md) | Lista / RF en bruto (antes de GIVEN/WHEN/THEN en `01-requisitos-funcionales.md`). |
| [`05-requisitos-no-funcionales-borrador.md`](05-requisitos-no-funcionales-borrador.md) | RNF en bruto. |
| [`06-validacion-y-encuestas.md`](06-validacion-y-encuestas.md) | Encuestas, entrevistas, resultados de validación. |
| [`07-modelo-negocio-y-roadmap.md`](07-modelo-negocio-y-roadmap.md) | Monetización, roadmap, visión 3–10 años, riesgos de negocio. |
| [`08-anexos.md`](08-anexos.md) | Metodologías (Design Thinking, etc.), transcripciones, material que no encaja arriba. |

## Convenciones

- Un tema **no duplicado** en dos archivos: enlazar desde el índice.
- Si un archivo no aplica, dejar una línea: `*No aplica en este proyecto.*`
- Nombres de archivo **fijos** (mismo en todos los repos) para que agentes y plantillas los encuentren siempre igual.

## Relación con la memoria del proyecto

Decisiones ya **cerradas** que afectan implementación: `memory/project-memory.md` y ADRs en `memory/adrs/`. El intake puede contener **debate**; la memoria guarda **resolución**.
