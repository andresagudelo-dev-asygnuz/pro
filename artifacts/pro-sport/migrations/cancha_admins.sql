-- ─── Cancha Admins: Multi-admin / Equipo por Cancha ────────────────────────

CREATE TABLE IF NOT EXISTS public.cancha_admins (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id      uuid        NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  role           text        NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','staff')),
  can_confirm    boolean     NOT NULL DEFAULT true,
  can_schedule   boolean     NOT NULL DEFAULT false,
  can_stats      boolean     NOT NULL DEFAULT true,
  can_clients    boolean     NOT NULL DEFAULT false,
  invited_by     uuid        REFERENCES auth.users(id),
  status         text        NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cancha_id, user_id)
);

CREATE INDEX IF NOT EXISTS ca_cancha ON public.cancha_admins(cancha_id);
CREATE INDEX IF NOT EXISTS ca_user   ON public.cancha_admins(user_id);
CREATE INDEX IF NOT EXISTS ca_active ON public.cancha_admins(user_id, status);

ALTER TABLE public.cancha_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_full_admins"     ON public.cancha_admins;
DROP POLICY IF EXISTS "admins_see_team"        ON public.cancha_admins;
DROP POLICY IF EXISTS "user_see_own_entry"     ON public.cancha_admins;

-- Owner has full control over their cancha's admin table
CREATE POLICY "owner_full_admins" ON public.cancha_admins FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.canchas c
    WHERE c.id = cancha_admins.cancha_id AND c.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.canchas c
    WHERE c.id = cancha_admins.cancha_id AND c.owner_id = auth.uid()
  ));

-- Active admins can see the team roster of the same cancha
CREATE POLICY "admins_see_team" ON public.cancha_admins FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cancha_admins ca
    WHERE ca.cancha_id = cancha_admins.cancha_id
      AND ca.user_id   = auth.uid()
      AND ca.status    = 'active'
  ));

-- Every user can read their own admin entries (to know which canchas they manage)
CREATE POLICY "user_see_own_entry" ON public.cancha_admins FOR SELECT
  USING (auth.uid() = user_id);
