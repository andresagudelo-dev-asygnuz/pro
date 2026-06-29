-- cancha_client_tags: owner can label clients as VIP, frequent, or blocked
CREATE TABLE IF NOT EXISTS public.cancha_client_tags (
  cancha_id   UUID NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL CHECK (tag IN ('vip', 'frecuente', 'bloqueado')),
  notes       TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cancha_id, user_id)
);

ALTER TABLE public.cancha_client_tags ENABLE ROW LEVEL SECURITY;

-- Only the cancha owner can read/write client tags
CREATE POLICY "owner_manage_client_tags" ON public.cancha_client_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.canchas
      WHERE canchas.id = cancha_client_tags.cancha_id
        AND canchas.owner_id = auth.uid()
    )
  );
