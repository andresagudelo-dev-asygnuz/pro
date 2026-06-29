# Technical Design: mejoras-core-plataforma

> Documento técnico que un desarrollador solo (con asistencia AI) puede seguir end-to-end. Todo lo necesario para implementar Fases 1-5 está aquí: contratos exactos, SQL ejecutable, algoritmos completos, árbol de componentes y orden de tareas.

---

## Architecture Overview

La plataforma mantiene la arquitectura Vite + React + Wouter + Supabase + TanStack Query + shadcn/ui. Este cambio **no introduce capas nuevas** — consolida el patrón ya existente en `src/lib/canchas/api.ts` y `src/lib/tournaments/api.ts` y lo aplica al resto.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              UI Layer                                    │
│                                                                          │
│  src/pages/*.tsx        ──►  orquestador delgado (≤ 400 LOC)            │
│      │                                                                   │
│      ├──► src/components/{module}/*.tsx   ──► presentacional, sin DB    │
│      │                                                                   │
│      └──► src/hooks/use{Feature}Data.ts   ──► TanStack Query             │
│                  │                          (useQuery / useInfiniteQuery)│
│                  ▼                                                       │
└──────────────────┼───────────────────────────────────────────────────────┘
                   │
┌──────────────────┼───────────────────────────────────────────────────────┐
│                  ▼          Data Layer (src/lib/{module}/api.ts)         │
│                                                                          │
│  funciones tipadas → SupabaseClient → mapDbError → { data, error }      │
│                                                                          │
└──────────────────┼───────────────────────────────────────────────────────┘
                   │
┌──────────────────┼───────────────────────────────────────────────────────┐
│                  ▼              Supabase (Postgres + RLS + Realtime)     │
│                                                                          │
│  profiles · profile_morpho · profile_conditional · profile_technical     │
│  tournaments · tournament_registrations · tournament_matches             │
│  canchas · cancha_bookings · recurring_bookings · recurring_exceptions   │
│  feed_posts · chat_messages · notifications                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Reglas inviolables**:
- Páginas NO importan `@supabase/supabase-js` ni llaman `createClient()` a nivel módulo.
- Hooks (`use{Feature}Data`) son los únicos consumidores de funciones `src/lib/{module}/api.ts`.
- Componentes presentacionales reciben datos por props; no tocan Supabase ni TanStack Query.
- Toda función en `src/lib/{module}/api.ts` retorna `{ data: T | null, error: string | null }` con error normalizado por `mapDbError`.

---

## Design Principles

1. **Consolidar, no rediseñar**. El patrón `src/lib/{module}/api.ts` ya existe y funciona; toda nueva funcionalidad lo respeta. Cero capas nuevas, cero frameworks nuevos.
2. **Extracción incremental, no rewrite**. Para refactorizar las 5 páginas dios, se extraen sub-componentes y hooks dejando el archivo original como orquestador. Cada extracción es un commit autocontenido y reversible.
3. **Server state = TanStack Query; Global state = Context solo para auth/notifs**. Cero stores externos (Zustand/Redux). Toda lectura paginable usa `useInfiniteQuery`.
4. **Seguridad defendida en RLS, UX filtrada en cliente**. La visibilidad por perfil y la propiedad de canchas se enforcean en políticas RLS de Supabase; el cliente filtra solo para UX, nunca como única barrera.
5. **Mobile-first 375px obligatorio**. Cada componente nuevo se valida primero en 375px de ancho antes de tablet/desktop.

---

## Phase 1 — Foundation & Architecture

### 1.1 New API Modules

#### 1.1.1 `src/lib/feed/api.ts` (NUEVO)

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { Profile } from "@/lib/types/db";

type ApiResult<T> = { data: T | null; error: string | null };
type PageResult<T> = ApiResult<T> & { nextCursor: string | null };

export type FeedPost = {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  kind: "post" | "match_recap" | "tournament_announcement";
  created_at: string;
  // joined
  author?: Pick<Profile, "id" | "full_name" | "avatar_url" | "username"> | null;
};

export async function getFeedPosts(
  supabase: SupabaseClient,
  options: { cursor?: string; limit?: number } = {},
): Promise<PageResult<FeedPost[]>> {
  const limit = options.limit ?? 20;
  let query = supabase
    .from("feed_posts")
    .select("id, author_id, content, image_url, kind, created_at, author:profiles!feed_posts_author_id_fkey(id, full_name, avatar_url, username)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options.cursor) query = query.lt("created_at", options.cursor);

  const { data, error } = await query;
  if (error) return { data: null, error: mapDbError(error, "feed_list"), nextCursor: null };
  const rows = (data ?? []) as FeedPost[];
  const nextCursor = rows.length === limit ? rows[rows.length - 1].created_at : null;
  return { data: rows, error: null, nextCursor };
}

export async function createFeedPost(
  supabase: SupabaseClient,
  input: { content: string; image_url?: string | null; kind?: FeedPost["kind"] },
  userId: string,
): Promise<ApiResult<FeedPost>> {
  const { data, error } = await supabase
    .from("feed_posts")
    .insert({
      author_id: userId,
      content: input.content,
      image_url: input.image_url ?? null,
      kind: input.kind ?? "post",
    })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "feed_create") };
  return { data: data as FeedPost, error: null };
}

export async function deleteFeedPost(
  supabase: SupabaseClient,
  postId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase.from("feed_posts").delete().eq("id", postId);
  if (error) return { data: null, error: mapDbError(error, "feed_delete") };
  return { data: null, error: null };
}
```

#### 1.1.2 `src/lib/matches/api.ts` (NUEVO — extiende `src/lib/matches/conflicts.ts`)

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { Match, MatchParticipant, SkillLevel, Profile } from "@/lib/types/db";

type ApiResult<T> = { data: T | null; error: string | null };
type PageResult<T> = ApiResult<T> & { nextCursor: string | null };

export type MatchFilters = {
  city?: string;
  skillLevel?: SkillLevel;
  sportId?: string;
  cursor?: string; // ISO timestamp of starts_at
  limit?: number;
};

export async function getMatchesByFilters(
  supabase: SupabaseClient,
  filters: MatchFilters,
): Promise<PageResult<Match[]>> {
  const limit = filters.limit ?? 20;
  let q = supabase
    .from("matches")
    .select("*")
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (filters.city) q = q.eq("city", filters.city);
  if (filters.skillLevel) q = q.eq("skill_level", filters.skillLevel);
  if (filters.sportId) q = q.eq("sport_id", filters.sportId);
  if (filters.cursor) q = q.gt("starts_at", filters.cursor);

  const { data, error } = await q;
  if (error) return { data: null, error: mapDbError(error, "matches_list"), nextCursor: null };
  const rows = (data ?? []) as Match[];
  const nextCursor = rows.length === limit ? rows[rows.length - 1].starts_at : null;
  return { data: rows, error: null, nextCursor };
}

export async function getMyMatches(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<Match[]>> {
  const { data, error } = await supabase
    .from("match_participants")
    .select("match:matches(*)")
    .eq("user_id", userId);
  if (error) return { data: null, error: mapDbError(error, "my_matches") };
  const matches = (data ?? []).map((r: { match: Match }) => r.match).filter(Boolean);
  return { data: matches, error: null };
}

export type MatchInput = {
  sport_id: string;
  starts_at: string;       // ISO
  city: string;
  venue: string | null;
  cancha_booking_id: string | null;
  skill_level: SkillLevel;
  max_players: number;
  notes: string | null;
};

export async function createMatch(
  supabase: SupabaseClient,
  input: MatchInput,
  userId: string,
): Promise<ApiResult<Match>> {
  const { data, error } = await supabase
    .from("matches")
    .insert({ ...input, organizer_id: userId, status: "open" })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "match_create") };
  return { data: data as Match, error: null };
}

export async function updateMatch(
  supabase: SupabaseClient,
  id: string,
  input: Partial<MatchInput>,
): Promise<ApiResult<Match>> {
  const { data, error } = await supabase
    .from("matches").update(input).eq("id", id).select().single();
  if (error) return { data: null, error: mapDbError(error, "match_update") };
  return { data: data as Match, error: null };
}

export async function cancelMatch(
  supabase: SupabaseClient, id: string,
): Promise<ApiResult<Match>> {
  const { data, error } = await supabase
    .from("matches").update({ status: "cancelled" }).eq("id", id).select().single();
  if (error) return { data: null, error: mapDbError(error, "match_cancel") };
  return { data: data as Match, error: null };
}

export async function getMatchById(
  supabase: SupabaseClient, id: string,
): Promise<ApiResult<Match>> {
  const { data, error } = await supabase
    .from("matches").select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error: mapDbError(error, "match_get") };
  return { data: data as Match | null, error: null };
}

export async function getMatchParticipants(
  supabase: SupabaseClient, matchId: string,
): Promise<ApiResult<MatchParticipant[]>> {
  const { data, error } = await supabase
    .from("match_participants")
    .select("*, profile:profiles(*)")
    .eq("match_id", matchId)
    .order("joined_at");
  if (error) return { data: null, error: mapDbError(error, "participants_list") };
  return { data: (data ?? []) as MatchParticipant[], error: null };
}
```

#### 1.1.3 `src/lib/chat/api.ts` (EXTENDER)

El archivo existe pero requiere paginación cursor-based y cleanup explícito de canales:

```typescript
// agregar:
export async function listConversations(
  supabase: SupabaseClient,
  userId: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<{ data: ConversationRow[] | null; error: string | null; nextCursor: string | null }> {
  const limit = options.limit ?? 20;
  let q = supabase
    .from("conversations")
    .select("*, last_message:messages(content, created_at)")
    .contains("participants", [userId])
    .order("last_message_at", { ascending: false })
    .limit(limit);
  if (options.cursor) q = q.lt("last_message_at", options.cursor);
  const { data, error } = await q;
  if (error) return { data: null, error: mapDbError(error, "chat_list"), nextCursor: null };
  const rows = (data ?? []) as ConversationRow[];
  const nextCursor = rows.length === limit ? rows[rows.length - 1].last_message_at : null;
  return { data: rows, error: null, nextCursor };
}

export async function listMessages(
  supabase: SupabaseClient,
  conversationId: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<{ data: MessageRow[] | null; error: string | null; nextCursor: string | null }> {
  const limit = options.limit ?? 50;
  let q = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options.cursor) q = q.lt("created_at", options.cursor);
  const { data, error } = await q;
  if (error) return { data: null, error: mapDbError(error, "messages_list"), nextCursor: null };
  const rows = (data ?? []) as MessageRow[];
  const nextCursor = rows.length === limit ? rows[rows.length - 1].created_at : null;
  return { data: rows.reverse(), error: null, nextCursor }; // reverse → cronológico ascendente
}

export function subscribeToConversation(
  supabase: SupabaseClient,
  conversationId: string,
  onMessage: (msg: MessageRow) => void,
): () => void {
  const channel = supabase
    .channel(`messages:conversation_id=${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new as MessageRow),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
```

#### 1.1.4 `src/lib/notifications/api.ts` (VERIFICAR/EXTENDER)

El archivo existe — verificar que toda función retorne `{ data, error }` y exponga `subscribeToNotifications(supabase, userId, onIncoming): () => void` con cleanup.

---

### 1.2 Hook Extraction Pattern

Cada página dios sigue esta receta:

```
PageDios.tsx (800 LOC)
   │
   ├── leer datos (useEffect + queries inline)  ────►  use{Feature}Data.ts
   │
   ├── mutaciones (handleSubmit, handleDelete) ─────►  use{Feature}Mutation.ts
   │     │
   │     │     o concentradas en use{Feature}Data si son pocas
   │
   ├── lógica de form (estado local + validación) ──►  use{Feature}Form.ts (opcional)
   │
   ├── JSX de form / lista / detalle ───────────────►  components/{module}/{Block}.tsx
   │     │
   │     ▼  componente presentacional puro:
   │        - recibe data por props
   │        - emite eventos onSubmit, onChange, onClick
   │        - cero imports de @supabase/supabase-js
   │
   └── PageDios.tsx (≤ 400 LOC)
        ├── llama use{Feature}Data() → state + actions
        ├── compone sub-componentes
        └── maneja routing/auth
```

**Reglas concretas para hooks**:
- `use{Feature}Data` retorna SIEMPRE `{ data, isLoading, error, refetch, ...mutations }`.
- TanStack Query es la fuente de verdad: nunca `useState` + `useEffect` para datos remotos.
- Mutaciones invalidan queries por `queryKey` siguiendo convención: `["feed"]`, `["matches", matchId]`, `["tournament", tournamentId, "matches"]`, etc.
- Realtime subs viven dentro del hook con `useEffect(() => subscribeToX(...), [])` y limpian en el cleanup.

**Template de hook tipo `useFeedData`** (referencia para los 5):

```typescript
// src/hooks/useFeedData.ts
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getFeedPosts, createFeedPost, deleteFeedPost, type FeedPost } from "@/lib/feed/api";
import { toast } from "sonner";

const supabase = createClient();

export function useFeedData() {
  const qc = useQueryClient();

  const list = useInfiniteQuery({
    queryKey: ["feed"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const r = await getFeedPosts(supabase, { cursor: pageParam, limit: 20 });
      if (r.error) throw new Error(r.error);
      return r;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const createPost = useMutation({
    mutationFn: async (input: { content: string; image_url?: string | null }) => {
      const auth = await supabase.auth.getUser();
      const userId = auth.data.user?.id;
      if (!userId) throw new Error("No autenticado");
      const r = await createFeedPost(supabase, input, userId);
      if (r.error) throw new Error(r.error);
      return r.data!;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feed"] }); toast.success("Publicado"); },
    onError: (e) => toast.error(e.message),
  });

  const removePost = useMutation({
    mutationFn: async (id: string) => {
      const r = await deleteFeedPost(supabase, id);
      if (r.error) throw new Error(r.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
    onError: (e) => toast.error(e.message),
  });

  const posts: FeedPost[] = list.data?.pages.flatMap((p) => p.data ?? []) ?? [];
  return {
    posts,
    isLoading: list.isLoading,
    isFetchingNextPage: list.isFetchingNextPage,
    hasNextPage: list.hasNextPage,
    fetchNextPage: list.fetchNextPage,
    error: list.error?.message ?? null,
    createPost,
    removePost,
  };
}
```

---

### 1.3 Page Refactor Strategy

Para cada página dios, el patrón concreto es:

#### `NewMatchPage.tsx` (811 → ≤ 400)

| Bloque actual | Extraer a | Tamaño aprox |
|---------------|-----------|--------------|
| Form de detalles de partido (campos + validación) | `src/components/matches/MatchDetailsForm.tsx` | ~180 LOC |
| Selector de cancha + integración con bookings | `src/components/matches/CanchaSelector.tsx` | ~120 LOC |
| Selector de skill level / cupos | `src/components/matches/MatchSettingsForm.tsx` | ~80 LOC |
| Lógica de validación + submit | `src/hooks/useMatchForm.ts` (modo `"create"` o `"edit"`) | ~200 LOC |
| Queries de catalog (sports, ciudades) | `src/hooks/useMatchCatalog.ts` | ~60 LOC |
| **Página orquestadora** | `src/pages/NewMatchPage.tsx` | ~150-200 LOC |

#### `EditMatchPage.tsx` (757 → ≤ 400)

Reutiliza `useMatchForm({ mode: "edit", matchId })`, `MatchDetailsForm`, `CanchaSelector`, `MatchSettingsForm`. Suma:
- `useMatchDetail(matchId)` para precarga (ya existe).
- `src/components/matches/MatchCancelDialog.tsx` para cancelación.

#### `FeedPage.tsx` (737 → ≤ 400)

| Bloque | Extraer a |
|--------|-----------|
| Lista de posts + infinite scroll | `src/components/feed/FeedList.tsx` |
| Tarjeta de post individual | `src/components/feed/FeedPostCard.tsx` |
| Composer (textarea + image upload) | `src/components/feed/FeedComposer.tsx` |
| Lógica de datos + mutaciones | `src/hooks/useFeedData.ts` (ver 1.2) |
| Image upload (Supabase storage) | `src/hooks/useImageUpload.ts` |

#### `CanchaAgendaPage.tsx` (746 → ≤ 400) — coordina con Fase 4

| Bloque | Extraer a |
|--------|-----------|
| Selector de semana / fecha | `src/components/canchas/AgendaWeekSelector.tsx` |
| Grid de día con slots | `src/components/canchas/AgendaDayGrid.tsx` |
| Tarjeta de booking individual | `src/components/canchas/AgendaBookingCard.tsx` |
| Datos + expansión de recurrencias | `src/hooks/useAgendaData.ts` |
| Mutaciones (confirmar/cancelar booking) | dentro de `useAgendaData` |

#### `ChatDetailPage.tsx` (501 → ≤ 400)

| Bloque | Extraer a |
|--------|-----------|
| Lista de mensajes con scroll-to-bottom | `src/components/chat/MessageList.tsx` |
| Input + envío | `src/components/chat/MessageComposer.tsx` |
| Header de conversación | `src/components/chat/ChatHeader.tsx` |
| Datos + realtime sub | `src/hooks/useChatThread.ts` |

---

## Phase 2 — Tournament Module

### 2.1 Name Resolution

Se extienden `src/lib/tournaments/matches.ts` y `src/lib/tournaments/registrations.ts` con queries que joinean a `tournament_registrations`, `teams` y `profiles`.

```typescript
// src/lib/tournaments/registrations.ts (NUEVA función)

export type RegistrationWithNames = RegistrationRow & {
  team_name: string | null;
  player_name: string | null;
};

export async function listRegistrationsWithNames(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<ApiResult<RegistrationWithNames[]>> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select(`
      id, tournament_id, team_id, user_id, status, registered_by, created_at, updated_at,
      team:teams(id, name),
      profile:profiles(id, full_name, username)
    `)
    .eq("tournament_id", tournamentId)
    .order("created_at");
  if (error) return { data: null, error: mapDbError(error, "regs_with_names") };

  const rows: RegistrationWithNames[] = (data ?? []).map((r: any) => ({
    id: r.id,
    tournament_id: r.tournament_id,
    team_id: r.team_id,
    user_id: r.user_id,
    status: r.status,
    registered_by: r.registered_by,
    created_at: r.created_at,
    updated_at: r.updated_at,
    team_name: r.team?.name ?? null,
    player_name: r.profile?.full_name ?? r.profile?.username ?? null,
  }));
  return { data: rows, error: null };
}
```

```typescript
// src/lib/tournaments/matches.ts (NUEVA función)

export type MatchWithNames = MatchRow & {
  home_team_name: string | null;
  away_team_name: string | null;
  home_player_name: string | null;
  away_player_name: string | null;
};

export async function listMatchesWithNames(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<ApiResult<MatchWithNames[]>> {
  const { data, error } = await supabase
    .from("tournament_matches")
    .select(`
      id, tournament_id, round, group_code, fixture_order,
      home_registration_id, away_registration_id, scheduled_at, venue,
      home_score, away_score, status, correction_window_ends_at,
      created_at, updated_at,
      home:tournament_registrations!tournament_matches_home_registration_id_fkey(
        team:teams(name),
        profile:profiles(full_name, username)
      ),
      away:tournament_registrations!tournament_matches_away_registration_id_fkey(
        team:teams(name),
        profile:profiles(full_name, username)
      )
    `)
    .eq("tournament_id", tournamentId)
    .order("round")
    .order("fixture_order");
  if (error) return { data: null, error: mapDbError(error, "matches_with_names") };

  const rows: MatchWithNames[] = (data ?? []).map((m: any) => ({
    ...m,
    home_team_name: m.home?.team?.name ?? null,
    away_team_name: m.away?.team?.name ?? null,
    home_player_name: m.home?.profile?.full_name ?? m.home?.profile?.username ?? null,
    away_player_name: m.away?.profile?.full_name ?? m.away?.profile?.username ?? null,
  }));
  return { data: rows, error: null };
}
```

**RLS necesaria**: confirmar/ajustar que `profiles.full_name` y `teams.name` sean SELECTables por cualquier `auth.uid()`. SQL en sección Migration Plan.

---

### 2.2 State Machine

Los estados de torneo viven en `tournaments.status` y son: `borrador`, `abierto_inscripciones`, `cerrado_inscripciones`, `cancelado`, `finalizado`.

```
       ┌──────────────┐
       │  borrador    │
       └──────┬───────┘
              │ publishTournament()
              ▼
   ┌─────────────────────────┐
   │ abierto_inscripciones   │ ◄─── jugadores se inscriben aquí
   └──────┬──────────────────┘
          │ closeRegistrations()  [confirm AlertDialog]
          ▼
   ┌─────────────────────────┐
   │ cerrado_inscripciones   │ ◄─── promoter genera fixture; matches programados
   └──────┬──────────────────┘
          │ finalizeTournament()  [confirm AlertDialog]
          ▼
       ┌──────────────┐
       │  finalizado  │ (standings bloqueados, no más mutaciones)
       └──────────────┘

(cancelado puede alcanzarse desde cualquier estado activo — fuera de scope MVP, ya soportado por la DB)
```

**Guards (enforced en la API)**:
- `publishTournament` solo si `status === "borrador"` y `owner_id === auth.uid()`.
- `closeRegistrations` solo si `status === "abierto_inscripciones"`.
- `generateFixture` solo si `status === "cerrado_inscripciones"` y `tournament_matches` aún vacía para el torneo.
- `finalizeTournament` solo si `status === "cerrado_inscripciones"` y existen matches (idealmente todos `finalizado` o `w_o`, validación en cliente).

**Implementación**:

```typescript
// src/lib/tournaments/api.ts (extensiones)

async function transitionTournamentStatus(
  supabase: SupabaseClient,
  id: string,
  from: TournamentRow["status"],
  to: TournamentRow["status"],
  userId: string,
): Promise<ApiResult<TournamentRow>> {
  const { data, error } = await supabase
    .from("tournaments")
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", userId)
    .eq("status", from)            // optimistic guard — falla si otra sesión lo modificó
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "tournament_transition") };
  if (!data) return { data: null, error: "No se pudo actualizar el torneo. Refrescá la página." };
  return { data: data as TournamentRow, error: null };
}

export async function publishTournament(
  supabase: SupabaseClient, id: string, userId: string,
): Promise<ApiResult<TournamentRow>> {
  return transitionTournamentStatus(supabase, id, "borrador", "abierto_inscripciones", userId);
}

export async function closeRegistrations(
  supabase: SupabaseClient, id: string, userId: string,
): Promise<ApiResult<TournamentRow>> {
  return transitionTournamentStatus(supabase, id, "abierto_inscripciones", "cerrado_inscripciones", userId);
}

export async function finalizeTournament(
  supabase: SupabaseClient, id: string, userId: string,
): Promise<ApiResult<TournamentRow>> {
  return transitionTournamentStatus(supabase, id, "cerrado_inscripciones", "finalizado", userId);
}
```

---

### 2.3 Fixture Generation

Algoritmo round-robin estándar con rotación (método del círculo). Maneja N par e impar (con bye fijo).

```typescript
// src/lib/tournaments/fixtures.ts (NUEVO)

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { MatchRow } from "./matches";

type ApiResult<T> = { data: T | null; error: string | null };

type FixturePairing = { round: number; homeId: string | null; awayId: string | null; fixtureOrder: number };

/**
 * Round-robin con rotación. Si N es impar, se agrega un placeholder null
 * que actúa como "bye": el equipo emparejado con null no juega esa ronda.
 *
 * Algoritmo:
 *   1. Si N impar → agregar null para hacer par.
 *   2. Fijar el primer ID, rotar el resto en sentido horario.
 *   3. En cada ronda, emparejar los N/2 pares (cabeza vs cola del círculo).
 *   4. Total de rondas = N-1 (con N par incluyendo placeholder).
 */
export function buildRoundRobinPairings(registrationIds: string[]): FixturePairing[] {
  const ids: (string | null)[] = [...registrationIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push(null); // bye

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const pairings: FixturePairing[] = [];

  // Trabajamos sobre una copia mutable
  const rotation: (string | null)[] = [...ids];
  let fixtureOrder = 1;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a === null || b === null) continue; // ese equipo tiene bye en esta ronda
      // alternar home/away por ronda para equilibrar localía
      const isHomeA = (r + i) % 2 === 0;
      pairings.push({
        round: r + 1,
        homeId: isHomeA ? a : b,
        awayId: isHomeA ? b : a,
        fixtureOrder: fixtureOrder++,
      });
    }
    // rotar: el primero queda fijo, los demás giran
    const fixed = rotation[0];
    const last = rotation[n - 1];
    for (let i = n - 1; i > 1; i--) rotation[i] = rotation[i - 1];
    rotation[1] = last;
    rotation[0] = fixed;
  }

  return pairings;
}

export async function generateFixture(
  supabase: SupabaseClient,
  tournamentId: string,
  format: "liga" | "eliminatoria" | "fase_grupos_eliminatoria",
): Promise<ApiResult<MatchRow[]>> {
  if (format !== "liga") {
    return { data: null, error: "Formato no soportado en esta versión." };
  }

  // Idempotency guard: no regenerar si ya hay matches
  const { count, error: countErr } = await supabase
    .from("tournament_matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);
  if (countErr) return { data: null, error: mapDbError(countErr, "fixture_count") };
  if ((count ?? 0) > 0) {
    return { data: null, error: "El fixture ya fue generado para este torneo." };
  }

  // Cargar registros confirmados
  const { data: regs, error: regsErr } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("status", "confirmada")
    .order("created_at");
  if (regsErr) return { data: null, error: mapDbError(regsErr, "fixture_regs") };
  const ids = (regs ?? []).map((r: { id: string }) => r.id);
  if (ids.length < 2) {
    return { data: null, error: "Se necesitan al menos 2 equipos para generar el fixture." };
  }

  const pairings = buildRoundRobinPairings(ids);
  const rows = pairings.map((p) => ({
    tournament_id: tournamentId,
    round: p.round,
    home_registration_id: p.homeId,
    away_registration_id: p.awayId,
    fixture_order: p.fixtureOrder,
    status: "programado" as const,
  }));

  const { data, error } = await supabase
    .from("tournament_matches")
    .insert(rows)
    .select();
  if (error) return { data: null, error: mapDbError(error, "fixture_insert") };
  return { data: (data ?? []) as MatchRow[], error: null };
}
```

**Verificación manual del algoritmo** (parte del QA antes de cerrar Fase 2):

| N | Rondas esperadas | Partidos totales esperados |
|---|------------------|----------------------------|
| 2 | 1                | 1                          |
| 3 | 3 (1 bye/ronda)  | 3                          |
| 4 | 3                | 6                          |
| 5 | 5 (1 bye/ronda)  | 10                         |
| 6 | 5                | 15                         |
| 8 | 7                | 28                         |

---

### 2.4 Component Tree

```
TournamentDetailPage.tsx (orquestador, ~250 LOC)
   │
   ├── useTournamentDetail(id)              ── /src/hooks/useTournamentDetail.ts
   │     ├── useQuery(["tournament", id])
   │     ├── useQuery(["tournament", id, "registrations"])
   │     └── mutations: publish, closeRegs, finalize, generateFixture
   │
   ├── <TournamentHeader tournament={...} />        ── presentational
   │
   ├── <TournamentStatsGrid tournament={...} />     ── presentational (Stat cards)
   │
   ├── {isOwner && <TournamentStateActions
   │       tournament={t}
   │       onPublish={mut.publish}
   │       onCloseRegistrations={mut.closeRegs}
   │       onGenerateFixture={mut.generateFixture}
   │       onFinalize={mut.finalize}
   │       isLoading={mut.isLoading} />}     ── /src/components/tournaments/TournamentStateActions.tsx
   │     │
   │     └── usa AlertDialog de shadcn para confirmaciones destructivas
   │
   └── <TournamentNavLinks tournament={t} isOwner={isOwner} />   ── links a /matches, /standings, /registrations

TournamentMatchesPage.tsx
   │
   ├── useTournamentMatches(tournamentId)
   │     └── useQuery(["tournament", id, "matches"]) → listMatchesWithNames(...)
   │
   ├── <MatchesList matches={data} isOwner={...} onResult={openDialog} />
   │     └── <MatchCard match={m} ... />  (muestra "Tigres FC 2 - 1 Leones" o nombres jugadores)
   │
   └── {isOwner && <MatchResultDialog
           open={...}
           match={selected}
           onSubmit={recordResult}
           onClose={...} />}  ── /src/components/tournaments/MatchResultDialog.tsx

TournamentStandingsPage.tsx
   │
   ├── useStandings(tournamentId)
   │     ├── useQuery(["tournament", id, "standings"])
   │     └── useQuery(["tournament", id, "registrations-names"]) → para resolver nombres
   │
   └── <StandingsTable rows={standingsWithNames} />
```

---

## Phase 3 — Player Profile

### 3.1 DB Schema

Las tres tablas siguen el mismo patrón: PK = `user_id`, columna `visibility` con default, timestamps, FK con `ON DELETE CASCADE`.

```sql
-- supabase/migrations/20260515_000_profile_morpho.sql
CREATE TABLE IF NOT EXISTS profile_morpho (
  user_id     uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  height_m    numeric(4,2) CHECK (height_m IS NULL OR (height_m BETWEEN 1.00 AND 2.50)),
  weight_kg   numeric(5,2) CHECK (weight_kg IS NULL OR (weight_kg BETWEEN 30.00 AND 200.00)),
  wingspan_m  numeric(4,2) CHECK (wingspan_m IS NULL OR (wingspan_m BETWEEN 1.00 AND 2.80)),
  laterality  text CHECK (laterality IN ('diestro','zurdo','ambos')),
  somatotype  text CHECK (somatotype IN ('ectomorfo','mesomorfo','endomorfo','mixto')),
  visibility  text NOT NULL DEFAULT 'promotores'
                CHECK (visibility IN ('publico','promotores','privado')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profile_morpho ENABLE ROW LEVEL SECURITY;

-- trigger para updated_at
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER profile_morpho_touch
  BEFORE UPDATE ON profile_morpho
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

```sql
-- supabase/migrations/20260515_001_profile_conditional.sql
CREATE TABLE IF NOT EXISTS profile_conditional (
  user_id           uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  strength_tags     text[] NOT NULL DEFAULT '{}',
  strength_notes    text CHECK (strength_notes IS NULL OR char_length(strength_notes) <= 500),
  speed_tags        text[] NOT NULL DEFAULT '{}',
  speed_notes       text CHECK (speed_notes IS NULL OR char_length(speed_notes) <= 500),
  endurance_tags    text[] NOT NULL DEFAULT '{}',
  endurance_notes   text CHECK (endurance_notes IS NULL OR char_length(endurance_notes) <= 500),
  flexibility_tags  text[] NOT NULL DEFAULT '{}',
  flexibility_notes text CHECK (flexibility_notes IS NULL OR char_length(flexibility_notes) <= 500),
  visibility        text NOT NULL DEFAULT 'promotores'
                      CHECK (visibility IN ('publico','promotores','privado')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profile_conditional ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profile_conditional_touch
  BEFORE UPDATE ON profile_conditional
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

```sql
-- supabase/migrations/20260515_002_profile_technical_football.sql
CREATE TABLE IF NOT EXISTS profile_technical_football (
  user_id              uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  position             text CHECK (position IN ('arquero','defensa','mediocampista','delantero')),
  dominant_foot        text CHECK (dominant_foot IN ('derecho','izquierdo','ambos')),
  performance_notes    text CHECK (performance_notes IS NULL OR char_length(performance_notes) <= 500),
  tactical_role_notes  text CHECK (tactical_role_notes IS NULL OR char_length(tactical_role_notes) <= 500),
  visibility           text NOT NULL DEFAULT 'publico'
                         CHECK (visibility IN ('publico','promotores','privado')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profile_technical_football ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profile_technical_football_touch
  BEFORE UPDATE ON profile_technical_football
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

---

### 3.2 RLS Policies

```sql
-- supabase/migrations/20260515_003_profile_blocks_rls.sql

-- ───────── profile_morpho ─────────
-- SELECT: público, o promotor cuando visibility = 'promotores', o el propio dueño
CREATE POLICY "morpho_select" ON profile_morpho
  FOR SELECT USING (
    visibility = 'publico'
    OR (visibility = 'promotores' AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.is_promoter = true
    ))
    OR auth.uid() = user_id
  );

-- INSERT/UPDATE/DELETE: solo el dueño
CREATE POLICY "morpho_insert" ON profile_morpho
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "morpho_update" ON profile_morpho
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "morpho_delete" ON profile_morpho
  FOR DELETE USING (auth.uid() = user_id);

-- ───────── profile_conditional ─────────
CREATE POLICY "conditional_select" ON profile_conditional
  FOR SELECT USING (
    visibility = 'publico'
    OR (visibility = 'promotores' AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.is_promoter = true
    ))
    OR auth.uid() = user_id
  );
CREATE POLICY "conditional_insert" ON profile_conditional
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conditional_update" ON profile_conditional
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conditional_delete" ON profile_conditional
  FOR DELETE USING (auth.uid() = user_id);

-- ───────── profile_technical_football ─────────
CREATE POLICY "technical_select" ON profile_technical_football
  FOR SELECT USING (
    visibility = 'publico'
    OR (visibility = 'promotores' AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.is_promoter = true
    ))
    OR auth.uid() = user_id
  );
CREATE POLICY "technical_insert" ON profile_technical_football
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "technical_update" ON profile_technical_football
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "technical_delete" ON profile_technical_football
  FOR DELETE USING (auth.uid() = user_id);
```

**Nota sobre `is_promoter`**: la columna `profiles.is_promoter` debe existir (mencionada en proposal). Si no existe en el schema vivo, agregarla previamente: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_promoter boolean NOT NULL DEFAULT false;`

---

### 3.3 Form Architecture

`ProfileEditPage.tsx` integra los tres bloques nuevos como un `Tabs` (shadcn) mobile-friendly. En 375px se usan accordions; en >= 640px tabs.

```typescript
// src/lib/profiles/api.ts (NUEVO)

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type {
  ProfileMorpho, ProfileConditional, ProfileTechnicalFootball, VisibilityLevel,
} from "@/lib/types/db";

type ApiResult<T> = { data: T | null; error: string | null };
type ProfileBlocks = {
  morpho: (ProfileMorpho & { visibility: VisibilityLevel }) | null;
  conditional: (ProfileConditional & { visibility: VisibilityLevel }) | null;
  technical: (ProfileTechnicalFootball & { visibility: VisibilityLevel }) | null;
};

export async function getProfileBlocks(
  supabase: SupabaseClient, userId: string,
): Promise<ApiResult<ProfileBlocks>> {
  const [m, c, t] = await Promise.all([
    supabase.from("profile_morpho").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_conditional").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_technical_football").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (m.error) return { data: null, error: mapDbError(m.error, "morpho_get") };
  if (c.error) return { data: null, error: mapDbError(c.error, "conditional_get") };
  if (t.error) return { data: null, error: mapDbError(t.error, "technical_get") };
  return {
    data: {
      morpho: (m.data as ProfileBlocks["morpho"]) ?? null,
      conditional: (c.data as ProfileBlocks["conditional"]) ?? null,
      technical: (t.data as ProfileBlocks["technical"]) ?? null,
    },
    error: null,
  };
}

type MorphoInput = Partial<Omit<ProfileMorpho, "user_id" | "created_at" | "updated_at">> & {
  visibility?: VisibilityLevel;
};
export async function updateMorpho(
  supabase: SupabaseClient, userId: string, data: MorphoInput,
): Promise<ApiResult<ProfileMorpho>> {
  const { data: result, error } = await supabase
    .from("profile_morpho")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "morpho_upsert") };
  return { data: result as ProfileMorpho, error: null };
}

type ConditionalInput = Partial<Omit<ProfileConditional, "user_id" | "created_at" | "updated_at">> & {
  visibility?: VisibilityLevel;
};
export async function updateConditional(
  supabase: SupabaseClient, userId: string, data: ConditionalInput,
): Promise<ApiResult<ProfileConditional>> {
  const { data: result, error } = await supabase
    .from("profile_conditional")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "conditional_upsert") };
  return { data: result as ProfileConditional, error: null };
}

type TechnicalInput = Partial<Omit<ProfileTechnicalFootball, "user_id" | "created_at" | "updated_at">> & {
  visibility?: VisibilityLevel;
};
export async function updateTechnicalFootball(
  supabase: SupabaseClient, userId: string, data: TechnicalInput,
): Promise<ApiResult<ProfileTechnicalFootball>> {
  const { data: result, error } = await supabase
    .from("profile_technical_football")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "technical_upsert") };
  return { data: result as ProfileTechnicalFootball, error: null };
}

const BLOCK_TABLE: Record<"morpho" | "conditional" | "technical_football", string> = {
  morpho: "profile_morpho",
  conditional: "profile_conditional",
  technical_football: "profile_technical_football",
};

export async function updateVisibility(
  supabase: SupabaseClient,
  userId: string,
  block: "morpho" | "conditional" | "technical_football",
  level: VisibilityLevel,
): Promise<ApiResult<null>> {
  const table = BLOCK_TABLE[block];
  // upsert-friendly: si la fila no existe, créala con defaults vacíos y la visibilidad
  const { error } = await supabase
    .from(table)
    .upsert({ user_id: userId, visibility: level }, { onConflict: "user_id" });
  if (error) return { data: null, error: mapDbError(error, "visibility_upsert") };
  return { data: null, error: null };
}
```

**Estructura de form** (zod + react-hook-form ya estarán instalados o se agregan vía shadcn-form):

```typescript
// src/components/profile/MorphoForm.tsx — schema (zod)
const morphoSchema = z.object({
  height_m: z.number().min(1.0).max(2.5).nullable(),
  weight_kg: z.number().min(30).max(200).nullable(),
  wingspan_m: z.number().min(1.0).max(2.8).nullable(),
  laterality: z.enum(["diestro","zurdo","ambos"]).nullable(),
  somatotype: z.enum(["ectomorfo","mesomorfo","endomorfo","mixto"]).nullable(),
  visibility: z.enum(["publico","promotores","privado"]),
});
```

**Árbol de componentes**:

```
ProfileEditPage.tsx
   │
   ├── useProfileBlocks(userId)           ── /src/hooks/useProfileBlocks.ts
   │     ├── useQuery(["profile-blocks", userId]) → getProfileBlocks
   │     ├── updateMorphoMut        ── invalida ["profile-blocks", userId]
   │     ├── updateConditionalMut
   │     ├── updateTechnicalMut
   │     └── updateVisibilityMut
   │
   ├── <ProfileIdentityForm />            ── ya existe
   │
   └── <Tabs defaultValue="morpho">       ── shadcn Tabs (o Accordion en mobile)
         ├── <TabsContent value="morpho">
         │     <MorphoForm
         │         initial={blocks.morpho}
         │         onSubmit={updateMorpho.mutate} />
         │     │
         │     └── <VisibilityToggle
         │            value={blocks.morpho?.visibility ?? "promotores"}
         │            onChange={(level) => updateVisibility.mutate({ block: "morpho", level })} />
         │
         ├── <TabsContent value="conditional">
         │     <ConditionalForm initial={blocks.conditional} onSubmit={updateConditional.mutate} />
         │
         └── <TabsContent value="technical">
               <TechnicalFootballForm initial={blocks.technical} onSubmit={updateTechnical.mutate} />
```

---

### 3.4 Visibility Filtering Logic

En cliente, `PublicProfilePage.tsx` (y `ProfilePage.tsx` cuando ve a otro usuario) calcula qué bloques renderizar:

```typescript
// src/lib/profiles/visibility.ts (NUEVO helper)

import type { VisibilityLevel } from "@/lib/types/db";

export type ViewerContext = {
  viewerId: string | null;       // null si no autenticado
  isPromoter: boolean;
  isOwner: boolean;              // viewerId === profileOwnerId
};

export function canViewBlock(
  blockVisibility: VisibilityLevel | undefined | null,
  viewer: ViewerContext,
): boolean {
  if (!blockVisibility) return false;     // bloque inexistente
  if (viewer.isOwner) return true;        // siempre ve lo suyo
  if (blockVisibility === "publico") return true;
  if (blockVisibility === "promotores" && viewer.isPromoter) return true;
  return false;
}
```

Uso:

```typescript
// PublicProfilePage.tsx
const viewer: ViewerContext = {
  viewerId: user?.id ?? null,
  isPromoter: profileSelf?.is_promoter ?? false,
  isOwner: user?.id === profile.id,
};

{canViewBlock(blocks.morpho?.visibility, viewer) && (
  <MorphoBlock data={blocks.morpho!} />
)}
```

La barrera real es RLS — si el viewer no cumple, la query no retorna fila, así que `blocks.morpho === null` y el componente naturalmente no se renderiza. El helper `canViewBlock` evita "destellos" durante la transición y permite mostrar placeholders condicionales si se quiere.

---

## Phase 4 — Recurring Bookings

### 4.1 DB Schema

```sql
-- supabase/migrations/20260520_000_recurring_bookings.sql
CREATE TABLE IF NOT EXISTS recurring_bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id         uuid NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id),
  day_of_week       int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time        time NOT NULL,
  end_time          time NOT NULL CHECK (end_time > start_time),
  start_date        date NOT NULL,
  end_date          date CHECK (end_date IS NULL OR end_date >= start_date),
  status            text NOT NULL DEFAULT 'pendiente'
                      CHECK (status IN ('pendiente','confirmada','cancelada','pausada')),
  price_per_session numeric(12,2) NOT NULL CHECK (price_per_session >= 0),
  frequency         text NOT NULL DEFAULT 'weekly'
                      CHECK (frequency IN ('weekly','biweekly','monthly')),
  notes             text,
  confirmed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_recurring_bookings_cancha
  ON recurring_bookings(cancha_id, status, day_of_week);

CREATE TRIGGER recurring_bookings_touch
  BEFORE UPDATE ON recurring_bookings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
```

```sql
-- supabase/migrations/20260520_001_recurring_exceptions.sql
CREATE TABLE IF NOT EXISTS recurring_exceptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id   uuid NOT NULL REFERENCES recurring_bookings(id) ON DELETE CASCADE,
  original_date  date NOT NULL,
  action         text NOT NULL CHECK (action IN ('cancelled','modified')),
  new_start      time,
  new_end        time,
  new_price      numeric(12,2),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurring_id, original_date)
);

ALTER TABLE recurring_exceptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_recurring
  ON recurring_exceptions(recurring_id, original_date);
```

```sql
-- supabase/migrations/20260520_002_recurring_rls.sql
CREATE POLICY "recurring_owner_all" ON recurring_bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM canchas c
      WHERE c.id = cancha_id AND c.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM canchas c
      WHERE c.id = cancha_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "exceptions_owner_all" ON recurring_exceptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM recurring_bookings rb
      JOIN canchas c ON c.id = rb.cancha_id
      WHERE rb.id = recurring_id AND c.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM recurring_bookings rb
      JOIN canchas c ON c.id = rb.cancha_id
      WHERE rb.id = recurring_id AND c.owner_id = auth.uid()
    )
  );
```

---

### 4.2 Expansion Algorithm

Función pura, sin Supabase. Itera por fecha, decide si la fecha cumple con la frecuencia y el día de semana, aplica excepciones.

```typescript
// src/lib/canchas/recurring-api.ts — expandToBookings (función pura)

export type ExpandedOccurrence = {
  date: string;          // "YYYY-MM-DD"
  start_time: string;    // "HH:MM"
  end_time: string;
  price: number;
  isRecurring: true;
  recurringId: string;
  isException: boolean;  // true si es una excepción "modified"
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseISODate(s: string): Date {
  // Forzamos UTC mediodía para evitar problemas de zona horaria al iterar por día
  return new Date(s + "T12:00:00Z");
}

function formatDate(d: Date): string {
  // YYYY-MM-DD en UTC (consistente con parseISODate)
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function matchesFrequency(
  current: Date,
  seriesStart: Date,
  frequency: "weekly" | "biweekly" | "monthly",
): boolean {
  if (frequency === "weekly") return true;
  if (frequency === "biweekly") {
    const weeks = Math.floor(daysBetween(seriesStart, current) / 7);
    return weeks % 2 === 0;
  }
  // monthly: misma "ordinal del día de semana" del mes que seriesStart
  // ej. si seriesStart es "primer martes del mes", solo matchea primer martes
  if (frequency === "monthly") {
    const ordinalStart = Math.ceil(seriesStart.getUTCDate() / 7);
    const ordinalCurrent = Math.ceil(current.getUTCDate() / 7);
    return ordinalStart === ordinalCurrent;
  }
  return false;
}

export function expandToBookings(
  recurring: RecurringBooking,
  exceptions: RecurringException[],
  fromDate: string,
  toDate: string,
): ExpandedOccurrence[] {
  if (recurring.status === "cancelada" || recurring.status === "pausada") return [];

  const seriesStart = parseISODate(recurring.start_date);
  const seriesEnd = recurring.end_date ? parseISODate(recurring.end_date) : null;
  const rangeStart = parseISODate(fromDate);
  const rangeEnd = parseISODate(toDate);

  // Recortar al overlapping
  const iterStart = rangeStart > seriesStart ? rangeStart : seriesStart;
  const iterEnd = seriesEnd && seriesEnd < rangeEnd ? seriesEnd : rangeEnd;
  if (iterStart > iterEnd) return [];

  // Mapa de excepciones por fecha
  const byDate = new Map<string, RecurringException>();
  for (const e of exceptions) byDate.set(e.original_date, e);

  const out: ExpandedOccurrence[] = [];
  const cursor = new Date(iterStart);

  while (cursor <= iterEnd) {
    if (
      cursor.getUTCDay() === recurring.day_of_week &&
      matchesFrequency(cursor, seriesStart, recurring.frequency)
    ) {
      const dateStr = formatDate(cursor);
      const exc = byDate.get(dateStr);

      if (exc?.action === "cancelled") {
        // skip
      } else if (exc?.action === "modified") {
        out.push({
          date: dateStr,
          start_time: exc.new_start ?? recurring.start_time,
          end_time: exc.new_end ?? recurring.end_time,
          price: exc.new_price ?? recurring.price_per_session,
          isRecurring: true,
          recurringId: recurring.id,
          isException: true,
        });
      } else {
        out.push({
          date: dateStr,
          start_time: recurring.start_time,
          end_time: recurring.end_time,
          price: recurring.price_per_session,
          isRecurring: true,
          recurringId: recurring.id,
          isException: false,
        });
      }
    }
    cursor.setTime(cursor.getTime() + DAY_MS);
  }

  return out;
}
```

**Edge cases cubiertos**:
- `start_date` posterior al rango → nada.
- `end_date` null → expande hasta `toDate` sin límite superior.
- Excepción `cancelled` → la ocurrencia no aparece.
- Excepción `modified` → se aplican overrides parciales (fallback a valores del recurring).
- DST / zona horaria → forzamos UTC mediodía para iterar; los `time` no llevan zona.
- `cancelada`/`pausada` → retorno vacío.

---

### 4.3 API Module

```typescript
// src/lib/canchas/recurring-api.ts (NUEVO)

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { RecurringBooking } from "@/lib/types/db";

type ApiResult<T> = { data: T | null; error: string | null };

export type RecurringBookingInput = {
  cancha_id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date?: string | null;
  price_per_session: number;
  frequency: "weekly" | "biweekly" | "monthly";
  notes?: string | null;
};

export type RecurringException = {
  id: string;
  recurring_id: string;
  original_date: string;
  action: "cancelled" | "modified";
  new_start: string | null;
  new_end: string | null;
  new_price: number | null;
  notes: string | null;
  created_at: string;
};

export async function createRecurring(
  supabase: SupabaseClient,
  input: RecurringBookingInput,
  userId: string,                  // no se usa para escribir owner — RLS valida cancha.owner_id
): Promise<ApiResult<RecurringBooking>> {
  void userId;
  const { data, error } = await supabase
    .from("recurring_bookings")
    .insert({
      cancha_id: input.cancha_id,
      user_id: input.user_id,
      day_of_week: input.day_of_week,
      start_time: input.start_time + (input.start_time.length === 5 ? ":00" : ""),
      end_time: input.end_time + (input.end_time.length === 5 ? ":00" : ""),
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      status: "pendiente",
      price_per_session: input.price_per_session,
      frequency: input.frequency,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "recurring_create") };
  return { data: data as RecurringBooking, error: null };
}

export async function updateRecurring(
  supabase: SupabaseClient,
  id: string,
  input: Partial<RecurringBookingInput>,
): Promise<ApiResult<RecurringBooking>> {
  const { data, error } = await supabase
    .from("recurring_bookings")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "recurring_update") };
  return { data: data as RecurringBooking, error: null };
}

export async function cancelRecurring(
  supabase: SupabaseClient, id: string,
): Promise<ApiResult<RecurringBooking>> {
  const { data, error } = await supabase
    .from("recurring_bookings")
    .update({ status: "cancelada" })
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "recurring_cancel") };
  return { data: data as RecurringBooking, error: null };
}

export async function listRecurringByCancha(
  supabase: SupabaseClient, canchaId: string,
): Promise<ApiResult<RecurringBooking[]>> {
  const { data, error } = await supabase
    .from("recurring_bookings")
    .select("*")
    .eq("cancha_id", canchaId)
    .neq("status", "cancelada")
    .order("day_of_week")
    .order("start_time");
  if (error) return { data: null, error: mapDbError(error, "recurring_list") };
  return { data: (data ?? []) as RecurringBooking[], error: null };
}

export async function listExceptionsByRecurring(
  supabase: SupabaseClient, recurringId: string,
): Promise<ApiResult<RecurringException[]>> {
  const { data, error } = await supabase
    .from("recurring_exceptions")
    .select("*")
    .eq("recurring_id", recurringId)
    .order("original_date");
  if (error) return { data: null, error: mapDbError(error, "exceptions_list") };
  return { data: (data ?? []) as RecurringException[], error: null };
}

export async function createException(
  supabase: SupabaseClient,
  input: Omit<RecurringException, "id" | "created_at">,
): Promise<ApiResult<RecurringException>> {
  const { data, error } = await supabase
    .from("recurring_exceptions")
    .insert(input)
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "exception_create") };
  return { data: data as RecurringException, error: null };
}

// ───── Bulk para agenda ─────
export async function listRecurringWithExceptionsForCancha(
  supabase: SupabaseClient, canchaId: string,
): Promise<ApiResult<{ recurring: RecurringBooking[]; exceptions: RecurringException[] }>> {
  const recRes = await listRecurringByCancha(supabase, canchaId);
  if (recRes.error || !recRes.data) return { data: null, error: recRes.error };

  const ids = recRes.data.map((r) => r.id);
  if (ids.length === 0) return { data: { recurring: [], exceptions: [] }, error: null };

  const { data: excs, error } = await supabase
    .from("recurring_exceptions")
    .select("*")
    .in("recurring_id", ids);
  if (error) return { data: null, error: mapDbError(error, "bulk_exceptions") };
  return { data: { recurring: recRes.data, exceptions: (excs ?? []) as RecurringException[] }, error: null };
}

// re-exporta expandToBookings de su archivo
export { expandToBookings, type ExpandedOccurrence } from "./recurring-expand";
```

> El archivo `recurring-expand.ts` contiene la función pura definida en 4.2. Separarla del API facilita su testeo manual aislado en consola.

---

### 4.4 Agenda Integration

`useAgendaData` (hook nuevo en Fase 1, completado en Fase 4) combina bookings ad-hoc con ocurrencias expandidas.

```typescript
// src/hooks/useAgendaData.ts (extracto relevante)

export function useAgendaData(canchaId: string, weekStart: string /* YYYY-MM-DD */) {
  // rango: 7 días desde weekStart
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().slice(0, 10);
  }, [weekStart]);

  const bookingsQ = useQuery({
    queryKey: ["agenda", canchaId, "bookings", weekStart],
    queryFn: async () => {
      const r = await getBookingsInRange(supabase, canchaId, weekStart, weekEnd);
      if (r.error) throw new Error(r.error);
      return r.data ?? [];
    },
  });

  const recurringQ = useQuery({
    queryKey: ["agenda", canchaId, "recurring"],
    queryFn: async () => {
      const r = await listRecurringWithExceptionsForCancha(supabase, canchaId);
      if (r.error) throw new Error(r.error);
      return r.data!;
    },
  });

  const items = useMemo(() => {
    const adhoc = (bookingsQ.data ?? []).map((b) => ({
      kind: "adhoc" as const,
      date: b.booking_date,
      start_time: b.start_time.substring(0, 5),
      end_time: b.end_time.substring(0, 5),
      price: b.total_price,
      bookingId: b.id,
      status: b.status,
      isRecurring: false as const,
    }));
    const occurrences = (recurringQ.data?.recurring ?? []).flatMap((r) =>
      expandToBookings(r, recurringQ.data!.exceptions.filter((e) => e.recurring_id === r.id), weekStart, weekEnd)
        .map((o) => ({ kind: "recurring" as const, ...o })),
    );
    return [...adhoc, ...occurrences].sort((a, b) =>
      a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date),
    );
  }, [bookingsQ.data, recurringQ.data, weekStart, weekEnd]);

  return {
    items,
    isLoading: bookingsQ.isLoading || recurringQ.isLoading,
    error: bookingsQ.error?.message ?? recurringQ.error?.message ?? null,
  };
}
```

**Detección de solapamiento en cliente** (al crear una recurrencia):

```typescript
function hasOverlap(
  proposed: { day_of_week: number; start_time: string; end_time: string; start_date: string },
  existing: ExpandedOccurrence[],
  bookings: CanchaBooking[],
): boolean {
  // chequear contra ocurrencias expandidas en las próximas 4 semanas
  const overlapsRecurring = existing.some((o) =>
    timesOverlap(proposed.start_time, proposed.end_time, o.start_time, o.end_time),
  );
  const overlapsAdhoc = bookings.some((b) =>
    b.status !== "cancelada"
    && timesOverlap(proposed.start_time, proposed.end_time, b.start_time.substring(0,5), b.end_time.substring(0,5)),
  );
  return overlapsRecurring || overlapsAdhoc;
}
function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}
```

---

### 4.5 Revenue Chart

`recharts` ya está en el árbol de dependencias (lo trae shadcn/ui chart). El componente:

```typescript
// src/components/canchas/RevenueChart.tsx

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export type RevenueDatum = {
  period: string;       // "May 2026" o "2026-05-01"
  collected: number;    // bookings ad-hoc confirmadas (suma de total_price)
  scheduled: number;    // ocurrencias recurrentes activas (price_per_session × count)
};

export function RevenueChart({ data }: { data: RevenueDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Sin datos en este período.
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <XAxis dataKey="period" fontSize={11} />
          <YAxis fontSize={11} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => `$${v.toLocaleString("es-AR")}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="collected" name="Cobrado" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
          <Bar dataKey="scheduled" name="Programado" fill="hsl(var(--muted-foreground))" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

Función de datos (en `src/lib/canchas/stats-api.ts`, agregar):

```typescript
export async function getRevenueSeries(
  supabase: SupabaseClient,
  canchaId: string,
  fromMonth: string,  // "YYYY-MM-01"
  toMonth: string,    // "YYYY-MM-01"
): Promise<ApiResult<RevenueDatum[]>> {
  // 1) Cobrado: suma de total_price por mes desde cancha_bookings donde status = 'confirmada'
  const { data: rows, error } = await supabase
    .from("cancha_bookings")
    .select("booking_date, total_price, status")
    .eq("cancha_id", canchaId)
    .gte("booking_date", fromMonth)
    .lte("booking_date", toMonth);
  if (error) return { data: null, error: mapDbError(error, "revenue_collected") };

  const collectedByMonth: Record<string, number> = {};
  for (const r of (rows ?? []) as { booking_date: string; total_price: number; status: string }[]) {
    if (r.status !== "confirmada") continue;
    const key = r.booking_date.slice(0, 7) + "-01";
    collectedByMonth[key] = (collectedByMonth[key] ?? 0) + Number(r.total_price);
  }

  // 2) Programado: expand recurring en el rango y sumar
  const recRes = await listRecurringWithExceptionsForCancha(supabase, canchaId);
  if (recRes.error || !recRes.data) return { data: null, error: recRes.error };

  const scheduledByMonth: Record<string, number> = {};
  for (const r of recRes.data.recurring) {
    if (r.status !== "confirmada" && r.status !== "pendiente") continue;
    const occs = expandToBookings(
      r,
      recRes.data.exceptions.filter((e) => e.recurring_id === r.id),
      fromMonth,
      toMonth,
    );
    for (const o of occs) {
      const key = o.date.slice(0, 7) + "-01";
      scheduledByMonth[key] = (scheduledByMonth[key] ?? 0) + o.price;
    }
  }

  // 3) Merge ordenado
  const months = new Set<string>([...Object.keys(collectedByMonth), ...Object.keys(scheduledByMonth)]);
  const series: RevenueDatum[] = [...months].sort().map((m) => ({
    period: new Date(m + "T12:00:00Z").toLocaleDateString("es-AR", { month: "short", year: "numeric" }),
    collected: collectedByMonth[m] ?? 0,
    scheduled: scheduledByMonth[m] ?? 0,
  }));

  return { data: series, error: null };
}
```

---

## Phase 5 — Pagination & Polish

### 5.1 Infinite Scroll Pattern

Patrón unificado para feed/matches/torneos/chat-list:

```typescript
// dentro de cualquier hook use{Feature}Data:
const q = useInfiniteQuery({
  queryKey: ["feed"],
  initialPageParam: undefined as string | undefined,
  queryFn: async ({ pageParam }) => {
    const r = await getFeedPosts(supabase, { cursor: pageParam, limit: 20 });
    if (r.error) throw new Error(r.error);
    return r;  // { data, error, nextCursor }
  },
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});
```

**Sentinel observer** (componente compartido):

```typescript
// src/components/ui/InfiniteScrollSentinel.tsx
import { useEffect, useRef } from "react";

export function InfiniteScrollSentinel({
  onIntersect,
  enabled,
}: {
  onIntersect: () => void;
  enabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) onIntersect();
    }, { rootMargin: "200px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [enabled, onIntersect]);
  return <div ref={ref} aria-hidden className="h-1" />;
}
```

Uso en una página:

```tsx
{posts.map((p) => <FeedPostCard key={p.id} post={p} />)}
<InfiniteScrollSentinel
  enabled={hasNextPage && !isFetchingNextPage}
  onIntersect={() => fetchNextPage()}
/>
{isFetchingNextPage && <FeedPostSkeleton />}
{!hasNextPage && posts.length > 0 && (
  <p className="text-center text-sm text-muted-foreground py-6">Ya viste todo el feed</p>
)}
```

**Cursor strategy por lista**:

| Lista                          | Columna cursor      | Orden       | API                             |
|--------------------------------|---------------------|-------------|---------------------------------|
| Feed                           | `created_at`        | DESC        | `getFeedPosts({ cursor })`      |
| Matches list / Mis partidos    | `starts_at`         | ASC         | `getMatchesByFilters({ cursor })` |
| Tournaments                    | `created_at`        | DESC        | `getTournaments({ cursor })`    |
| Chat list                      | `last_message_at`   | DESC        | `listConversations({ cursor })` |
| Cancha agenda                  | rango fecha (no cursor) | — | `useAgendaData({ weekStart })` con lazy ±1 semana |

---

### 5.2 Skeleton Components

Crear `src/components/ui/skeletons/` con seis archivos. Todos usan el primitive `Skeleton` ya existente (`@/components/ui/skeleton`).

```tsx
// src/components/ui/skeletons/MatchCardSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
export function MatchCardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}
```

Mismo molde para:
- `TournamentCardSkeleton.tsx` — tarjeta horizontal con nombre + fechas + cupos.
- `ProfileSkeleton.tsx` — avatar grande + nombre + stats (3 columnas).
- `FeedPostSkeleton.tsx` — avatar + 3 líneas de texto + bloque opcional de imagen.
- `AgendaDaySkeleton.tsx` — 4 filas de bloque horario (1 día de agenda).
- `BookingCardSkeleton.tsx` — fila compacta con hora + estado + precio.

**Slot points**:

| Ruta                     | Skeleton                            |
|--------------------------|-------------------------------------|
| `/feed`                  | 3× `FeedPostSkeleton`               |
| `/matches`               | 4× `MatchCardSkeleton`              |
| `/mis-partidos`          | 4× `MatchCardSkeleton`              |
| `/torneos`               | 4× `TournamentCardSkeleton`        |
| `/torneos/:id`           | `TournamentDetailSkeleton` (header) |
| `/perfil`, `/u/:slug`    | `ProfileSkeleton`                   |
| `/cancha/:id/agenda`    | `AgendaDaySkeleton` × 7             |
| `/cancha/:id/clientes`  | 6× `BookingCardSkeleton`            |
| `/chats`                 | 5× línea (avatar + 2 lines)         |

---

### 5.3 ErrorBoundary

Componente de clase (sin librería externa para mantener cero deps nuevas):

```typescript
// src/components/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    window.location.assign("/feed");
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="container mx-auto max-w-md py-16 px-4 text-center space-y-4">
          <h2 className="text-xl font-semibold">Algo salió mal en esta pantalla.</h2>
          <p className="text-sm text-muted-foreground">
            Recargá la página o volvé al inicio. Si el problema persiste, contactanos por feedback.
          </p>
          <Button onClick={this.reset}>Ir al inicio</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Placement en `App.tsx`**:

```tsx
// dentro del <Switch> de App.tsx, envolver cada Route con sus elementos en ErrorBoundary
<Route path="/feed">
  <ErrorBoundary>
    <ProtectedRoute component={FeedPage} />
  </ErrorBoundary>
</Route>
```

Una alternativa más conservadora es envolver solo las rutas críticas/nuevas para evitar reemplazar el shell global. La regla: **cada ruta principal tiene su ErrorBoundary**; un crash en `/torneos/:id` no rompe `/feed`.

---

## File Tree

### Archivos nuevos a crear

```
src/
├── lib/
│   ├── feed/
│   │   └── api.ts                                  [NUEVO — Fase 1]
│   ├── matches/
│   │   └── api.ts                                  [NUEVO — Fase 1]
│   ├── notifications/
│   │   └── (extender api.ts existente)             [Fase 1]
│   ├── chat/
│   │   └── (extender api.ts existente)             [Fase 1]
│   ├── tournaments/
│   │   └── fixtures.ts                             [NUEVO — Fase 2]
│   ├── profiles/
│   │   ├── api.ts                                  [NUEVO — Fase 3]
│   │   └── visibility.ts                           [NUEVO — Fase 3]
│   └── canchas/
│       ├── recurring-api.ts                        [NUEVO — Fase 4]
│       └── recurring-expand.ts                     [NUEVO — Fase 4]
│
├── hooks/
│   ├── useFeedData.ts                              [NUEVO — Fase 1]
│   ├── useMatchForm.ts                             [NUEVO — Fase 1]
│   ├── useMatchCatalog.ts                          [NUEVO — Fase 1]
│   ├── useAgendaData.ts                            [NUEVO — Fase 1/4]
│   ├── useChatThread.ts                            [NUEVO — Fase 1]
│   ├── useTournamentDetail.ts                      [NUEVO — Fase 2]
│   ├── useTournamentMatches.ts                     [NUEVO — Fase 2]
│   ├── useStandings.ts                             [NUEVO — Fase 2]
│   ├── useProfileBlocks.ts                         [NUEVO — Fase 3]
│   ├── useImageUpload.ts                           [NUEVO — Fase 1]
│   └── useInfiniteSentinel.ts                      [opcional helper — Fase 5]
│
├── components/
│   ├── ErrorBoundary.tsx                           [NUEVO — Fase 5]
│   ├── matches/
│   │   ├── MatchDetailsForm.tsx                    [NUEVO]
│   │   ├── MatchSettingsForm.tsx                   [NUEVO]
│   │   ├── CanchaSelector.tsx                      [NUEVO]
│   │   └── MatchCancelDialog.tsx                   [NUEVO]
│   ├── feed/
│   │   ├── FeedList.tsx                            [NUEVO]
│   │   ├── FeedPostCard.tsx                        [NUEVO]
│   │   └── FeedComposer.tsx                        [NUEVO]
│   ├── chat/
│   │   ├── MessageList.tsx                         [NUEVO]
│   │   ├── MessageComposer.tsx                     [NUEVO]
│   │   └── ChatHeader.tsx                          [NUEVO]
│   ├── tournaments/
│   │   ├── TournamentStateActions.tsx              [NUEVO — Fase 2]
│   │   ├── MatchResultDialog.tsx                   [NUEVO — Fase 2]
│   │   ├── TournamentHeader.tsx                    [NUEVO — Fase 2]
│   │   ├── TournamentStatsGrid.tsx                 [NUEVO — Fase 2]
│   │   ├── MatchesList.tsx                         [NUEVO — Fase 2]
│   │   ├── MatchCard.tsx                           [NUEVO — Fase 2]
│   │   └── StandingsTable.tsx                      [NUEVO — Fase 2]
│   ├── profile/
│   │   ├── MorphoForm.tsx                          [NUEVO — Fase 3]
│   │   ├── ConditionalForm.tsx                     [NUEVO — Fase 3]
│   │   ├── TechnicalFootballForm.tsx               [NUEVO — Fase 3]
│   │   ├── VisibilityToggle.tsx                    [NUEVO — Fase 3]
│   │   └── ProfileBlocksTabs.tsx                   [NUEVO — Fase 3]
│   ├── canchas/
│   │   ├── AgendaWeekSelector.tsx                  [NUEVO — Fase 1]
│   │   ├── AgendaDayGrid.tsx                       [NUEVO — Fase 1]
│   │   ├── AgendaBookingCard.tsx                   [NUEVO — Fase 1/4]
│   │   ├── RecurringBookingDialog.tsx              [NUEVO — Fase 4]
│   │   ├── RecurringSeriesList.tsx                 [NUEVO — Fase 4]
│   │   ├── RecurringOccurrenceMenu.tsx             [NUEVO — Fase 4]
│   │   └── RevenueChart.tsx                        [NUEVO — Fase 4]
│   └── ui/
│       ├── EmptyState.tsx                          [NUEVO — Fase 5]
│       ├── InfiniteScrollSentinel.tsx              [NUEVO — Fase 5]
│       └── skeletons/
│           ├── MatchCardSkeleton.tsx               [NUEVO — Fase 5]
│           ├── TournamentCardSkeleton.tsx          [NUEVO — Fase 5]
│           ├── ProfileSkeleton.tsx                 [NUEVO — Fase 5]
│           ├── FeedPostSkeleton.tsx                [NUEVO — Fase 5]
│           ├── AgendaDaySkeleton.tsx               [NUEVO — Fase 5]
│           └── BookingCardSkeleton.tsx             [NUEVO — Fase 5]
│
└── pages/
    └── CanchaRecurringPage.tsx                     [NUEVO — Fase 4]

supabase/migrations/
├── 20260512_000_profiles_is_promoter.sql           [si no existe]
├── 20260512_001_public_names_rls.sql               [Fase 2 — RLS de profiles/teams]
├── 20260515_000_profile_morpho.sql                 [Fase 3]
├── 20260515_001_profile_conditional.sql            [Fase 3]
├── 20260515_002_profile_technical_football.sql     [Fase 3]
├── 20260515_003_profile_blocks_rls.sql             [Fase 3]
├── 20260520_000_recurring_bookings.sql             [Fase 4]
├── 20260520_001_recurring_exceptions.sql           [Fase 4]
├── 20260520_002_recurring_rls.sql                  [Fase 4]
└── 20260525_000_feed_indexes.sql                   [Fase 5 — índices]

openspec/changes/mejoras-core-plataforma/
├── proposal.md                                     [EXISTE]
├── spec.md                                         [EXISTE]
├── design.md                                       [ESTE ARCHIVO]
├── tasks.md                                        [siguiente fase SDD]
├── db-snapshot.sql                                 [snapshot del schema vivo — pre-Fase 3]
└── qa-checklist.md                                 [Fase 5]
```

### Archivos a modificar

```
src/lib/tournaments/api.ts             — agrega publishTournament, closeRegistrations, finalizeTournament
src/lib/tournaments/matches.ts         — agrega listMatchesWithNames + MatchWithNames
src/lib/tournaments/registrations.ts   — agrega listRegistrationsWithNames + RegistrationWithNames
src/lib/canchas/stats-api.ts           — agrega getRevenueSeries
src/lib/types/db.ts                    — agregar RecurringException, ExpandedOccurrence (si no están)

src/App.tsx                            — envolver rutas con <ErrorBoundary>; agregar ruta /cancha/agenda/recurrentes

src/pages/NewMatchPage.tsx             — refactor a ≤ 400 LOC
src/pages/EditMatchPage.tsx            — refactor a ≤ 400 LOC
src/pages/FeedPage.tsx                 — refactor + infinite scroll + skeletons + empty
src/pages/CanchaAgendaPage.tsx         — refactor + integración recurring + skeletons
src/pages/ChatDetailPage.tsx           — refactor + cleanup realtime
src/pages/ChatListPage.tsx             — paginación + empty state
src/pages/MisPartidosPage.tsx          — empty state + skeletons
src/pages/TournamentsPage.tsx          — paginación + skeletons + empty
src/pages/TournamentDetailPage.tsx     — agregar <TournamentStateActions>; quita createClient inline
src/pages/TournamentMatchesPage.tsx    — usa listMatchesWithNames; <MatchResultDialog>
src/pages/TournamentStandingsPage.tsx  — usa nombres reales
src/pages/ProfileEditPage.tsx          — integra <ProfileBlocksTabs>
src/pages/ProfilePage.tsx              — renderiza bloques con canViewBlock
src/pages/PublicProfilePage.tsx        — idem
src/pages/CanchaStatsPage.tsx          — reemplaza tabla cruda con <RevenueChart>

(17 páginas con createClient inline → todas deben extraer queries a su lib/* respectivo;
 lista exhaustiva se confirma con `grep -r "createClient()" src/pages/`)
```

---

## Migration Plan

Las migraciones se aplican **antes** de la fase que las consume. Orden y dependencias:

| Orden | Migración                                       | Aplica antes de | Notas |
|------:|-------------------------------------------------|-----------------|-------|
| 1     | `20260512_000_profiles_is_promoter.sql`         | Fase 3          | `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_promoter boolean NOT NULL DEFAULT false;` (solo si no existe). |
| 2     | `20260512_001_public_names_rls.sql`             | Fase 2          | Política de SELECT para `profiles.full_name` y `teams.name` a usuarios autenticados. |
| 3     | `20260515_000_profile_morpho.sql`               | Fase 3          | Tabla + trigger updated_at. |
| 4     | `20260515_001_profile_conditional.sql`          | Fase 3          | Tabla. |
| 5     | `20260515_002_profile_technical_football.sql`   | Fase 3          | Tabla. |
| 6     | `20260515_003_profile_blocks_rls.sql`           | Fase 3          | Policies SELECT/INSERT/UPDATE/DELETE para los 3 bloques. |
| 7     | `20260520_000_recurring_bookings.sql`           | Fase 4          | Tabla. |
| 8     | `20260520_001_recurring_exceptions.sql`         | Fase 4          | Tabla con UNIQUE(recurring_id, original_date). |
| 9     | `20260520_002_recurring_rls.sql`                | Fase 4          | Policies basadas en `canchas.owner_id`. |
| 10    | `20260525_000_feed_indexes.sql`                 | Fase 5          | Índices: `feed_posts(created_at DESC)`, `matches(starts_at)`, `conversations(last_message_at DESC)`. |

**Migración 2 (RLS de nombres públicos) — SQL explícito**:

```sql
-- Asegurar que cualquier auth.uid() puede leer full_name de profiles
DROP POLICY IF EXISTS "profiles_select_public_names" ON profiles;
CREATE POLICY "profiles_select_public_names" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);  -- read-only de columnas no sensibles ya enforced por la API a nivel select()

-- Para teams.name
DROP POLICY IF EXISTS "teams_select_public_names" ON teams;
CREATE POLICY "teams_select_public_names" ON teams
  FOR SELECT
  TO authenticated
  USING (true);
```

> Si las tablas ya tienen policies más restrictivas, agregar la nueva no la suplanta — `USING (true)` se evalúa como OR con las existentes. Si en cambio la policy actual es exclusiva, hay que ajustar o consolidar.

**Acción previa obligatoria** (mencionada en proposal): antes de empezar Fase 3 ejecutar `supabase db dump --schema public > openspec/changes/mejoras-core-plataforma/db-snapshot.sql` para verificar qué migraciones son realmente necesarias (algunas tablas pueden existir parcialmente).

**Rollback de cada migración**: cada archivo tiene un comentario al final con el SQL inverso (ej. `-- DOWN: DROP TABLE IF EXISTS profile_morpho CASCADE;`). No se ejecutan en CI, pero quedan documentados.

---

## Implementation Sequence

Orden recomendado de tareas. Las dependencias entre tareas son explícitas; lo que no se lista como bloqueante puede hacerse en paralelo.

### Fase 1 — Foundation (estimado 5-7 días)

1. **F1.1** Crear `src/lib/feed/api.ts` y `src/lib/matches/api.ts`. Sin tocar páginas todavía.
2. **F1.2** Crear hooks: `useFeedData`, `useMatchForm`, `useMatchCatalog`, `useAgendaData` (versión sin recurring), `useChatThread`.
3. **F1.3** Extender `src/lib/chat/api.ts` con paginación y `subscribeToConversation`.
4. **F1.4** Crear `src/components/{matches, feed, chat, canchas}/*.tsx` (sub-componentes presentacionales).
5. **F1.5** Refactor incremental de las 5 páginas dios — un commit por página o por sub-componente. Después de cada commit: `npm run build` debe pasar y la página renderiza sin regresiones visibles.
6. **F1.6** Verificación: `grep -r "createClient()" src/pages/` retorna 0. `find src/pages -name "*.tsx" -exec wc -l {} \; | awk '$1 > 400'` retorna 0.

### Fase 2 — Tournaments (estimado 3-4 días) — depende F1 para patrón

1. **F2.1** Aplicar migración `20260512_001_public_names_rls.sql`. Probar `listMatches` original sin error 42501.
2. **F2.2** Crear `listRegistrationsWithNames` y `listMatchesWithNames`. Verificar nombres en queries manuales (Supabase Dashboard SQL editor).
3. **F2.3** Extender `src/lib/tournaments/api.ts` con `publishTournament`, `closeRegistrations`, `finalizeTournament`.
4. **F2.4** Crear `src/lib/tournaments/fixtures.ts`. Probar `buildRoundRobinPairings` con N=3,4,5,8 (asserts manuales en consola).
5. **F2.5** Crear `src/components/tournaments/TournamentStateActions.tsx` con `AlertDialog` para acciones destructivas.
6. **F2.6** Crear `src/components/tournaments/MatchResultDialog.tsx` consumiendo `recordResult` existente.
7. **F2.7** Crear `useTournamentDetail` y `useTournamentMatches`. Refactor de `TournamentDetailPage`, `TournamentMatchesPage`, `TournamentStandingsPage`.
8. **F2.8** Verificación end-to-end con cuenta promoter: borrador → publicar → cerrar → fixture → resultados → finalizar.

### Fase 3 — Profile (estimado 3-4 días) — depende migraciones DB

1. **F3.1** Generar snapshot `db-snapshot.sql`. Confirmar qué tablas faltan.
2. **F3.2** Aplicar migraciones 3-6 en orden. Verificar en Dashboard.
3. **F3.3** Crear `src/lib/profiles/api.ts` con las funciones de upsert y `getProfileBlocks`.
4. **F3.4** Crear `src/lib/profiles/visibility.ts` con `canViewBlock`.
5. **F3.5** Crear `useProfileBlocks` hook.
6. **F3.6** Crear los 4 componentes de form: `MorphoForm`, `ConditionalForm`, `TechnicalFootballForm`, `VisibilityToggle`. Cada uno con su schema zod.
7. **F3.7** Integrar `ProfileBlocksTabs` en `ProfileEditPage`.
8. **F3.8** Actualizar `ProfilePage` y `PublicProfilePage` para renderizar bloques con `canViewBlock`.
9. **F3.9** Verificación manual con 2 cuentas (jugador + promotor) — visibilidad correcta en cada combinación.

### Fase 4 — Recurring Bookings (estimado 4-5 días) — depende F1 (CanchaAgendaPage refactor) y migraciones

1. **F4.1** Aplicar migraciones 7-9.
2. **F4.2** Crear `src/lib/canchas/recurring-expand.ts` con `expandToBookings`. Probar con casos: weekly/biweekly/monthly, con/sin excepciones, fechas borde.
3. **F4.3** Crear `src/lib/canchas/recurring-api.ts`.
4. **F4.4** Extender `useAgendaData` para combinar bookings ad-hoc + ocurrencias expandidas.
5. **F4.5** Crear `RecurringBookingDialog` (form de creación con validación de solapamiento).
6. **F4.6** Crear `RecurringOccurrenceMenu` (popover al click en ocurrencia: editar ocurrencia / editar serie / cancelar).
7. **F4.7** Crear `RecurringSeriesList` y `CanchaRecurringPage` (ruta `/cancha/agenda/recurrentes`).
8. **F4.8** Crear `RevenueChart` y extender `stats-api.ts` con `getRevenueSeries`. Integrar en `CanchaStatsPage`.
9. **F4.9** Verificación manual: crear/editar/cancelar serie; ocurrencia con excepción; cancelación puntual.

### Fase 5 — Pagination & Polish (estimado 3-4 días)

1. **F5.1** Aplicar migración 10 (índices).
2. **F5.2** Crear `src/components/ui/skeletons/` con los 6 componentes.
3. **F5.3** Crear `src/components/ui/EmptyState.tsx` y `src/components/ui/InfiniteScrollSentinel.tsx`.
4. **F5.4** Crear `src/components/ErrorBoundary.tsx`.
5. **F5.5** Convertir `useFeedData`, `useMatchesList`, `useTournamentsList`, `useChatList` a `useInfiniteQuery`.
6. **F5.6** Integrar skeletons en cada ruta principal; integrar empty states.
7. **F5.7** Envolver rutas críticas en `App.tsx` con `<ErrorBoundary>`.
8. **F5.8** Crear `openspec/changes/mejoras-core-plataforma/qa-checklist.md` y ejecutar QA completo por rol antes de merge a `main`.

**Cada fase termina con un PR independiente a `release/mvp-v1`**. Si Fase 3 o 4 se demoran, el lanzamiento puede recortarse a F1+F2+F5 sin bloqueo arquitectónico.

---

## Open Risks & Decisions Required

> Lista de items que conviene resolver antes de avanzar con `sdd-tasks` o durante implementación, para evitar retrabajo.

1. **Schema vivo de Supabase**: confirmar (vía `db-snapshot.sql`) si `profile_morpho`, `profile_conditional`, `profile_technical_football`, `recurring_bookings`, `recurring_exceptions` ya existen o no. Si existen, ajustar migraciones a `ALTER` en lugar de `CREATE`.
2. **`profiles.is_promoter`**: confirmar existencia. Sin esta columna, las RLS de bloques con visibilidad `promotores` no compilan.
3. **Política RLS actual de `profiles.full_name`**: si la policy actual ya permite SELECT a `authenticated`, la migración 2 sobra. Verificar.
4. **`tournament_matches.fixture_order`**: la columna existe (visible en `MatchRow`). Confirmar que el constraint `NOT NULL` no fuerza valor (debe ser nullable o tener default). En caso contrario el insert del fixture falla.
5. **`feed_posts` columnas y FK**: el código asume columnas `id, author_id, content, image_url, kind, created_at`. Confirmar nombre real de la FK `feed_posts_author_id_fkey` para la sintaxis del join `author:profiles!feed_posts_author_id_fkey(...)`.
6. **`recharts` ya en `package.json`**: confirmar versión instalada (algunos shadcn charts requieren ≥2.10). Si no está, ejecutar `npm install recharts`.
7. **Estrategia para `MatchesListPage`**: en algunos lugares se llama `/matches`, en otros `MatchesListPage` no existe como tal (puede ser `MisPartidosPage`). Confirmar la lista exacta al inicio de F1.
8. **Estados sin botón de transición**: la state machine no incluye `cancelado` — ¿se quiere botón "Cancelar torneo" desde `borrador`/`abierto_inscripciones`? Recomiendo agregarlo como tarea menor (vía un dropdown extra en `TournamentStateActions`) — fuera del scope mínimo pero barato.
9. **Cantidad mínima de equipos para finalizar**: ¿se exige que TODOS los matches estén `finalizado` o basta con que al menos uno lo esté? Recomiendo: cliente sugiere completar todos, pero servidor permite `finalizeTournament` con matches pendientes (los standings simplemente reflejan lo jugado).
10. **Image upload para feed**: `useImageUpload` se referencia pero no se diseña en detalle aquí (Supabase Storage `feed-images` bucket). Asumir patrón existente del módulo de canchas o detallarlo en tasks.

Estos puntos no bloquean comenzar Fase 1 (que no toca DB nueva ni tiene dependencias). Se resuelven puntualmente al iniciar cada fase posterior.
