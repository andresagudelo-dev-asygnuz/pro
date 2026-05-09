-- ─── Fix Match Chat: Auto-create conversations for matches ─────────────────────
-- Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Function to ensure conversation exists for a match
create or replace function public.ensure_match_conversation(m_id uuid, m_title text, m_org_id uuid)
returns uuid language plpgsql security definer as $$
declare
  conv_id uuid;
begin
  -- Check if conversation already exists for this match
  select id into conv_id from public.conversations where id = m_id;
  
  if conv_id is null then
    insert into public.conversations (id, type, reference_id, title, subtitle)
    values (m_id, 'match', m_id::text, m_title, 'Chat del partido')
    returning id into conv_id;
    
    -- Add organizer as first participant
    insert into public.conversation_participants (conversation_id, user_id)
    values (conv_id, m_org_id)
    on conflict do nothing;
  end if;
  
  return conv_id;
end;
$$;

-- 2. Trigger on matches: Create conversation on insert
create or replace function public.on_match_created()
returns trigger language plpgsql security definer as $$
begin
  perform public.ensure_match_conversation(new.id, new.title, new.organizer_id);
  return new;
end;
$$;

drop trigger if exists trg_match_created on public.matches;
create trigger trg_match_created
  after insert on public.matches
  for each row execute function public.on_match_created();

-- 3. Trigger on match_participants: Sync to conversation_participants
create or replace function public.on_match_participant_change()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    if (new.status = 'joined' or new.status = 'attended') then
      -- Ensure conversation exists (safety)
      perform public.ensure_match_conversation(new.match_id, (select title from public.matches where id = new.match_id), (select organizer_id from public.matches where id = new.match_id));
      
      insert into public.conversation_participants (conversation_id, user_id)
      values (new.match_id, new.user_id)
      on conflict do nothing;
    end if;
  elsif (tg_op = 'DELETE') then
    delete from public.conversation_participants
    where conversation_id = old.match_id and user_id = old.user_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_match_participant_change on public.match_participants;
create trigger trg_match_participant_change
  after insert or update or delete on public.match_participants
  for each row execute function public.on_match_participant_change();

-- 4. Initial sync: Create conversations for all existing matches
do $$
declare
  m record;
begin
  for m in select id, title, organizer_id from public.matches loop
    perform public.ensure_match_conversation(m.id, m.title, m.organizer_id);
  end loop;
  
  -- Sync existing participants
  insert into public.conversation_participants (conversation_id, user_id)
  select match_id, user_id from public.match_participants
  where status in ('joined', 'attended')
  on conflict do nothing;
end;
$$;
