-- HU-003 · Catálogo visibility_fields + override por usuario.
-- Valida que profile_field_visibility respeta:
--   · FK contra visibility_fields(field_key)
--   · enum visibility_level (publico | promotores | privado)

begin;

-- 1) El catálogo público está seedeado por la migración.
do $$
declare cnt int;
begin
  select count(*) into cnt from public.visibility_fields;
  if cnt > 0 then
    raise notice '[PASS] visibility_fields seedeado (% campos)', cnt;
  else
    raise notice '[FAIL] visibility_fields vacío';
  end if;
end $$;

insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000f01', '00000000-0000-0000-0000-000000000000', 'vis_a@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000f01","role":"authenticated"}';

-- 2) Override válido sobre un field_key del catálogo.
insert into public.profile_field_visibility(user_id, field_key, level)
values ('00000000-0000-4000-8000-000000000f01', 'identity.full_name', 'promotores')
on conflict (user_id, field_key) do update set level = excluded.level;

do $$
declare v text;
begin
  select level::text into v from public.profile_field_visibility
  where user_id = '00000000-0000-4000-8000-000000000f01'
    and field_key = 'identity.full_name';
  if v = 'promotores' then
    raise notice '[PASS] override identity.full_name=promotores guardado';
  else
    raise notice '[FAIL] override level = %', v;
  end if;
end $$;

-- 3) level inválido → enum visibility_level rechaza.
do $$
declare ok boolean;
begin
  begin
    insert into public.profile_field_visibility(user_id, field_key, level)
    values (
      '00000000-0000-4000-8000-000000000f01',
      'identity.city',
      'invalid_value'
    );
    ok := true;
  exception when others then
    ok := false;
  end;

  if ok then
    raise notice '[FAIL] level invalid_value aceptado — enum laxo';
  else
    raise notice '[PASS] level inválido rechazado por enum';
  end if;
end $$;

-- 4) field_key inexistente → FK a visibility_fields rechaza.
do $$
declare ok boolean;
begin
  begin
    insert into public.profile_field_visibility(user_id, field_key, level)
    values (
      '00000000-0000-4000-8000-000000000f01',
      'nonexistent.field',
      'publico'
    );
    ok := true;
  exception when others then
    ok := false;
  end;

  if ok then
    raise notice '[FAIL] field_key inexistente aceptado — FK rota';
  else
    raise notice '[PASS] field_key fuera del catálogo rechazado por FK';
  end if;
end $$;

rollback;
