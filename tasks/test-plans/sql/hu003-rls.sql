-- HU-003 · RLS pfv_update_self / pfv_insert_self
-- Verifica que un usuario no puede escribir visibility de otro.
-- Nota columnas: la tabla es (user_id, field_key, level) — NO (field, visibility).

begin;

insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000e01', '00000000-0000-0000-0000-000000000000', 'pfv_a@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000e02', '00000000-0000-0000-0000-000000000000', 'pfv_b@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Impersonar A.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000e01","role":"authenticated"}';

do $$
declare ok boolean;
begin
  begin
    insert into public.profile_field_visibility(user_id, field_key, level)
    values (
      '00000000-0000-4000-8000-000000000e02',
      'identity.full_name',
      'publico'
    );
    ok := true;
  exception when others then
    ok := false;
  end;

  if ok then
    raise notice '[FAIL] user A escribió PFV de B — pfv_insert_self rota';
  else
    raise notice '[PASS] user A NO puede insertar PFV de B';
  end if;
end $$;

rollback;
