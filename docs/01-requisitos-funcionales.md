# Requisitos Funcionales — PRO

## Estado de migración

- **Inventario completo:** RF1.x–RF8.x en `PRO-gestion.documental.md` (módulos perfiles, equipos, torneos, inscripción, social, visualización, live, soporte).
- **Migración completada:** todos los RF del monolito (RF1.1–RF8.2) migrados a formato estándar (RF-001 a RF-004, RF-006 a RF-018). Ver tabla de trazabilidad al final del documento.
- **Intake borrador:** `docs/intake/04-requisitos-funcionales-borrador.md` disponible como plantilla para RFs futuros.
- **MVP decidido:** Opción A Acotada — **RF-001 a RF-005 + RF-007** conforman el MVP1 (6 RF). RF-005 (Resultados y tabla de posiciones) es un RF nuevo para cerrar el loop de valor del MVP. RF-007 (Verificación de edad) se incorpora al MVP1 tras resolución del fundador (ver `docs/intake/04-requisitos-funcionales-borrador.md`, sección Resoluciones). Decisión original en `docs/intake/03-propuesta-valor-y-mvp.md`.

## RF prioritarios — MVP1 (Opción A Acotada)

Los siguientes **6 RF** conforman el alcance del MVP1: RF-001 a RF-005 (decisión original en `docs/intake/03-propuesta-valor-y-mvp.md`) **más RF-007 (verificación de edad)**, incorporado a MVP1 tras decisión del fundador documentada en `docs/intake/04-requisitos-funcionales-borrador.md` (sección Resoluciones).

### RF-001 — Registro y rol (jugador / promotor)

- **Descripción:** El usuario puede registrarse y seleccionar rol jugador o promotor (o ambos si negocio lo permite).
- **Actor:** Usuario nuevo.
- **Precondiciones:** Ninguna.
- **Flujo principal:** Registro → verificación mínima → perfil base.
- **Flujo alterno:** Rechazo validación edad / datos incompletos.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un visitante sin cuenta WHEN completa registro válido THEN el sistema crea cuenta y asigna rol solicitado.
  - GIVEN registro jugador WHEN falta documento para verificación de edad THEN el sistema indica el paso pendiente y enlaza al flujo de RF-007 (verificación obligatoria en MVP1).

### RF-002 — Perfil de jugador tipo ficha

- **Descripción:** Jugador puede cargar foto, posición, estadísticas básicas y personalización visual acotada (alcance exacto según MVP).
- **Actor:** Jugador.
- **Precondiciones:** Cuenta jugador.
- **Flujo principal:** Completar/editar perfil.
- **Flujo alterno:** Campos opcionales omitidos.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN jugador autenticado WHEN guarda perfil con datos mínimos THEN el sistema persiste y muestra ficha pública o privada según reglas.
  - GIVEN jugador autenticado WHEN modifica el nivel de visibilidad (`público` / `promotores` / `privado`) de un campo del perfil THEN el sistema persiste el cambio y ese campo deja de ser visible para audiencias fuera del nivel seleccionado.
  - GIVEN un visitante (público / promotor / propietario) WHEN consulta la ficha de otro jugador THEN el sistema muestra únicamente los campos cuyo nivel de visibilidad coincide con la audiencia.
- **Modelo extendido (visión post-MVP):** el modelo de “perfil tipo ficha” está descrito en detalle en `docs/intake/04-requisitos-funcionales-borrador.md` con 4 bloques (Identidad, Morfológico/Biométrico, Capacidades Condicionales, Destrezas Técnicas) y es deporte-agnóstico. En MVP1 se implementa sólo el subconjunto para fútbol (nombre, edad + verificación RF-007, ubicación, estatura, peso, lateralidad, posición, pie hábil, sección social con texto libre + tags curados, stats derivadas de RF-005); el resto queda en backlog. Ejemplo de llenado en `docs/intake/08-anexos.md`.
- **Configurabilidad por el usuario (MVP1):** cada campo del perfil expone un selector de visibilidad (`público` / `promotores` / `privado`) con defaults sensibles documentados en `intake/04`. El llenado es opcional salvo el núcleo mínimo (nombre, edad, ubicación, disciplina, lateralidad, posición, pie hábil).

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

### RF-005 — Resultados y tabla de posiciones

- **Descripción:** Promotor registra resultados de partidos de un torneo; el sistema calcula y muestra la tabla de posiciones actualizada. Las estadísticas básicas (partidos jugados, goles, victorias) se reflejan en el perfil del jugador (RF-002).
- **Actor:** Promotor (registra resultados); Jugador / Público (consulta tabla y perfil).
- **Precondiciones:** Torneo con equipos inscritos (RF-004); al menos un partido programado o finalizado.
- **Flujo principal:** Promotor selecciona partido → ingresa marcador → sistema actualiza tabla de posiciones y estadísticas de jugadores.
- **Flujo alterno:** Corrección de resultado ya registrado (edición con log de auditoría).
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un torneo con partidos WHEN el promotor registra el marcador de un partido THEN el sistema actualiza la tabla de posiciones y las estadísticas individuales de los jugadores participantes.
  - GIVEN tabla de posiciones actualizada WHEN un jugador consulta su perfil THEN ve reflejados partidos jugados, goles y victorias del torneo.
- **Nota:** Este RF es una versión acotada para MVP1 del ciclo resultados/tablas. La versión expandida (goleadores, tarjetas, tiempo real, comprobantes de pago) está en RF-010 y RF-015 del catálogo completo.

## Catálogo completo de RF (migración desde monolito)

Los siguientes RF representan la migración completa del monolito. **Solo RF-001 a RF-005 y RF-007 están en alcance de MVP1**; el resto es backlog priorizable en fases posteriores.

### RF-006 — Validación y calificación entre jugadores

- **Descripción:** Otros usuarios (jugadores, entrenadores) pueden validar o calificar la calidad de juego de un deportista en su perfil (RF1.5 monolito).
- **Actor:** Jugador / Entrenador.
- **Precondiciones:** Ambos usuarios con cuenta activa; perfil del jugador evaluado existe.
- **Flujo principal:** Acceder al perfil de otro jugador → emitir calificación o validación de habilidades.
- **Flujo alterno:** Usuario no autenticado ve perfil pero no puede calificar; jugador evaluado puede reportar calificación abusiva.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un jugador autenticado WHEN accede al perfil de otro jugador y envía una calificación válida THEN el sistema registra la calificación y la refleja en el perfil evaluado.
  - GIVEN un visitante sin autenticar WHEN intenta calificar THEN el sistema redirige a inicio de sesión.
- **Extensión post-MVP (visión):** la calificación distingue dos fuentes — `amigo` (red personal vía solicitud de amistad) y `participante` (co-participación verificada en torneo/equipo). Detalle en `docs/intake/04-requisitos-funcionales-borrador.md` módulo "Interacción social y gamificación" → RF-borrador-IS-02. Depende de amistad (RF-borrador-IS-01).

### RF-007 — Verificación de edad con documento de identidad

- **Descripción:** El sistema requiere la carga de un documento de identidad para verificar la edad del jugador al crear el perfil (RF1.7 monolito). **En alcance MVP1** — el MVP solo admite mayores de edad, por lo que la verificación es parte del onboarding obligatorio (decisión documentada en `docs/intake/04-requisitos-funcionales-borrador.md`, sección Resoluciones).
- **Actor:** Jugador nuevo.
- **Precondiciones:** Cuenta de jugador en proceso de creación o edición de perfil.
- **Flujo principal:** Jugador sube imagen/PDF del documento → sistema valida formato → estado de verificación asignado.
- **Flujo alterno:** Documento ilegible o formato no aceptado; jugador puede reintentar.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un jugador en registro WHEN sube documento de identidad en formato válido THEN el sistema almacena el documento y marca la verificación como pendiente de revisión.
  - GIVEN un jugador WHEN sube un archivo en formato no soportado THEN el sistema rechaza la carga e indica los formatos aceptados.
  - GIVEN un jugador con verificación pendiente o rechazada WHEN intenta inscribirse a un torneo (RF-004) THEN el sistema bloquea la inscripción y muestra el paso faltante.
- **Privacidad:** el documento de identidad se almacena cifrado y su visibilidad por defecto es `privado` (sólo el propio usuario y administradores del sistema). No se expone a promotores ni público.

### RF-008 — Creación y gestión de equipos

- **Descripción:** Los jugadores pueden crear equipos, nombrarlos y gestionar la pertenencia de otros jugadores, así como consultar información y estadísticas de los miembros (RF2.1, RF2.2, RF2.3 monolito).
- **Actor:** Jugador (capitán/creador del equipo).
- **Precondiciones:** Cuenta de jugador activa.
- **Flujo principal:** Crear equipo con nombre → invitar/agregar jugadores → ver panel con estadísticas de miembros.
- **Flujo alterno:** Jugador invitado rechaza unirse; equipo sin miembros suficientes permanece en estado borrador.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un jugador autenticado WHEN crea un equipo con nombre válido THEN el sistema registra el equipo y asigna al creador como capitán.
  - GIVEN un capitán WHEN agrega o elimina un jugador del equipo THEN el sistema actualiza la plantilla y notifica al jugador afectado.
  - GIVEN un miembro del equipo WHEN accede al panel del equipo THEN el sistema muestra la lista de miembros con sus estadísticas básicas.

### RF-009 — Sorteo de grupos y enfrentamientos del torneo

- **Descripción:** El sistema genera y sortea grupos y enfrentamientos de forma aleatoria según la configuración del promotor, y permite invitar equipos existentes a participar (RF3.10, RF3.11 monolito).
- **Actor:** Promotor.
- **Precondiciones:** Torneo creado con configuración de formato y cupos; equipos inscritos suficientes.
- **Flujo principal:** Promotor solicita sorteo → sistema genera grupos/bracket aleatoriamente → promotor confirma o regenera.
- **Flujo alterno:** Insuficientes equipos inscritos; promotor puede invitar equipos directamente antes de sortear.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un torneo con equipos inscritos suficientes WHEN el promotor solicita el sorteo THEN el sistema genera grupos y enfrentamientos aleatorios según el formato configurado.
  - GIVEN un promotor WHEN invita a un equipo existente al torneo THEN el equipo recibe notificación de invitación y puede aceptar o rechazar.

### RF-010 — Registro de resultados y actualización de tablas

- **Descripción:** El promotor registra resultados de cada partido (goles, tarjetas, ganador/perdedor) y el sistema actualiza automáticamente tablas de posiciones y estadísticas de goleadores; además puede validar comprobantes de pago de inscripción (RF3.12, RF3.13, RF3.14 monolito).
- **Actor:** Promotor.
- **Precondiciones:** Torneo en curso con enfrentamientos generados.
- **Flujo principal:** Seleccionar partido → ingresar resultado (goles, tarjetas) → confirmar → sistema actualiza tabla de posiciones y ranking de goleadores.
- **Flujo alterno:** Promotor corrige resultado ya ingresado; sistema recalcula estadísticas.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un partido programado WHEN el promotor ingresa el resultado con goles y tarjetas THEN el sistema persiste el resultado y actualiza automáticamente la tabla de posiciones y el ranking de goleadores.
  - GIVEN un promotor WHEN valida un comprobante de pago de inscripción THEN el sistema actualiza el estado a "Aprobado", "Rechazado" o "Pendiente" y notifica al equipo inscrito.

### RF-011 — Inscripción individual y armado automático de equipos

- **Descripción:** Jugadores individuales pueden inscribirse a un torneo y, cuando corresponda, el sistema arma equipos de forma automática y aleatoria; los jugadores también pueden seguir torneos para recibir actualizaciones (RF4.3, RF4.4 monolito).
- **Actor:** Jugador individual.
- **Precondiciones:** Torneo abierto que admite inscripción individual; cupos disponibles.
- **Flujo principal:** Jugador selecciona torneo → se inscribe como individual → sistema acumula inscritos → al alcanzar cupo mínimo arma equipos aleatoriamente.
- **Flujo alterno:** Jugador sigue torneo sin inscribirse para recibir actualizaciones; insuficientes individuales impiden armado automático.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un torneo con modalidad individual abierta WHEN se alcanza el cupo mínimo de jugadores individuales THEN el sistema arma equipos de forma aleatoria y notifica a los jugadores asignados.
  - GIVEN un jugador autenticado WHEN sigue un torneo THEN el sistema lo suscribe a actualizaciones de ese torneo.

### RF-012 — Feed social y publicaciones

- **Descripción:** Feed principal donde se muestran publicaciones (logros, avances, estadísticas) de amigos, equipos y torneos seguidos, con posibilidad de comentar y reaccionar con emojis (RF5.1, RF5.5 monolito).
- **Actor:** Jugador / Promotor.
- **Precondiciones:** Usuario autenticado con al menos una conexión (amigo, equipo o torneo seguido).
- **Flujo principal:** Acceder al feed → ver publicaciones ordenadas cronológicamente → comentar o reaccionar.
- **Flujo alterno:** Feed vacío si no sigue a nadie; sistema sugiere conexiones.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un usuario autenticado con conexiones WHEN accede al feed THEN el sistema muestra publicaciones de amigos, equipos y torneos seguidos ordenadas cronológicamente.
  - GIVEN un usuario autenticado WHEN comenta o reacciona con emoji a una publicación THEN el sistema registra la interacción y la muestra a otros usuarios.

### RF-013 — Notificaciones push

- **Descripción:** El sistema envía notificaciones push sobre actualizaciones de logros, noticias de equipos, avances de torneos e invitaciones a torneos y partidos (RF5.2 monolito).
- **Actor:** Sistema → Usuario (jugador / promotor).
- **Precondiciones:** Usuario con cuenta activa y permisos de notificación habilitados en dispositivo.
- **Flujo principal:** Evento relevante ocurre (resultado, invitación, logro) → sistema genera notificación → envío push al dispositivo del usuario.
- **Flujo alterno:** Usuario desactiva notificaciones; sistema respeta preferencia y no envía push.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un usuario con notificaciones habilitadas WHEN ocurre un evento relevante (resultado de partido, invitación, logro de amigo) THEN el sistema envía notificación push al dispositivo del usuario.
  - GIVEN un usuario WHEN desactiva notificaciones push THEN el sistema deja de enviarle notificaciones push pero mantiene el historial accesible en la app.

### RF-014 — Chat y mensajería

- **Descripción:** Funcionalidad de chat/mensajería para comunicación entre jugadores y promotores, incluyendo invitación a amigos a partidos específicos con búsqueda por posición (RF5.3, RF5.4 monolito).
- **Actor:** Jugador / Promotor.
- **Precondiciones:** Ambos usuarios con cuenta activa.
- **Flujo principal:** Seleccionar contacto o equipo → enviar mensaje → receptor recibe en tiempo real.
- **Flujo alterno:** Jugador busca por posición (ej. "busco arquero") para invitar a un partido; destinatario rechaza invitación.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN dos usuarios autenticados WHEN uno envía un mensaje al otro THEN el receptor lo recibe en tiempo real y puede responder.
  - GIVEN un jugador WHEN busca compañeros por posición para un partido THEN el sistema muestra jugadores disponibles que coinciden con la posición buscada y permite enviar invitación.

### RF-015 — Visualización de tablas, resultados y rankings

- **Descripción:** El sistema muestra tablas de posiciones actualizadas, resultados detallados de partidos (goles, anotadores, tarjetas), seguimiento en tiempo real y ranking de goleadores por torneo (RF6.1, RF6.2, RF6.3, RF6.4 monolito).
- **Actor:** Usuario (cualquier rol, incluido visitante).
- **Precondiciones:** Torneo en curso o finalizado con resultados registrados.
- **Flujo principal:** Acceder a torneo → ver tabla de posiciones, resultados por jornada, ranking de goleadores; durante partidos en curso, ver actualizaciones en tiempo real.
- **Flujo alterno:** Torneo sin resultados aún; sistema muestra calendario programado sin datos de resultado.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un torneo con resultados registrados WHEN un usuario accede a la vista del torneo THEN el sistema muestra tabla de posiciones actualizada, resultados detallados y ranking de goleadores.
  - GIVEN un partido en curso WHEN el promotor sube información en tiempo real THEN los usuarios que siguen el partido ven las actualizaciones sin recargar la página.

### RF-016 — Búsqueda y filtros

- **Descripción:** Los usuarios pueden buscar jugadores, equipos y torneos por nombre, y filtrar torneos por nivel de dificultad, categoría de edad, deporte y ciudad (RF6.5, RF6.6 monolito).
- **Actor:** Usuario (cualquier rol).
- **Precondiciones:** Existen registros en el sistema (jugadores, equipos o torneos).
- **Flujo principal:** Ingresar término de búsqueda → sistema retorna resultados relevantes; aplicar filtros opcionales para refinar.
- **Flujo alterno:** Sin resultados; sistema sugiere ajustar criterios de búsqueda.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un usuario WHEN busca por nombre de jugador, equipo o torneo THEN el sistema retorna resultados coincidentes ordenados por relevancia.
  - GIVEN un usuario WHEN aplica filtros de nivel, categoría de edad, deporte o ciudad a la búsqueda de torneos THEN el sistema muestra solo los torneos que cumplen todos los filtros seleccionados.

### RF-017 — Transmisiones en vivo

- **Descripción:** El promotor puede realizar transmisiones en vivo de partidos (tipo Instagram Live); durante la transmisión los usuarios pueden enviar comentarios, reacciones con emojis y pronósticos de marcador (RF7.1, RF7.2, RF7.3 monolito).
- **Actor:** Promotor (emisor) / Jugador y espectadores (receptores).
- **Precondiciones:** Torneo en curso; partido programado; promotor con dispositivo capaz de transmitir.
- **Flujo principal:** Promotor inicia transmisión → usuarios se unen → interactúan con comentarios, emojis y pronósticos → promotor finaliza transmisión.
- **Flujo alterno:** Problemas de conectividad interrumpen la transmisión; sistema intenta reconectar o notifica a espectadores.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un partido en curso WHEN el promotor inicia una transmisión en vivo THEN los usuarios suscritos al torneo pueden unirse y ver el stream en tiempo real.
  - GIVEN una transmisión activa WHEN un espectador envía comentario, emoji o pronóstico de marcador THEN la interacción se muestra en tiempo real a todos los espectadores.

### RF-018 — Soporte y ayuda

- **Descripción:** Chat de soporte para que los usuarios dejen comentarios y reciban respuestas, disponible durante horas de oficina acordadas (RF8.1, RF8.2 monolito; SLA exacto por definir).
- **Actor:** Usuario (cualquier rol) / Equipo de soporte.
- **Precondiciones:** Usuario autenticado.
- **Flujo principal:** Acceder a sección de soporte → enviar mensaje/ticket → equipo de soporte responde dentro del SLA acordado.
- **Flujo alterno:** Mensaje enviado fuera de horario de atención; sistema confirma recepción e indica tiempo estimado de respuesta.
- **Criterios de aceptación (GIVEN/WHEN/THEN):**
  - GIVEN un usuario autenticado WHEN envía un mensaje al chat de soporte THEN el sistema registra el ticket y confirma la recepción al usuario.
  - GIVEN un ticket abierto dentro de horario de atención WHEN el equipo de soporte responde THEN el usuario recibe la respuesta y puede continuar la conversación.

## Backlog (fuera de MVP1 — referencia)

- **RF-006 Validación y calificación entre jugadores:** post-MVP; depende de masa crítica de perfiles.
- ~~**RF-007 Verificación de edad con documento**~~ — **promovido a MVP1** tras resolución del fundador (ver RF-007 arriba y `docs/intake/04-requisitos-funcionales-borrador.md` § Resoluciones). Se mantiene aquí como referencia histórica.
- **RF-008 Creación y gestión de equipos:** candidato MVP1.1; complementa RF-004 (inscripción).
- **RF-009 Sorteo de grupos y enfrentamientos:** candidato MVP2; expande RF-003 con automatización de brackets.
- **RF-010 Registro expandido de resultados (tarjetas, goleadores, comprobantes):** expande RF-005 MVP; candidato MVP2.
- **RF-011 Inscripción individual y armado automático:** candidato MVP2.
- **RF-012 Feed social y publicaciones:** candidato MVP2; en MVP1 se reemplaza por notificaciones simples.
- **RF-013 Notificaciones push:** candidato MVP1.1 (versión simple ya implícita en MVP1).
- **RF-014 Chat y mensajería:** excluido de MVP1.
- **RF-015 Visualización expandida de tablas y rankings:** expande RF-005 MVP con tiempo real y goleadores; candidato MVP2.
- **RF-016 Búsqueda y filtros:** candidato MVP2.
- **RF-017 Transmisiones en vivo:** excluido de MVP1 por alta complejidad.
- **RF-018 Soporte y ayuda:** candidato MVP2.
- **Mapa de recintos / discovery:** candidato MVP2 (de Opción B).
- **Pagos in-app de inscripciones:** post-MVP según informe.
- **Módulo árbitros:** post-MVP.
- **Interacción social y gamificación (módulo en intake):** tres RF borradores bajo consideración del fundador, **post-MVP** por defecto — detalle en `docs/intake/04-requisitos-funcionales-borrador.md`:
  - **RF-borrador-IS-01 Solicitud y gestión de amistad entre usuarios** — base de red personal; habilita nivel de visibilidad `amigos` en el perfil.
  - **RF-borrador-IS-02 Calificación y validación entre pares** — extiende RF-006 con fuentes `amigo` y `participante`.
  - **RF-borrador-IS-03 Experiencia (XP) por participación** — sistema de progresión con niveles calculados por tabla de umbrales.

## Trazabilidad monolito → RF formal

| Monolito (PRO-gestion.documental.md) | RF formal |
|---------------------------------------|-----------|
| RF1.1 | RF-001 |
| RF1.2, RF1.3, RF1.4, RF1.6 | RF-002 |
| RF1.5 | RF-006 |
| RF1.7 | RF-007 |
| RF2.1, RF2.2, RF2.3 | RF-008 |
| RF3.1–RF3.9 | RF-003 |
| RF3.10, RF3.11 | RF-009 |
| RF3.12, RF3.13, RF3.14 | RF-010 |
| RF4.1, RF4.2 | RF-004 |
| RF4.3, RF4.4 | RF-011 |
| RF5.1, RF5.5 | RF-012 |
| RF5.2 | RF-013 |
| RF5.3, RF5.4 | RF-014 |
| RF6.1, RF6.2, RF6.3, RF6.4 | RF-015 |
| RF6.5, RF6.6 | RF-016 |
| RF7.1, RF7.2, RF7.3 | RF-017 |
| RF8.1, RF8.2 | RF-018 |
| (nuevo MVP) | RF-005 |
