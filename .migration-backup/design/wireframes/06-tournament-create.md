# Wireframe 06 — Creación de torneo (asistente multi-step)

- **Flujo:** [Flujo 4](../user-flows.md#flujo-4--creación-y-publicación-de-torneo-promotor) · **HU:** [HU-004](../../tasks/hu/HU-004.md) · **RF:** RF-003.
- **Ruta:** `/tournaments/new`.
- **Usuario:** autenticado con rol `promotor`.

## Layout

```
┌───────────────────────────────────────────────────────────────────────────┐
│  PRO · torneos amateur                Panel promotor · Juan ▾ | Salir     │
├───────────────────────────────────────────────────────────────────────────┤
│  Crear nuevo torneo                       [Guardar borrador] [ Cancelar ] │
│  ● Paso 1 Básicos  ○ Paso 2 Reglas  ○ Paso 3 Revisar                      │
│  ─────────────────────────────────────────────────                        │
│                                                                           │
│  Nombre del torneo                                                        │
│  {Copa Eje Cafetero 2026                                   }              │
│                                                                           │
│  Formato                  Cupos                                           │
│  <Liga (todos vs todos) ▾>  <16 equipos ▾>                                │
│                                                                           │
│  Ciudad / sede            País                                            │
│  {Manizales, Caldas     }  <Colombia ▾>                                   │
│                                                                           │
│  Fecha inicio             Fecha fin (opcional)                            │
│  {2026-05-10}             {2026-07-30}                                    │
│                                                                           │
│  Cierre de inscripciones  Categoría                                       │
│  {2026-05-05}             <1ra división amateur ▾>                        │
│                                                                           │
│  Descripción corta (visible en la ficha pública)                          │
│  {Torneo regional abierto a equipos amateur del Eje…       }              │
│                                                                           │
│                                                   [ Siguiente → Paso 2 ]  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Paso 2 · Reglas

```
  ( ● ) Obligatorio +18 (RF-007: todos los jugadores verificados)
  ( ● ) Sólo equipos con capitán registrado

  Duración del partido     Tiempo extra / penales
  <90 min ▾>               <Sólo en eliminatorias ▾>

  Criterios de desempate (ordenables)
  1. Puntos
  2. Diferencia de gol
  3. Goles a favor
  4. Partidos ganados
  [ + Agregar criterio ]

  Reglas adicionales (texto libre)
  {Las listadas aquí complementan la ficha pública.            }

                                 [ ← Paso 1 ]   [ Siguiente → Paso 3 ]
```

### Paso 3 · Revisar y publicar

```
  Resumen
  ─ Copa Eje Cafetero 2026 · Liga · 16 equipos
  ─ Manizales, Colombia · inicia 2026-05-10 · cierra inscripción 2026-05-05
  ─ Reglas: +18 obligatorio, 90 min, desempate puntos/dif. gol/gf/ganados

  [ ← Paso 2 ]   [ Guardar borrador ]   [ ✅ Publicar torneo ]
```

## Componentes

- `StepperHeader` (pasos con estado `actual / completo / pendiente`).
- `FormField`, `Select`, `DatePicker`.
- `SortableList` (criterios de desempate).
- `ToggleSwitch` (reglas binarias).
- `FormFooter` (botones de navegación + acciones).
- `ConfirmPublishDialog` (modal con resumen + confirmación).

## Estados

- **Borrador** — puede guardarse en cualquier paso. Persistencia en `tournaments/mine` con badge "borrador".
- **Validación por paso** — no se deja avanzar con campos obligatorios vacíos o fechas inconsistentes (inicio antes de cierre de inscripciones, etc.).
- **Publicado** — redirige a `/tournaments/:id` (detalle) con toast "Torneo publicado. Ya aparece en el listado público."
- **Edición post-inscripciones** — cambios que afecten a inscritos (reducir cupos, cambiar fechas) requieren confirmación y dispara notificación a los equipos.

## Notas UX

- La regla "+18 obligatorio" queda **activa por defecto y no editable** en MVP1 (alineado con el alcance). Un tooltip explica que se flexibilizará post-MVP.
- Autosave al cambiar de paso evita perder datos.
- Mobile: pasos se colapsan en un sticky top; formularios en columna única.
