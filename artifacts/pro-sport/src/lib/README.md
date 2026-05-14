# Data Access Layer (DAL)

Este directorio es la **única capa autorizada** para comunicarse con Supabase (o cualquier backend de datos futuro).

## Contrato

Toda función en `src/lib/{module}/api.ts` debe cumplir estas reglas:

### 1. Recibe el cliente como parámetro
```typescript
export async function getMatches(
  supabase: SupabaseClient,
  filters: MatchFilters
): Promise<{ data: Match[] | null; error: string | null }>
```
El cliente nunca se instancia dentro de la función. Se pasa desde el hook o contexto que lo invoca.

### 2. Retorna siempre `{ data, error }`
- `data`: el resultado tipado, o `null` si hubo error
- `error`: string legible en español para mostrar al usuario, o `null` si todo fue bien
- **Nunca lanza excepciones** — todos los errores se capturan y mapean con `mapDbError`

### 3. Usa `mapDbError` para normalizar errores
```typescript
import { mapDbError } from '@/lib/errors/map-db-error'
// ...
} catch (err) {
  return { data: null, error: mapDbError(err, 'context_name') }
}
```

### 4. Los componentes y hooks NUNCA importan Supabase directamente
```typescript
// ❌ PROHIBIDO en componentes o hooks
import { createBrowserClient } from '@supabase/ssr'

// ✅ CORRECTO — solo a través del cliente instanciado en src/lib/supabase/client.ts
import { createClient } from '@/lib/supabase'
const supabase = createClient()
```

## Estructura de módulos

```
src/lib/
├── supabase/
│   ├── client.ts      ← única instancia del cliente Supabase (singleton lazy)
│   └── index.ts       ← re-exporta createClient como punto de entrada
├── errors/
│   └── map-db-error.ts ← normaliza errores de Supabase a strings en español
├── types/
│   └── db.ts          ← tipos TypeScript de todas las tablas
├── canchas/           ← módulo canchas (referencia canónica del patrón)
│   ├── api.ts
│   ├── admins-api.ts
│   ├── clients-api.ts
│   └── stats-api.ts
├── matches/
│   └── conflicts.ts   ← lógica de conflictos; api.ts pendiente (Phase 1)
├── tournaments/
│   └── api.ts
├── chat/
│   └── api.ts
├── friends/
│   └── api.ts
├── notifications/
│   └── api.ts
├── teams/
│   └── api.ts
├── analytics.ts       ← helpers de analítica
├── format.ts          ← helpers de formateo
└── utils.ts           ← utilidades compartidas
```

**Módulos pendientes de crear en Phase 1**: `feed/api.ts`, `profiles/api.ts`

## Portabilidad (por qué existe este patrón)

Si en el futuro se migra de Supabase a otro motor (PostgreSQL directo, Prisma, PlanetScale, etc.):
1. Solo cambian los **cuerpos** de las funciones en `src/lib/`
2. Las firmas TypeScript se mantienen idénticas
3. Los hooks, componentes y páginas **no se tocan**

Ningún hook ni componente debe saber si el dato viene de Supabase, un REST API, o un cache local.

## Estado actual de la cobertura del contrato

> Auditado en Phase 0. Ver tasks de Phase 1 para la normalización pendiente.

| Archivo | Recibe supabase param | Retorna {data,error} | Usa mapDbError |
|---------|-----------------------|----------------------|----------------|
| `canchas/api.ts` | — | — | — |
| `friends/api.ts` | — | — | — |
| `teams/api.ts` | ❌ instancia `createClient()` internamente | — | — |

La Phase 1 normaliza todos los módulos al contrato completo.
