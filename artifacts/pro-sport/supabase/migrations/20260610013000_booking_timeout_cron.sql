-- Enable pg_cron if not already enabled (this requires superuser, normally Supabase has it enabled for postgres role)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to cancel expired bookings
CREATE OR REPLACE FUNCTION public.cancel_expired_bookings()
RETURNS void AS $$
BEGIN
  -- We cancel bookings that are older than 2 hours and have not been paid
  -- payment_status = 'sin_anticipo' and status = 'pendiente'
  UPDATE public.cancha_bookings
  SET status = 'cancelada'
  WHERE status = 'pendiente'
    AND payment_status = 'sin_anticipo'
    AND created_at < NOW() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the job to run every 15 minutes
-- Job name: cancel_expired_bookings_job
-- It returns jobid
DO $$
DECLARE
  jobid bigint;
BEGIN
  -- Try to unschedule if it exists to avoid duplicates
  BEGIN
    PERFORM cron.unschedule('cancel_expired_bookings_job');
  EXCEPTION WHEN OTHERS THEN
    -- ignore
  END;

  SELECT cron.schedule(
    'cancel_expired_bookings_job',
    '*/15 * * * *',
    'SELECT public.cancel_expired_bookings()'
  ) INTO jobid;
END;
$$;
