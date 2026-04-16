# apps/web — PRO

Aplicación web de **PRO**. Stack:

- [Next.js 16](https://nextjs.org) (App Router, Turbopack, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) (Auth + Postgres + Storage) vía [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs)

> Estado: **scaffolding inicial** (Gate 3 pendiente). No hay features de negocio implementadas todavía.

## Setup

```bash
pnpm install
cp .env.example .env.local
# completar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Script        | Descripción                             |
| ------------- | --------------------------------------- |
| `pnpm dev`    | Next.js en modo desarrollo (Turbopack). |
| `pnpm build`  | Build de producción.                    |
| `pnpm start`  | Sirve el build.                         |
| `pnpm lint`   | ESLint.                                 |

## Estructura relevante

```
app/                 # App Router (rutas, layouts, pages)
components/ui/       # Componentes shadcn/ui
lib/
  supabase/
    client.ts        # Cliente para Client Components
    server.ts        # Cliente para RSC / Route Handlers / Server Actions
    middleware.ts    # Refresh de sesión (llamado desde middleware.ts)
middleware.ts        # Entry point del middleware Next
supabase/
  migrations/        # Migraciones SQL gestionadas con Supabase CLI
```

## Uso de Supabase

```tsx
// Server Component
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <pre>{JSON.stringify(user, null, 2)}</pre>;
}
```

```tsx
// Client Component
"use client";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
```

Ver la [guía oficial de Supabase + Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) para auth flows completos.
