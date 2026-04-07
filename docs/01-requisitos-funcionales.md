# Requisitos Funcionales — PRO

## Estado de migración

- **Inventario completo:** RF1.x–RF8.x en `PRO-gestion.documental.md` (módulos perfiles, equipos, torneos, inscripción, social, visualización, live, soporte).
- **Intake borrador:** migrar y priorizar en `docs/intake/04-requisitos-funcionales-borrador.md`.
- **Hasta elegir MVP único:** no expandir este archivo con los ~40 RF del informe; solo **núcleo** y **backlog** explícito.

## RF prioritarios propuestos (pre-decisión MVP)

Los siguientes son **candidatos** si el MVP es **Opción A (torneos + perfiles)**; revisar si el MVP es **Opción B** (mapa/grupos).

### RF-001 — Registro y rol (jugador / promotor)

- **Descripción:** El usuario puede registrarse y seleccionar rol jugador o promotor (o ambos si negocio lo permite).
- **Actor:** Usuario nuevo.
- **Precondiciones:** Ninguna.
- **Flujo principal:** Registro → verificación mínima → perfil base.
- **Flujo alterno:** Rechazo validación edad / datos incompletos.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un visitante sin cuenta WHEN completa registro válido THEN el sistema crea cuenta y asigna rol solicitado.
  - GIVEN registro jugador WHEN falta documento para verificación de edad THEN el sistema indica el paso pendiente (si RF de verificación aplica en MVP).

### RF-002 — Perfil de jugador tipo ficha

- **Descripción:** Jugador puede cargar foto, posición, estadísticas básicas y personalización visual acotada (alcance exacto según MVP).
- **Actor:** Jugador.
- **Precondiciones:** Cuenta jugador.
- **Flujo principal:** Completar/editar perfil.
- **Flujo alterno:** Campos opcionales omitidos.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN jugador autenticado WHEN guarda perfil con datos mínimos THEN el sistema persiste y muestra ficha pública o privada según reglas.

### RF-003 — Crear y configurar torneo (promotor)

- **Descripción:** Promotor crea torneo de fútbol con reglas básicas (formato, cupos, ubicación, categorías).
- **Actor:** Promotor.
- **Precondiciones:** Cuenta promotor.
- **Flujo principal:** Asistente creación torneo → publicación.
- **Flujo alterno:** Borrador sin publicar.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN promotor autenticado WHEN envía datos mínimos de torneo THEN el sistema crea torneo visible para inscripciones según estado publicado.

### RF-004 — Inscripción de equipo o jugador a torneo

- **Descripción:** Equipo o jugador se inscribe a torneo publicado (reglas de individual vs equipo según MVP).
- **Actor:** Jugador / capitán.
- **Precondiciones:** Torneo abierto; cupos disponibles.
- **Flujo principal:** Seleccionar torneo → confirmar inscripción.
- **Flujo alterno:** Lista de espera o cierre de inscripciones.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN torneo abierto WHEN equipo válido se inscribe THEN el sistema registra participación y notifica al promotor.

## RF-005 — (reservado)

Siguiente RF priorizado tras cerrar MVP y desglosar backlog. Copiar estructura de RF-001.

## Backlog (referencia)

- Feed, notificaciones, chat, live, soporte: ver RF5–RF8 en monolito; **incluir en MVP solo tras decisión explícita** en PRD sección alcance.
