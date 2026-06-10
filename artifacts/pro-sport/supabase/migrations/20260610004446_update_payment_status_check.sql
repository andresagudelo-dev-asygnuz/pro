-- Update the payment_status check constraint to include 'rechazado'

ALTER TABLE cancha_bookings 
  DROP CONSTRAINT IF EXISTS cancha_bookings_payment_status_check;

ALTER TABLE cancha_bookings
  ADD CONSTRAINT cancha_bookings_payment_status_check
  CHECK (payment_status IN ('sin_anticipo', 'anticipo_pagado', 'pagado_total', 'rechazado'));
