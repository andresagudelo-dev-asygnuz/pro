-- HU-003 · Catálogo visibility_fields presente + override por user.
-- Verifica que profile_field_visibility respeta la constraint de visibility.

begin;

-- Catálogo debe estar seedeado por la migración.
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

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000f01', 'vis_a@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000f01","role":"authenticated"}';

-- Insertar override válido.
insert into public.profile_field_visibility(user_id, field, visibility)
values ('00000000-0000-4000-8000-000000000f01', 'phone', 'promotores')
on conflict (user_id, field) do update set visibility = excluded.visibility;

do $$
declare v text;
begin
  select visibility into v from public.profile_field_visibility
  where user_id = '00000000-0000-4000-8000-000000000f01' and field = 'phone';
  if v = 'promotores' then
    raise notice '[PASS] override phone=promotores guardado';
  else
    raise notice '[FAIL] override phone visibility = %', v;
  end if;
end $$;

-- Insertar con visibility inválido → debe fallar por CHECK/enum.
do $$
declare ok boolean;
begin
  begin
    insert into public.profile_field_visibility(user_id, field, visibility)
    values ('00000000-0000-4000-8000-000000000f01', 'dob', 'invalid_value');
    ok := true;
  exception when others then
    ok := false;
  end;

  if ok then
    raise notice '[FAIL] visibility invalid_value aceptado — constraint laxa';
  else
    raise notice '[PASS] visibility inválido rechazado';
  end if;
end $$;

rollback;
