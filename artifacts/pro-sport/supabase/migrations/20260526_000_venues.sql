-- Create venues (centros deportivos) table
CREATE TABLE IF NOT EXISTS public.venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  address     TEXT NOT NULL,
  city        TEXT NOT NULL,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  description TEXT,
  phone       TEXT,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS venues_city_idx ON public.venues (city);
-- trigger set_updated_at already exists from earlier migration
DROP TRIGGER IF EXISTS set_venues_updated_at ON public.venues;
CREATE TRIGGER set_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
-- Any authenticated user can read venues
CREATE POLICY "venues_select" ON public.venues FOR SELECT TO authenticated USING (true);
-- Only is_cancha users can create venues
CREATE POLICY "venues_insert" ON public.venues FOR INSERT WITH CHECK (created_by = auth.uid() AND COALESCE((SELECT is_cancha FROM public.user_roles WHERE user_id = auth.uid()), false) = true);
-- Creator can update/delete
CREATE POLICY "venues_update" ON public.venues FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "venues_delete" ON public.venues FOR DELETE USING (created_by = auth.uid());
-- DOWN: DROP TABLE IF EXISTS public.venues CASCADE;
