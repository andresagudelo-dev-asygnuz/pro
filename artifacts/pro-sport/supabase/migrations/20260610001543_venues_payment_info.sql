ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS payment_qr_url text,
ADD COLUMN IF NOT EXISTS payment_nequi text,
ADD COLUMN IF NOT EXISTS payment_instructions text;
