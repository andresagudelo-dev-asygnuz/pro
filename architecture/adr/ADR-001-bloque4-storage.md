# ADR-001 — Estrategia de almacenamiento del Bloque 4 (Destrezas técnicas por deporte)

- **Estado:** Aceptada
- **Fecha:** 2026-04-17
- **Decisores:** Andres Agudelo (fundador) + arquitecto (rol architecture de la fábrica).
- **Relacionado con:** RF-002, `docs/intake/04-requisitos-funcionales-borrador.md`, `design/wireframes/03-profile-edit.md`, `db/data-model.md` §3.6.

## Contexto

RF-002 define el perfil tipo ficha en **4 bloques deporte-agnóstico**. Los bloques 1–3 (Identidad, Morfológico/Biométrico, Capacidades Condicionales) son **comunes a todo deporte**. El Bloque 4 (Destrezas Técnicas y Especialización) es **específico por deporte**: para fútbol importan `posición`, `pie hábil`, `rol táctico`; para voleibol `alcance de remate`, `saque efectivo`; para tenis `tipo de golpe dominante`, etc.

MVP1 sólo instancia fútbol, pero el modelo debe dejar la puerta abierta a otros deportes post-MVP sin rediseñar la base.

## Opciones evaluadas

### Opción A — Tabla única con `jsonb` validado por schema

```sql
create table public.profiles_technical (
  user_id uuid pk references auth.users,
  sport_id text not null references public.sports,
  data jsonb not null default '{}'::jsonb,
  check (jsonb_matches_schema((select schema from public.sport_technical_schemas s where s.sport_id = profiles_technical.sport_id), data))
);
```

**Pros**
- Un único punto de extensión; agregar deporte = agregar JSON schema.
- Schema flexible para exploración; no requiere migración al cambiar campos.
- Consultas genéricas posibles.

**Contras**
- Validación en JSON schema **externa al motor**: depende de función `jsonb_matches_schema` (extensión `pg_jsonschema`) o triggers custom — más superficie para bugs.
- Consultas por campo específico son más lentas (`->`, `->>`) y requieren índices GIN o expresión — más complejo de mantener.
- Tipado desde TypeScript poco natural; necesitaríamos parsear con `zod` runtime + reflejar el mismo shape en DB.

### Opción B — Tabla satélite por deporte (`profiles_technical_football`, `profiles_technical_volley`, …)

```sql
create table public.profiles_technical_football (
  user_id uuid pk references auth.users,
  position public.football_position not null,
  dominant_foot public.dominant_foot not null,
  performance_notes text,
  tactical_role_notes text
);
```

**Pros**
- Tipos Postgres fuertes (enums, checks) reutilizables en zod y tipos TS generados.
- Consultas y filtros por columna son triviales y veloces.
- RLS y policies por deporte quedan naturales (una tabla = un dominio).
- Acorde al pipeline `apps/web/supabase/migrations/*.sql` actual (SQL puro, sin dependencias de extensiones exóticas).

**Contras**
- Agregar un deporte = nueva tabla + migración. En MVP1 sólo aplica fútbol, así que el costo es 0 hoy.
- Riesgo de duplicar conceptos (p.ej. "notas de rendimiento") entre deportes. Mitigable con convención de naming.

### Opción C — Híbrida: columnas comunes + `jsonb` por deporte

Una tabla `profiles_technical` con columnas comunes (`performance_notes`, `tactical_role_notes`) + `sport_specific jsonb`. Combina lo peor de A (validación débil del jsonb) con lo mejor de B sólo parcialmente.

## Decisión

**Se adopta la Opción B** (tabla satélite por deporte).

- MVP1 crea únicamente `profiles_technical_football` según `db/data-model.md` §3.6.
- Se mantiene el contrato con la UI (wireframe 03): un conjunto de campos tipados por deporte.
- Cuando un nuevo deporte entre al roadmap (voleibol, tenis, pádel), la convención es:
  1. Crear `profiles_technical_<deporte>` con las columnas específicas.
  2. Agregar sus enums a `public` (`<deporte>_position`, …).
  3. Generar tipos TS y schemas zod a partir del esquema.
  4. Actualizar el wireframe 03 con la variante correspondiente.

## Consecuencias

- **Positivas:**
  - Tipado fuerte end-to-end; zero dependencia de extensiones.
  - Consultas eficientes por columna (filtros por posición, pie hábil).
  - RLS fácil de razonar.
- **Negativas:**
  - Cada nuevo deporte agrega una tabla. Se acepta como costo lineal esperable de negocio; el producto no proyecta soportar 50 deportes.

## Seguimiento

- Cuando se incorpore el segundo deporte se evaluará si aparece una "superficie común" que justifique extraer una tabla abstracta. Hoy no se justifica YAGNI.
