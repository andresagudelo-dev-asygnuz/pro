-- ─── Notifications table ─────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor.

create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  type        text        not null,
  data        jsonb       not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_created
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Users can read their own notifications
create policy "Users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Users can mark their own as read
create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Any authenticated user can insert (organizer notifies participants)
create policy "Authenticated insert notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);
