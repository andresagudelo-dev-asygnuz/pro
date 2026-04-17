# Wireframe 08 — Inscripción de equipo / jugador a torneo

- **Flujo:** [Flujo 5](../user-flows.md#flujo-5--inscripción-de-equipo--jugador-a-torneo) · **HU:** [HU-005](../../tasks/hu/HU-005.md) · **RF:** RF-004. **Dependencias:** HU-002, HU-003, HU-004.
- **Ruta:** `/tournaments/:id/register`.
- **Usuario:** autenticado; capitán de equipo o jugador individual.

## Layout — modo equipo

```
┌───────────────────────────────────────────────────────────────────────────┐
│  PRO · torneos amateur                 Hola, Juan ▾ | Salir                │
├───────────────────────────────────────────────────────────────────────────┤
│  Inscribir equipo a · Copa Eje Cafetero 2026                              │
│  Cupos: 12 / 16 · cierre 2026-05-05                                        │
│                                                                           │
│  Paso 1 · Seleccionar equipo                                              │
│  <Los Tigres FC ▾>   [ + Crear equipo ]                                   │
│                                                                           │
│  Paso 2 · Plantel propuesto                                               │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │ ✅ @juan   · Juan P.   · MC · +18 verificado · perfil OK          │   │
│  │ ✅ @luis   · Luis G.   · DL · +18 verificado · perfil OK          │   │
│  │ ⚠️ @pedro  · Pedro R.  · DEF· +18 verificado · perfil incompleto  │   │
│  │   → falta posición preferida   [ avisar a Pedro ] [ quitar ]      │   │
│  │ ❌ @ana    · Ana S.    · POR · verificación pendiente             │   │
│  │   → Ana aún no completó RF-007 [ avisar a Ana ]  [ quitar ]       │   │
│  │ … (7 más)                                                          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│  [ + Agregar jugador ]                                                    │
│                                                                           │
│  Paso 3 · Confirmar                                                       │
│  ── Resumen: 11 jugadores · 9 OK · 2 bloqueos                             │
│  ── No podés inscribirte hasta resolver los 2 bloqueos.                   │
│                                                                           │
│                              [ ← Volver al torneo ]   [ Confirmar ]       │
└───────────────────────────────────────────────────────────────────────────┘
```

### Modo individual (cuando el torneo lo permite)

```
  Paso 1 · Confirmar datos de participación
  Jugador: Juan Pérez (vos) · MC · pie hábil derecho
  Verificación +18: ✅ aprobada
  Perfil: ✅ completo

  Paso 2 · Confirmar
  [ Confirmar inscripción ]
```

## Componentes

- `TeamSelector` (dropdown + CTA crear equipo).
- `RosterTable` (fila por miembro con estado `✅ / ⚠️ / ❌` + motivo + acciones `avisar` / `quitar`).
- `BlockerSummary` (caja con # de bloqueos totales + CTA "avisar a todos").
- `PrimaryButton` con estado deshabilitado mientras haya bloqueos.
- `NotifyMemberAction` (envía recordatorio al jugador para que complete RF-002 o RF-007).

## Estados

- **Todos OK** → botón `Confirmar` habilitado. Al confirmar → se descuenta cupo y se navega a `/tournaments/:id` con toast de éxito.
- **Bloqueos** → botón `Confirmar` deshabilitado; mensaje claro de qué falta por miembro.
- **Cupos agotados** → banner rojo "Sin cupos disponibles" con opción "Anotarme en lista de espera" si el torneo la habilita.
- **Inscripción duplicada** (mismo equipo ya inscrito) → estado bloqueado desde el paso 1.
- **Torneo cerrado a inscripciones** → usuario nunca debería llegar aquí; si llega (link directo), 400 + redirección a detalle.

## Notas UX

- La vista muestra explícitamente **por qué** cada jugador bloquea (perfil incompleto vs verificación pendiente), no sólo que bloquea.
- Acción "avisar a X" manda una notificación in-app y email (si está disponible) con enlace directo a la página donde completar el bloqueo.
- Mobile: RosterTable pasa a stacking vertical; cada fila se vuelve una tarjeta.
- Accesibilidad: cada estado con icono **también** tiene texto visible (no sólo color).
