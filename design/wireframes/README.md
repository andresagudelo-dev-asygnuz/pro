# Wireframes base — PRO MVP1

Wireframes de **baja fidelidad** por pantalla clave del MVP1, mapeados a los [flujos de usuario](../user-flows.md). Sirven como guía para G3 (arquitectura) y G4 (desarrollo); no son pantallas de alta fidelidad ni diseño visual final (esa capa se produce con `shadcn/ui` durante G4).

## Convenciones

- Cada wireframe describe layout con **ASCII art** + secciones "Componentes", "Estados" y "Notas UX".
- `[botón]` denota CTA primario; `{campo}` input; `<dropdown>` select; `( )` checkbox / radio; `[|]` tab activa; `~~~` separator.
- Cada wireframe linkea su **flujo**, **HU** y **RF** de origen.
- Cada componente reutilizable referenciado en "Componentes" es candidato a entrar en el **catálogo de componentes MVP1** (se consolida al cerrar todos los wireframes).

## Índice

1. [`01-register.md`](./01-register.md) — Registro con rol (jugador/promotor) · HU-001 / RF-001
2. [`02-age-verification.md`](./02-age-verification.md) — Verificación de edad · HU-002 / RF-007
3. [`03-profile-edit.md`](./03-profile-edit.md) — Edición del perfil tipo ficha (4 bloques + visibilidad) · HU-003 / RF-002
4. [`04-profile-public-view.md`](./04-profile-public-view.md) — Perfil público (vista de otros) · HU-003 / RF-002
5. [`05-tournament-list.md`](./05-tournament-list.md) — Listado público de torneos · RF-003 (consumer)
6. [`06-tournament-create.md`](./06-tournament-create.md) — Creación de torneo (asistente) · HU-004 / RF-003
7. [`07-tournament-detail.md`](./07-tournament-detail.md) — Detalle de torneo · RF-003 / RF-004
8. [`08-tournament-registration.md`](./08-tournament-registration.md) — Inscripción de equipo / jugador · HU-005 / RF-004
9. [`09-match-results-entry.md`](./09-match-results-entry.md) — Carga de resultados · HU-006 / RF-005
10. [`10-standings-table.md`](./10-standings-table.md) — Tabla de posiciones · HU-006 / RF-005
