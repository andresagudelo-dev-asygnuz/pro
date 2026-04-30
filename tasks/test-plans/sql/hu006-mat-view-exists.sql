-- HU-006 · 🔴 Sprint 5 fix: la mat view public.standings está POPULADA al init
-- Antes del fix: WITH NO DATA + primer refresh CONCURRENTLY → fallaba silenciosamente.
-- Post fix: la migración hace REFRESH MATERIALIZED VIEW (no-concurrent) al final
-- para popularla, permitiendo futuros CONCURRENTLY.

do $$
declare
  ispopulated boolean;
begin
  select ispopulated into ispopulated from pg_matviews
  where schemaname = 'public' and matviewname = 'standings';

  if ispopulated is null then
    raise notice '[FAIL] mat view public.standings no existe';
  elsif ispopulated then
    raise notice '[PASS] mat view public.standings está populada (REFRESH CONCURRENTLY habilitado)';
  else
    raise notice '[FAIL] mat view public.standings existe pero NO está populada — CONCURRENTLY fallará';
  end if;
end $$;

-- Verificar que el índice único necesario para CONCURRENTLY existe.
do $$
declare cnt int;
begin
  select count(*) into cnt from pg_indexes
  where schemaname = 'public'
    and tablename = 'standings'
    and indexdef ilike '%unique%';

  if cnt >= 1 then
    raise notice '[PASS] standings tiene índice único (% índices unique)', cnt;
  else
    raise notice '[FAIL] standings no tiene índice único — REFRESH CONCURRENTLY no funcionará';
  end if;
end $$;
