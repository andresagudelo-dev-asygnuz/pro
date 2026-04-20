## Sprint 2 — G4 Desarrollo (HU-003 · perfil tipo ficha + visibilidad)

> Gate activo: **G4** (`tasks/current-gate.txt` = `4`). Este sprint abre el trabajo de perfil, sobre la base de acceso + verificación de edad del Sprint 1.

### Objetivo de valor

Que un jugador con verificación `aprobada` pueda:

1. Completar su perfil tipo ficha en los 4 bloques (Identidad, Morfológico, Capacidades, Destrezas fútbol) — **HU-003 / RF-002**.
2. Elegir la **visibilidad por campo** (`publico` / `promotores` / `privado`) con defaults sensibles (morfológicos = `promotores`).
3. Ser visto en una ficha pública `/u/:slug` que respeta la visibilidad configurada, distinguiendo visitante sin sesión, jugador autenticado y promotor.

### HUs incluidas

| HU | Título | Criterios GWT |
|----|--------|----------------|
| HU-003 | Perfil tipo ficha con selector de visibilidad | `tasks/hu/HU-003.md` |

### Plan de entrega por PRs

Sprint 2 se entrega en PRs pequeños y revisables, en este orden:

1. **PR A — DB foundation (este PR).** Migración Supabase `20260417140000_g4_sprint2_profiles.sql`:
   - Enums `public.laterality`, `somatotype`, `football_position`, `dominant_foot`, `visibility_level` (ASCII: `publico`, `promotores`, `privado`).
   - Catálogos `public.skill_tags` y `public.visibility_fields` (20 field_keys MVP1 con `default_level`) con RLS `read_all` y escritura sólo `service_role`.
   - Tablas `public.profiles_core`, `profiles_morpho`, `profiles_conditional`, `profiles_technical_football` con RLS `self-only` (read/insert/update).
   - Tabla `public.profile_field_visibility(user_id, field_key, level)` con RLS `self-only`.
   - Función `public.seed_field_visibility_defaults()` + 4 triggers `after insert` sobre cada tabla de perfil que siembran defaults del bloque leyendo `visibility_fields`.
   - **No toca UI ni `apps/web/lib`.** Backend puro + seed.
2. **PR B — Form de edición Bloque 1 + selector de visibilidad (HU-003 parcial).** Ruta `/perfil/editar` (o evolución de `app/(app)/profile/`):
   - Bloque 1 Identidad con los 7 campos del catálogo.
   - Componente `<VisibilitySelect>` + `<FieldWithVisibility>` del wireframe 03.
   - Server Action `saveIdentityBlock` + `setFieldVisibility`.
   - Validación Zod contra catálogo (`visibility_fields`) y contra `skill_tags` para soft_skills_tags.
3. **PR C — Bloques 2/3/4 + preview "como me ven los demás".**
   - Bloque 2 Morfológico, Bloque 3 Capacidades, Bloque 4 Destrezas fútbol.
   - Toggle "Previsualizar como público / promotor" que llama a la vista de serialización por audiencia.
4. **PR D — Vista pública `/u/[slug]` respetando visibilidad.**
   - Resolver audiencia (`guest` / `authenticated` / `promotor` / `owner`) desde sesión + `user_roles`.
   - Serializar con vista `public.profile_public_view` o función por campo; ocultar secciones completas cuyo contenido no coincide con la audiencia (no filtrar metadatos).
   - Respetar `soft_skills_tags` contra catálogo; avatar opcional (si lo hay en v0 coexistente).

### Criterios de salida del sprint

- Las 4 PRs mergeadas con CI verde.
- Tests unitarios de los schemas + helpers de serialización por audiencia ≥ 80 % líneas nuevas.
- Smoke manual: completar perfil → cambiar visibilidad → ver `/u/:slug` desde 3 audiencias distintas.
- `tasks/gate-status.md` → Sprint 2 completado, Sprint 3 (HU-004+005: torneos + inscripción) como siguiente.

### Fuera de alcance (Sprint 2)

- Avatar upload (se reutiliza del esquema v0 si está disponible; subida nueva va a Sprint 4 / hardening).
- Tabs de "Otros deportes" (MVP1 sólo fútbol — `profiles_technical_football`).
- Calificación por pares / XP / amistad (post-MVP, ver módulo "Interacción social y gamificación").
- Edición en móvil optimizada (baseline responsive; tuning visual queda para G2' post-MVP).
