-- cancha_admins: staff/collaborators who help manage a cancha
-- Separate from owner (is_cancha role). Allows delegating confirm/schedule/stats/clients access.
CREATE TABLE IF NOT EXISTS public.cancha_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id       UUID NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  can_confirm     BOOLEAN NOT NULL DEFAULT true,
  can_schedule    BOOLEAN NOT NULL DEFAULT false,
  can_stats       BOOLEAN NOT NULL DEFAULT false,
  can_clients     BOOLEAN NOT NULL DEFAULT false,
  invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cancha_id, user_id)
);

ALTER TABLE public.cancha_admins ENABLE ROW LEVEL SECURITY;

-- Cancha owner can manage admins for their canchas
CREATE POLICY "owner_manage_admins" ON public.cancha_admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.canchas
      WHERE canchas.id = cancha_admins.cancha_id
        AND canchas.owner_id = auth.uid()
    )
  );

-- Admin can see their own record
CREATE POLICY "admin_read_own" ON public.cancha_admins
  FOR SELECT USING (user_id = auth.uid());
