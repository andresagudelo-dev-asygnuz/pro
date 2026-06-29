-- 1. Extend booking status check constraint
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'en_validacion';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'finalizada';
ALTER TABLE public.cancha_bookings
  DROP CONSTRAINT IF EXISTS cancha_bookings_status_check;

-- 2. Add new fields
ALTER TABLE public.cancha_bookings
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- 3. Add payment_nequi to canchas (for displaying payment info to clients)
ALTER TABLE public.canchas
  ADD COLUMN IF NOT EXISTS payment_nequi TEXT,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- 4. Storage bucket for receipts (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts', 'receipts', false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS: authenticated users can upload to their own booking path
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = 'bookings'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Cancha owners can read receipts for their canchas
CREATE POLICY "Cancha owners can read receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

-- Users can read their own receipts
CREATE POLICY "Users can read own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[2]
);
