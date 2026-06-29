-- Add rich profile fields to venues
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;

-- Backfill: for existing venues, set owner_id = created_by
UPDATE public.venues SET owner_id = created_by WHERE owner_id IS NULL;

-- Index for owner lookup
CREATE INDEX IF NOT EXISTS venues_owner_id_idx ON public.venues(owner_id);

-- RLS: owner can update their own venue
CREATE POLICY "Venue owner can update"
  ON public.venues FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- RLS: authenticated users can insert venues (creating their center)
CREATE POLICY "Authenticated can create venue"
  ON public.venues FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND auth.uid() = owner_id);

-- Storage bucket for venue assets (banners + logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venues', 'venues', true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read venue assets"
  ON storage.objects FOR SELECT USING (bucket_id = 'venues');

CREATE POLICY "Venue owner can upload assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'venues');

CREATE POLICY "Venue owner can update assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'venues');
