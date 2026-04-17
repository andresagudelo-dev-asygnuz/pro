# Wireframe 10 — Tabla de posiciones

- **Flujo:** [Flujo 6](../user-flows.md#flujo-6--carga-de-resultados-y-tabla-de-posiciones) · **HU:** [HU-006](../../tasks/hu/HU-006.md) · **RF:** RF-005.
- **Ruta:** `/tournaments/:id/standings` (puede embeberse como tab de `/tournaments/:id`).
- **Usuario:** cualquiera.

## Layout

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Copa Eje Cafetero 2026 · Tabla de posiciones                             │
│  [ Detalles ] [ Inscritos ] [ Fixture ] [|] Tabla                         │
│                                                                           │
│  Última actualización: 2026-05-17 18:02  (basada en 6 partidos jugados)    │
│                                                                           │
│  ┌───┬──────────────────────┬─── ─── ─── ─── ─── ──── ──── ──── ─┐        │
│  │ # │ Equipo               │ PJ  G   E   P   GF   GC  DG   Pts │        │
│  ├───┼──────────────────────┼─── ─── ─── ─── ─── ──── ──── ──── ─┤        │
│  │ 1 │ Los Tigres FC        │  3  3   0   0    8    2  +6    9  │        │
│  │ 2 │ Academia Norte       │  3  2   0   1    5    3  +2    6  │        │
│  │ 3 │ Azules Manizales     │  3  1   1   1    4    4   0    4  │        │
│  │ 4 │ Deportivo Pereira    │  3  0   1   2    2    5  −3    1  │        │
│  │ … │                      │                                   │        │
│  └───┴──────────────────────┴───────────────────────────────────┘        │
│                                                                           │
│  Leyenda: PJ jugados · G ganados · E empates · P perdidos ·               │
│           GF goles favor · GC goles contra · DG diferencia · Pts puntos   │
│                                                                           │
│  Criterios de desempate (configurados por el promotor):                   │
│  1) Puntos  2) DG  3) GF  4) Partidos ganados                             │
└───────────────────────────────────────────────────────────────────────────┘
```

## Componentes

- `StandingsTable` (tabla semántica `<table>` con columnas fijas + scroll horizontal en mobile).
- `StandingsRow` (con highlight de top 4 si el torneo lo define).
- `LastUpdatedBadge`.
- `TiebreakerLegend` (muestra criterios en orden real configurado en Flujo 4).
- `LegendKey` (mini leyenda para abreviaturas).

## Estados

- **Sin resultados aún** → muestra todos los equipos en 0 con nota "aún no se han cargado resultados".
- **Parcial** → se muestran los partidos jugados; futuros partidos no afectan.
- **Finalizado** → banner "Tabla final" + resalte del campeón (oro) y, si aplica, descensos.
- **Error de datos** (p. ej. evento de auditoría incoherente) → banner rojo con "Contactar al promotor" y pestaña fixture como fallback.

## Notas UX

- Mobile: la tabla se vuelve scroll horizontal con la columna "Equipo" congelada.
- Accesibilidad: `<caption>` descriptivo, `scope="col"` y `scope="row"` en la tabla, la leyenda como `<dl>` para lectores de pantalla.
- La tabla es **derivada** (no se ingresa manualmente): siempre refleja el estado de los partidos cargados. El promotor no la edita directamente.
- Orden estable: si dos filas empatan en todos los criterios configurados, el desempate final es alfabético por nombre de equipo (decisión explícita, no implícita).
