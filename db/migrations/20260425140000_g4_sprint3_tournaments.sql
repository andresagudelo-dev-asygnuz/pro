-- Migration: tournaments
-- Description: Creación de tablas base para HU-004 y HU-005 (Torneos e inscripciones)

-- Enums
CREATE TYPE public.tournament_status AS ENUM ('borrador', 'abierto_inscripciones', 'cerrado_inscripciones', 'cancelado', 'finalizado');
CREATE TYPE public.tournament_format AS ENUM ('liga', 'eliminatoria', 'fase_grupos_eliminatoria');

-- Tabla Tournaments
CREATE TABLE public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format public.tournament_format NOT NULL DEFAULT 'liga',
    slots INT NOT NULL CHECK (slots > 0),
    slots_filled INT NOT NULL DEFAULT 0 CHECK (slots_filled >= 0 AND slots_filled <= slots),
    location TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status public.tournament_status NOT NULL DEFAULT 'borrador',
    categories JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT dates_check CHECK (end_date >= start_date)
);

-- Índices
CREATE INDEX tournaments_status_idx ON public.tournaments(status);
CREATE INDEX tournaments_owner_id_idx ON public.tournaments(owner_id);
CREATE INDEX tournaments_start_date_idx ON public.tournaments(start_date);
CREATE INDEX tournaments_location_status_idx ON public.tournaments(location, status);

-- Función para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los torneos publicados son visibles para todos"
  ON public.tournaments FOR SELECT
  USING (status IN ('abierto_inscripciones', 'cerrado_inscripciones', 'finalizado') OR owner_id = auth.uid());

CREATE POLICY "Solo los promotores pueden crear torneos"
  ON public.tournaments FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND coalesce((SELECT is_promoter FROM public.user_roles WHERE user_id = auth.uid()), false) = true
  );

CREATE POLICY "Solo el dueño puede actualizar su torneo"
  ON public.tournaments FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Solo el dueño puede borrar su torneo en borrador"
  ON public.tournaments FOR DELETE
  USING (owner_id = auth.uid() AND status = 'borrador');
