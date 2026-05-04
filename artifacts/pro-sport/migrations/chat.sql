-- ─── Chat: Conversations + Messages ──────────────────────────────────────────
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Conversations
create table if not exists public.conversations (
  id               uuid        primary key default gen_random_uuid(),
  type             text        not null check (type in ('booking','match','tournament','friend','direct')),
  reference_id     text,
  title            text        not null,
  subtitle         text,
  metadata         jsonb       not null default '{}',
  last_message_text text,
  last_message_at  timestamptz,
  last_sender_id   uuid        references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists conv_type_ref on public.conversations(type, reference_id);
create index if not exists conv_updated   on public.conversations(updated_at desc);

-- 2. Participants
create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id)           on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists cp_user on public.conversation_participants(user_id);

-- 3. Messages
create table if not exists public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  sender_id       uuid        not null references auth.users(id)           on delete cascade,
  content         text        not null,
  created_at      timestamptz not null default now()
);

create index if not exists msg_conv_created on public.messages(conversation_id, created_at);

-- 4. Trigger: update conversations.last_message_* on new message
create or replace function public.on_new_message()
returns trigger language plpgsql security definer as $$
begin
  update public.conversations
  set
    last_message_text = left(new.content, 120),
    last_message_at   = new.created_at,
    last_sender_id    = new.sender_id,
    updated_at        = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_new_message on public.messages;
create trigger trg_new_message
  after insert on public.messages
  for each row execute function public.on_new_message();

-- 5. RLS
alter table public.conversations            enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                 enable row level security;

drop policy if exists "conv_select"         on public.conversations;
drop policy if exists "conv_insert"         on public.conversations;
drop policy if exists "cp_select"           on public.conversation_participants;
drop policy if exists "cp_insert"           on public.conversation_participants;
drop policy if exists "cp_update"           on public.conversation_participants;
drop policy if exists "msg_select"          on public.messages;
drop policy if exists "msg_insert"          on public.messages;

-- Conversations visible to participants
create policy "conv_select" on public.conversations for select
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = id and cp.user_id = auth.uid()
  ));

-- Any authenticated user can create a conversation
create policy "conv_insert" on public.conversations for insert
  with check (auth.uid() is not null);

-- Participants can view their own memberships
create policy "cp_select" on public.conversation_participants for select
  using (auth.uid() = user_id);

-- Authenticated users can add participants (needed to create conversations)
create policy "cp_insert" on public.conversation_participants for insert
  with check (auth.uid() is not null);

-- Users can update their own last_read_at
create policy "cp_update" on public.conversation_participants for update
  using (auth.uid() = user_id);

-- Participants can read messages
create policy "msg_select" on public.messages for select
  using (exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
  ));

-- Participants can send messages
create policy "msg_insert" on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );
