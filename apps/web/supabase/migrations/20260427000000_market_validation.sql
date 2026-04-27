-- MIGRACIÓN ROBUSTA PARA VALIDACIÓN DE MERCADO PRO
-- Ejecuta esto en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.market_validation_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Identificación
  name text,
  email text UNIQUE,
  age text,
  gender text,
  
  -- Perfil Deportivo
  main_sport text,
  frequency text,
  role text,
  organizer_type text,
  
  -- Problemas y Soluciones
  tools jsonb DEFAULT '[]'::jsonb,
  problems text,
  pain_intensity text,
  
  -- Comportamiento (Booleans)
  lost_money boolean DEFAULT false,
  searched_solution boolean DEFAULT false,
  digital_payment boolean DEFAULT false,
  bad_experience_unknowns boolean DEFAULT false,
  limited_venues_knowledge boolean DEFAULT false,
  
  -- Métricas
  coordination_time_hours int DEFAULT 0,
  beta_interest boolean DEFAULT false,
  price_point int DEFAULT 0,
  
  -- Otros
  key_phrase text,
  signals jsonb DEFAULT '{}'::jsonb
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.market_validation_responses ENABLE ROW LEVEL SECURITY;

-- Política para permitir INSERCIÓN pública (necesaria para el formulario sin login)
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.market_validation_responses;
CREATE POLICY "Enable insert for everyone" ON public.market_validation_responses
  FOR INSERT WITH CHECK (true);

-- Política para permitir LECTURA pública o autenticada (ajustar según necesidad)
DROP POLICY IF EXISTS "Enable read for everyone" ON public.market_validation_responses;
CREATE POLICY "Enable read for everyone" ON public.market_validation_responses
  FOR SELECT USING (true);
