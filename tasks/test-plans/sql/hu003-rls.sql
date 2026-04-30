-- HU-003 · RLS profile_field_visibility_write_self
-- Verifica que un usuario no puede escribir visibility de otro.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000e01', 'pfv_a@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000e02', 'pfv_b@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Impersonar A.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000e01","role":"authenticated"}';

do $$
declare ok boolean;
begin
  begin
    insert into public.profile_field_visibility(user_id, field, visibility)
    values ('00000000-0000-4000-8000-000000000e02', 'phone', 'publico');
    ok := true;
  exception when others then
    ok := false;
  end;

  if ok then
    raise notice '[FAIL] user A escribió visibility de B — RLS rota';
  else
    raise notice '[PASS] user A NO puede escribir visibility de B';
  end if;
end $$;

rollback;
