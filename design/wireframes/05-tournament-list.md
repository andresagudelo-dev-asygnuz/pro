# Wireframe 05 — Listado público de torneos

- **Flujo:** [Flujo 4](../user-flows.md#flujo-4--creación-y-publicación-de-torneo-promotor) (consumer side) · **RF:** RF-003.
- **Ruta:** `/tournaments`.
- **Usuario:** cualquiera (autenticado o no). Promotor también accede a `/tournaments/mine` para su gestión.

## Layout

```
┌───────────────────────────────────────────────────────────────────────────┐
│  PRO · torneos amateur   [ Crear cuenta ]  [ Iniciar sesión ]             │
├───────────────────────────────────────────────────────────────────────────┤
│  Torneos abiertos                                                         │
│                                                                           │
│  Filtros: <Ciudad ▾>  <Categoría ▾>  <Estado ▾>  [Limpiar]                │
│  Orden:   <Próximos a empezar ▾>                                          │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │ ⚽ Copa Eje Cafetero 2026 · Manizales · 1ra división amateur     │   │
│  │ 16 equipos · inicia 2026-05-10 · cupos 12/16                      │   │
│  │ Estado: 🟢 abierto a inscripciones                                │   │
│  │                                                     [ Ver detalle ]│   │
│  └───────────────────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │ ⚽ Liga Amateur Pereira 2026 · Pereira · categoría libre          │   │
│  │ 10 equipos · inicia 2026-06-01 · cupos 3/10                       │   │
│  │ Estado: 🟢 abierto a inscripciones                                │   │
│  │                                                     [ Ver detalle ]│   │
│  └───────────────────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │ ⚽ Torneo Relámpago Armenia · Armenia · categoría libre           │   │
│  │ 8 equipos · inicia 2026-05-20 · cupos 0/8 (lista de espera)       │   │
│  │ Estado: 🟠 inscripciones cerradas                                 │   │
│  │                                                     [ Ver detalle ]│   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  [ < ] 1 2 3 … [ > ]                                                      │
└───────────────────────────────────────────────────────────────────────────┘
```

## Componentes

- `FilterBar` (3 selects + CTA limpiar).
- `SortSelect`.
- `TournamentCard` (título, ciudad, formato, inicio, cupos X/Y, estado, CTA).
- `StatusPill` (verde / naranja / gris / rojo).
- `Pagination`.

## Estados

- **Vacío** (no hay torneos con los filtros elegidos) → mensaje + CTA "Limpiar filtros".
- **Carga** (skeletons de 3 cards).
- **Error** (estado de retry con botón "Reintentar").
- **Sin torneos publicados en absoluto** (MVP recién lanzado) → ilustración + CTA "Sé el primero en crear un torneo".

## Notas UX

- Los torneos `borrador` **no aparecen** en el listado público.
- Los torneos `finalizado` aparecen bajo un tab separado "Finalizados" (o al filtrar `Estado = finalizado`).
- Promotor autenticado ve, adicionalmente, un CTA "+ Nuevo torneo" en el header de la página.
- Mobile: filtros se colapsan en un drawer; cards pasan a columna única.
