# UAT Checklist — PRO MVP1

Este checklist contiene los criterios de aceptación (GWT) que el negocio debe validar para cerrar el MVP1.

## HU-001: Registro con roles
- [ ] **CP-001**: Registro de jugador nuevo (email/password). Verifica que `is_player=true`.
- [ ] **CP-002**: Registro de promotor nuevo. Verifica que `is_promoter=true`.
- [ ] **CP-003**: Intento de acceso sin cuenta. Redirección a login funcional.

## HU-002: Verificación de edad
- [ ] **CP-004**: Subida de documento de identidad (sandbox o real).
- [ ] **CP-005**: Acceso bloqueado a torneos si no está verificado.
- [ ] **CP-006**: Desbloqueo tras aprobación manual (vía DB o Admin UI).

## HU-003: Perfil 4 bloques
- [ ] **CP-007**: Edición de Bloque 1 (Info Básica).
- [ ] **CP-008**: Edición de Bloque 4 (Stats Fútbol).
- [ ] **CP-009**: Cambio de visibilidad de campo a "Privado" y validación desde otra sesión.

## HU-004: Creación de Torneos
- [ ] **CP-010**: Promotor crea torneo con nombre, formato y cupos.
- [ ] **CP-011**: Torneo aparece en listado público si está en `abierto_inscripciones`.
- [ ] **CP-012**: Promotor edita info del torneo propio.

## HU-005: Inscripciones
- [ ] **CP-013**: Jugador se inscribe a torneo abierto. Verifica descuento de cupo.
- [ ] **CP-014**: Intento de inscripción en torneo lleno. Registro en `lista_espera`.
- [ ] **CP-015**: Cancelación de inscripción por el jugador (liberación de cupo).

## HU-006: Resultados y Standings
- [ ] **CP-016**: Promotor registra marcador final de un partido.
- [ ] **CP-017**: Tabla de posiciones (Standings) se actualiza tras el resultado.
- [ ] **CP-018**: Visualización pública de la tabla desde la ficha del torneo.
