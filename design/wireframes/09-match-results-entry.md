# Wireframe 09 — Carga de resultados

- **Flujo:** [Flujo 6](../user-flows.md#flujo-6--carga-de-resultados-y-tabla-de-posiciones) · **HU:** [HU-006](../../tasks/hu/HU-006.md) · **RF:** RF-005.
- **Ruta:** `/tournaments/:id/matches` (listado) · `/tournaments/:id/matches/:matchId/result` (carga puntual).
- **Usuario:** autenticado, rol `promotor`, dueño del torneo.

## Layout — listado de partidos

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Copa Eje Cafetero 2026 — Gestión de partidos                             │
│  [ Detalles ]  [ Inscritos ]  [|] Partidos  [ Tabla ]                     │
│                                                                           │
│  Filtro: <Todas las jornadas ▾>   <Estado: pendientes ▾>                  │
│                                                                           │
│  Jornada 1 · 2026-05-10                                                   │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │ Los Tigres FC   —   Academia Norte         🟠 pendiente           │   │
│  │ 2026-05-10 · 15:00 · Cancha Central        [ Cargar resultado ]   │   │
│  ├───────────────────────────────────────────────────────────────────┤   │
│  │ Azules Manizales —  Deportivo Pereira      ✅ 2 — 1               │   │
│  │ 2026-05-10 · 17:00 · Cancha Central        [ Editar resultado ]   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Jornada 2 · 2026-05-17                                                   │
│  …                                                                        │
└───────────────────────────────────────────────────────────────────────────┘
```

## Layout — modal/pagina de carga de resultado

```
  Cargar resultado · Jornada 1
  Los Tigres FC        vs        Academia Norte
  Cancha Central · 2026-05-10 · 15:00

  Marcador final
  [  2  ]  —  [  1  ]

  Goleadores (opcional MVP1)
   Los Tigres FC:
     [ @juan × 1 ] [ @diego × 1 ]  [ + agregar ]
   Academia Norte:
     [ @luis × 1 ]  [ + agregar ]

  Observaciones (opcional)
  { Texto libre corto…                                  }

  ◦ Al confirmar, la tabla se recalcula y los stats de los jugadores
    listados se actualizan (respetando visibilidad).
  ◦ Tenés 24 h para editar este resultado; después se bloquea.

                              [ Cancelar ]    [ Confirmar resultado ]
```

### Modo edición (dentro de ventana)

Mismo layout con banner azul: `Editando resultado de X · queda N h 42 min`. Al confirmar, se registra evento de auditoría y se recalcula la tabla.

### Modo edición fuera de ventana

```
  Este resultado ya no es editable (ventana de 24 h cerrada).
  Si hay un error, podés solicitar revisión al soporte.
  [ Solicitar revisión ]  (post-MVP)
```

## Componentes

- `MatchList` (agrupada por jornada, con filtros).
- `MatchRow` (equipos + estado + CTA contextual).
- `ScoreInput` (dos inputs numéricos con validación: enteros ≥ 0).
- `ScorerPicker` (multi-select sobre roster del equipo, con contador `× N`).
- `EditWindowBanner`.
- `AuditEventRecorder` (implícito; no UI, pero cada cambio genera evento).

## Estados

- **Pendiente** → CTA "Cargar resultado".
- **Cargado** dentro de ventana → CTA "Editar resultado".
- **Cargado** fuera de ventana → sólo lectura + CTA "Solicitar revisión" (post-MVP).
- **Error en la carga** → el formulario mantiene los valores, muestra error inline, no corrompe la tabla.
- **Idempotencia** → reintentos del cliente no duplican eventos ni suman goles al perfil.

## Notas UX

- El pick de goleadores se limita al roster inscrito de cada equipo (no permite invitar).
- El recálculo de la tabla ocurre en el backend; la UI refresca automáticamente la pestaña "Tabla" del torneo.
- Visibilidad: si un jugador tiene sus stats de goleo en `privado`, se siguen contabilizando pero no se muestran en su perfil público.
- Accesibilidad: inputs de score con `inputmode="numeric"`, labels claros "Goles local", "Goles visitante".
