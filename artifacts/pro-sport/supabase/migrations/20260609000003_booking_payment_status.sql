-- REQ-06: Add payment_status to cancha_bookings
-- Tracks the payment lifecycle separately from booking confirmation status.
ALTER TABLE public.cancha_bookings
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'sin_anticipo'
  CONSTRAINT cancha_bookings_payment_status_check
  CHECK (payment_status IN ('sin_anticipo', 'anticipo_pagado', 'pagado_total'));
