# Solution Architecture

> **Estado:** borrador técnico — Gate 3 pendiente. Este documento se cerrará cuando se decida el MVP en Gate 1.

## Visión general
- **Objetivo técnico:** entregar la plataforma PRO (perfil deportivo, torneos, comunidad) con un stack managed que minimice operación y permita iterar rápido en MVP.
- **Contexto:** producto pre-MVP, equipo reducido, necesidad de auth + DB relacional + storage multimedia + realtime potencial (chat/live posterior).

## Arquitectura lógica
- **Módulos (borrador, depende de MVP elegido):**
  - `auth` (registro/login, perfiles).
  - `profile` (stats tipo "FIFA", logros).
  - `tournaments` (torneos, inscripciones, brackets) — si MVP Opción A.
  - `social` (grupos, mapa, chat) — si MVP Opción B / híbrido.
  - `admin` (organizadores).
- **Responsabilidades:** frontend Next.js maneja UI + auth UI; backend lógico vive principalmente en Supabase (Postgres + Row Level Security + Edge Functions cuando haga falta).

## Arquitectura física
- **Runtime frontend:** Next.js 16 (App Router, RSC, Server Actions) sobre Node 22. Ubicación: `apps/web/`.
- **Hosting frontend:** Vercel (preview por PR, prod en `main`).
- **DB / Backend-as-a-Service:** **Supabase**
  - Postgres gestionado + extensiones (`pgcrypto`, `postgis` si aplica a mapa).
  - Supabase Auth (email/OTP, OAuth Google a confirmar).
  - Supabase Storage para avatares / media.
  - Supabase Realtime (chat / notificaciones, fase posterior).
  - Edge Functions para lógica server-side sensible que no quepa en RSC/Server Actions.
- **Integración:** `@supabase/ssr` en Next.js (cookies compartidas entre RSC/middleware/client). Ver `apps/web/lib/supabase/`.

## Patrones y principios
- **SOLID aplicado:** separación UI (componentes shadcn) / data access (`lib/supabase/*`) / dominio (módulos en `app/(domain)/...`).
- **Clean architecture boundaries:**
  - `app/` → capa de presentación y routing.
  - `lib/` → adaptadores (Supabase, utilidades).
  - Reglas de negocio no triviales van en funciones puras testeables, no en componentes.
- **Seguridad:** **Row Level Security obligatoria** en todas las tablas. Nunca usar `service_role` en el cliente.

## Decisiones técnicas clave
- **DT-01: Supabase como BaaS** (reemplaza la mención inicial a Neon en el template). Justificación: auth + storage + realtime + RLS out-of-the-box reducen superficie a implementar para el MVP.
- **DT-02: App Router + RSC** por defecto; `"use client"` sólo cuando haya interactividad real.
- **DT-03: Tailwind v4 + shadcn/ui** como design system base; tokens semánticos (`bg-primary`, `text-muted-foreground`).
- **DT-04: pnpm** como package manager.

## Riesgos técnicos
- **Riesgo:** acoplamiento a Supabase dificulta migración futura.
  - **Mitigación:** aislar acceso a datos en `lib/supabase/*` y repositorios de dominio; no usar features exclusivos sin evaluar costo de migración.
- **Riesgo:** RLS mal configurada → fuga de datos.
  - **Mitigación:** policies por tabla + tests automatizados de autorización en Gate 5.
- **Riesgo:** Next.js 16 es reciente; posibles breaking changes en APIs.
  - **Mitigación:** mantener `apps/web/AGENTS.md` actualizado y leer `node_modules/next/dist/docs/` antes de tocar APIs de Next.

## Referencias
- Cliente y helpers: `apps/web/lib/supabase/` (`client.ts`, `server.ts`, `middleware.ts`).
- Env vars: `apps/web/.env.example`.
- Migraciones: `apps/web/supabase/migrations/` (Supabase CLI).
