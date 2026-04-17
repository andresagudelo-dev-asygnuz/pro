# ADR-002 — Modelo de `visibility_level` por campo del perfil

- **Estado:** Aceptada
- **Fecha:** 2026-04-17
- **Decisores:** Andres Agudelo (fundador) + arquitectura / DB.
- **Relacionado con:** RF-002, principio transversal "todo configurable por el usuario" (`docs/intake/04-requisitos-funcionales-borrador.md`), `design/wireframes/03-profile-edit.md`, `design/wireframes/04-profile-public-view.md`, `db/data-model.md` §3.7.

## Contexto

RF-002 establece que **cada campo del perfil** tiene un nivel de visibilidad configurable por el usuario: `público`, `promotores`, `privado`. Los defaults son sensibles (ver `design/user-flows.md` Flujo 3): núcleo de Identidad = `público`, morfológicos = `promotores`, documento de identidad (RF-007) nunca se expone.

El modelo debe:

- Soportar ~20–30 campos en MVP1 y escalar a más cuando entren deportes nuevos.
- Permitir consultas rápidas para renderizar la vista pública del perfil (`/u/:slug`).
- Evitar un frontend frágil donde cada columna nueva requiere reescribir la lógica de audiencia.

## Opciones evaluadas

### Opción A — Columnas enum inline por campo

Para cada campo del perfil, agregar una columna `visibility_<field> public.visibility_level`:

```sql
alter table public.profiles_core
  add column visibility_city public.visibility_level default 'público',
  add column visibility_interests public.visibility_level default 'público';
-- … por cada campo
```

**Pros**
- Query trivial: `select case when visibility_city = 'público' or owner then city end …`.
- Esquema 100% validado por Postgres.

**Contras**
- Explosión de columnas (≥ 15 columnas extra sólo en bloque 1).
- Cada campo nuevo = migración + cambio en 3 capas (SQL, zod, UI).
- Difícil componer audiencias (no se puede listar "todos los campos privados de este usuario" sin inspeccionar cada columna).

### Opción B — Tabla genérica `profile_field_visibility(user_id, field_key, level)`

```sql
create table public.profile_field_visibility (
  user_id uuid references auth.users on delete cascade,
  field_key text not null,
  level public.visibility_level not null default 'público',
  primary key (user_id, field_key)
);
```

Acompañada de un catálogo cerrado `public.visibility_fields(field_key)` para evitar que el cliente invente keys.

**Pros**
- Agregar un campo nuevo = agregar una entrada en el catálogo + seed + un registro en la tabla. No hay cambio de schema de `profiles_*`.
- Audiencia computable en una sola query (`select field_key where level = 'promotores' and user_id = …`).
- Se mantiene el patrón "selector por campo" trivial en UI (el control reutilizado del wireframe 03).

**Contras**
- Un join adicional en la vista pública (aceptable; además cacheable).
- Necesita catálogo (`visibility_fields`) como fuente de verdad para evitar keys erráticas.

### Opción C — `jsonb` por usuario (`visibility jsonb`)

Un único `jsonb` en `profiles_core` con `{ "identity.city": "público", "morpho.height_m": "promotores" }`.

**Pros**
- Cero tablas extras.

**Contras**
- Validación débil (mismo problema que ADR-001 opción A).
- No permite agrupar/consultar fácilmente por nivel entre usuarios.
- No indexable por clave sin `jsonb_path_ops` + expresiones.

## Decisión

**Se adopta la Opción B** (tabla genérica `profile_field_visibility` con catálogo `visibility_fields`).

- `field_key` sigue una convención `bloque.atributo` (ej. `identity.city`, `morpho.height_m`, `technical.football.position`).
- Los defaults se materializan por trigger (`public.default_field_visibility()`) al completar cada bloque por primera vez.
- Para la vista pública (`/u/:slug`) se define una **vista** `public.profile_public_view(user_id, audience)` que aplica el filtro por campo visible para esa audiencia y expone sólo los campos aprobados.
- **Excepción explícita:** el documento de identidad de RF-007 no es un "campo de perfil" y **no tiene entrada en `visibility_fields`**; se gestiona únicamente por `age_verifications` con acceso privilegiado.

## Consecuencias

- **Positivas:**
  - El wireframe 03 (selector por campo) se mapea 1:1 a filas de la tabla.
  - Agregar campos del perfil o deportes nuevos no impacta esquema de `profiles_*`.
  - Auditoría de visibilidades por usuario es una consulta directa.
- **Negativas:**
  - Se requiere seed obligatorio de `visibility_fields` en la primera migración y extensión en cada nuevo bloque/deporte. Se mitiga con una sola migración de seeding por entidad nueva.
  - La UI debe validar contra el catálogo para evitar 400 en guardado.

## Regla de seguridad crítica

RLS de `profile_field_visibility`: sólo el dueño (`auth.uid() = user_id`) puede leer/mutar. Las vistas agregadas para terceros nunca retornan el valor del `level`, sólo el dato filtrado. Esto evita fugar "qué oculta X" como side-channel.

## Seguimiento

- Cuando se introduzca "visibilidad por relación" (amistad) post-MVP, se extiende el enum `visibility_level` en lugar de cambiar la estructura. Se aprovecha la misma tabla.
