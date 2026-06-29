ALTER TABLE venues
DROP COLUMN IF EXISTS payment_qr_url,
DROP COLUMN IF EXISTS payment_nequi,
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]'::jsonb;
