# ADR-004 — Autenticación (Supabase Auth, método y proveedores)

- **Estado:** Aceptada
- **Fecha:** 2026-04-17
- **Decisores:** Andres Agudelo (fundador) + arquitectura / seguridad.
- **Relacionado con:** RF-001, `design/user-flows.md` Flujo 1, `design/wireframes/01-register.md`, `db/data-model.md` §3.1.

## Contexto

RF-001 requiere registro con elección de rol (jugador, promotor o ambos) y login posterior. Debe ser:

- Simple para el público objetivo (adultos mayores de 18, amateurs del Eje Cafetero).
- Seguro sin introducir fricción excesiva.
- Coherente con el stack del template (`apps/web` usa `@supabase/ssr` + `@supabase/supabase-js`).
- Compatible con la mecánica de **Server Actions** y **RSC** del App Router de Next.js 16.

## Opciones evaluadas

### Opción A — Email/password + OTP por email

Flujo clásico con contraseña + verificación de email por magic link o código OTP.

**Pros**
- Simple, universal, funciona offline de proveedores de redes sociales.
- Soportado nativamente por Supabase Auth (sign up, sign in, reset, magic link).
- Bajo esfuerzo para implementar recuperación de cuenta.

**Contras**
- Los usuarios deben gestionar una contraseña propia.
- Si se usa magic link sin password, cada sesión requiere clic en email (alta fricción para usuarios frecuentes).

### Opción B — Sólo magic link (passwordless)

Flujo sin contraseña; el sistema envía un link por email para cada login.

**Pros**
- Menos riesgo de filtraciones de contraseña.
- UX más simple para usuarios casuales.

**Contras**
- Dependencia absoluta del proveedor de email (si llega a spam el usuario queda bloqueado).
- No funciona bien si el usuario cambia de dispositivo durante el flujo.
- Peor para usuarios con email empresarial filtrado.

### Opción C — OAuth (Google / Apple / Facebook)

Login con proveedores externos.

**Pros**
- 1-click signup; cero fricción para usuarios con cuenta Google.
- Delega gestión de contraseña al proveedor.

**Contras**
- Requiere configurar cada proveedor (Google Cloud, Apple Developer, etc.) con consola, términos y verificación.
- Parte del mercado LATAM no tiene Apple ID; algunos no quieren usar Google para deportes.
- Apple login tiene requisitos especiales para iOS (no aplica MVP1 web, pero se bloquea si el futuro móvil usa Apple).

### Opción D — Híbrida: email/password + OTP por email + Google OAuth opcional

Combinación de A y C. Email/password como default, Google como acelerador.

**Pros**
- Cubre a ambos segmentos: quienes prefieren password y quienes prefieren 1-click.
- Permite a quienes se registran con OAuth linkearlo luego a email/password.

**Contras**
- Doble integración; UI con dos caminos.
- Google requiere setup inicial de credenciales y pantalla de consentimiento.

## Decisión

**Se adopta la Opción D (híbrida) con alcance MVP1 reducido: email/password + verificación por email obligatoria. Google OAuth queda preparado pero detrás de feature flag y se habilita en Sprint 2 si el setup está listo**.

### Implementación MVP1 Sprint 1

- **Proveedor base:** Supabase Auth (ya en `package.json`).
- **Método:** email/password.
- **Verificación de email:** obligatoria antes de completar onboarding (Supabase lo soporta nativo con `emailConfirm = true`).
- **Sesión:** cookie HttpOnly + Secure manejada por `@supabase/ssr`; refresh transparente.
- **Middleware:** `apps/web/middleware.ts` + `apps/web/lib/supabase/middleware.ts` protegen rutas `/profile/*`, `/tournaments/mine`, `/tournaments/*/register`, `/admin/*` según corresponda.
- **Roles** almacenados en `public.user_roles` (ver `db/data-model.md` §3.1); al registrarse el usuario escoge al menos uno.
- **Recuperación de contraseña:** flujo estándar Supabase (email con link); página `/auth/reset`.
- **Password policy:**
  - Mínimo 8 caracteres.
  - Requiere al menos 1 mayúscula + 1 dígito + 1 símbolo.
  - Validado con `zod` tanto en cliente como server action; Supabase adicionalmente valida mínimo.
- **Rate limiting:** `lib/rate-limit.ts` ya existe en el template; se configura límite por IP para `/auth/login` y `/auth/register`.
- **Logout:** invalida sesión server-side (Supabase `signOut`) y limpia cookies.

### MVP1 Sprint 2 (feature flag, optional)

- **Google OAuth** vía Supabase Auth providers.
  - Requiere `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en secrets del org / proyecto.
  - Botón "Continuar con Google" aparece en `01-register.md` y `/auth/login` cuando la feature flag `AUTH_GOOGLE_ENABLED = true`.
  - Tras OAuth exitoso, si el usuario no tiene `user_roles`, se redirige a pantalla de selección de rol antes de habilitar las rutas protegidas.

### Fuera de alcance MVP1

- Apple / Facebook / SMS OTP.
- 2FA con TOTP (documentado como post-MVP; dejamos la puerta abierta en el esquema de `auth.users` de Supabase).
- Passwordless magic link exclusivo (rechazado por fricción de email).

## Consecuencias

- **Positivas:**
  - Flujo universal y estable que funciona para todo el público objetivo.
  - Cero complejidad extra: ya hay código base en `apps/web/lib/auth`.
  - Google OAuth queda disponible como "aceleración" sin bloquear G4 Sprint 1.
- **Negativas:**
  - Usuarios deben recordar una contraseña. Se mitiga con UX de recuperación clara + validación en vivo.
  - Coordinar roles duales (jugador + promotor) en la UI requiere cuidado — se refleja en HU-001.

## Controles de seguridad asociados

- Rate limiting en endpoints de auth.
- Rotación de secretos documentada en `devops/deployment.md` (G7).
- CSRF: Next.js 16 Server Actions mitigan automáticamente con tokens por form; nuestras actions de auth no dependen de tokens de terceros.
- Password hashing: bcrypt manejado por Supabase; no almacenamos passwords en `public`.
- Logs: intentos fallidos de login visibles en Supabase dashboard; en G5 se agrega alerta manual si hay spike.

## Seguimiento

- Si en post-MVP se decide OAuth masivo (Google + Apple), se amplía este ADR como ADR-004bis o uno nuevo (ADR-00X) con migración y UX.
- Si surge necesidad de SSO empresarial (post-MVP2), se evalúa Supabase Auth SSO (SAML).
