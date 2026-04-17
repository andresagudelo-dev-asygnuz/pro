# Wireframe 07 — Detalle de torneo

- **Flujo:** [Flujo 4](../user-flows.md#flujo-4--creación-y-publicación-de-torneo-promotor) + [Flujo 5](../user-flows.md#flujo-5--inscripción-de-equipo--jugador-a-torneo) + [Flujo 6](../user-flows.md#flujo-6--carga-de-resultados-y-tabla-de-posiciones) · **RF:** RF-003, RF-004, RF-005.
- **Ruta:** `/tournaments/:id`.
- **Usuario:** cualquiera; acciones dependen del rol y de la relación con el torneo.

## Layout — vista pública (visitante o jugador)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  PRO · torneos amateur                    [ Crear cuenta ] [ Iniciar s. ] │
├───────────────────────────────────────────────────────────────────────────┤
│  ⚽ Copa Eje Cafetero 2026                                                │
│  Manizales · Liga · 16 equipos · 2026-05-10 → 2026-07-30                  │
│  Estado: 🟢 abierto a inscripciones · Cierre 2026-05-05                   │
│                                                                           │
│  [ Tabs ]  [|] Detalles    [ ] Inscritos    [ ] Fixture    [ ] Tabla       │
│                                                                           │
│  Descripción                                                              │
│  Torneo regional abierto a equipos amateur del Eje Cafetero.              │
│  Categoría 1ra división amateur. Reglas completas abajo.                  │
│                                                                           │
│  Reglas                                                                   │
│  ● +18 obligatorio (verificación de edad activa)                          │
│  ● 90 min por partido · tiempo extra sólo en eliminatorias                │
│  ● Desempate: puntos → diferencia de gol → GF → partidos ganados          │
│                                                                           │
│  Organiza                                                                 │
│  Promotor: @eje-sports                                                    │
│                                                                           │
│                                        [ Inscribir mi equipo / jugador ]  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Tab "Inscritos"

```
  Equipos inscritos  (12 / 16)
  ┌───────────────────────────────────────────────────────────┐
  │ 🏳️ Los Tigres FC   · capitán @juan ·  11 jugadores · ✅ OK │
  │ 🏳️ Academia Norte  · capitán @luis ·  10 jugadores · ✅ OK │
  │ 🏳️ Azules Manizales· capitán @pedro·  9 jugadores  · ⚠️ 1 sin verificar │
  │ … (9 más)                                                 │
  └───────────────────────────────────────────────────────────┘
```

### Tab "Fixture"

```
  Jornada 1 · 2026-05-10
   Los Tigres FC    vs   Academia Norte     [ver]
   Azules Manizales vs   Deportivo Pereira  [ver]
   …
  Jornada 2 · 2026-05-17
   …
```

### Tab "Tabla"

Ver [Wireframe 10 — Tabla de posiciones](./10-standings-table.md).

## Variantes por rol

- **Visitante sin sesión:** CTA principal "Iniciar sesión para inscribirte"; no ve los miembros de cada equipo (sólo el nombre de equipo y capitán).
- **Jugador autenticado no inscrito:** CTA "Inscribir mi equipo / jugador" (lleva a Flujo 5).
- **Jugador capitán ya inscrito:** CTA "Gestionar mi inscripción" (ver/modificar plantel, darse de baja).
- **Promotor dueño del torneo:** banda superior adicional con CTAs `[ Editar torneo ]  [ Cargar resultado ]  [ Ver solicitudes ]`.
- **Promotor NO dueño:** misma vista que visitante autenticado.

## Componentes

- `TournamentHeader` (título, meta, status pill, CTA primario).
- `TabGroup` (4 tabs).
- `TeamList` (con indicadores de completitud por equipo).
- `FixtureList` (agrupada por jornada).
- `StandingsTable` (componente compartido con wireframe 10).
- `OwnerActionBar` (sólo promotor dueño).

## Estados

- **Estado `borrador`** → sólo visible para el promotor dueño; banner "Este torneo no está publicado".
- **Estado `abierto`** → inscripciones habilitadas; CTA inscribir visible.
- **Estado `cerrado a inscripciones`** → CTA deshabilitado con mensaje "Cierre el YYYY-MM-DD".
- **Estado `en curso`** → se muestra progreso del fixture + tabla.
- **Estado `finalizado`** → banner con campeón; tabla final congelada.

## Notas UX

- Tabs y contenido son deep-linkeables (`/tournaments/:id?tab=fixture`).
- Mobile: tabs se convierten en un sticky horizontal scrollable; action bar colapsada en un FAB menu.
- Accesibilidad: semántica `tablist` / `tab` / `tabpanel` con navegación por teclado.
