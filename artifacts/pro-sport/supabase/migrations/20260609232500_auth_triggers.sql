-- Attach triggers to auth.users to automatically create profile and roles

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_roles ON auth.users;
CREATE TRIGGER on_auth_user_created_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_roles();

-- Fix any existing users that missed the trigger
INSERT INTO public.profiles (id, full_name, created_at, updated_at)
SELECT id, split_part(email, '@', 1), now(), now()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, is_player, is_promoter, is_cancha, created_at, updated_at)
SELECT id, true, false, false, now(), now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id) DO NOTHING;
