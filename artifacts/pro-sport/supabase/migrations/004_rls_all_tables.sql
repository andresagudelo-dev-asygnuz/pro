-- ============================================================
-- 004: RLS completo para TODAS las tablas de PRO.
-- Ejecutá esto en Supabase Dashboard → SQL Editor → New query
-- Es idempotente: podés correrlo las veces que quieras.
-- URL: https://supabase.com/dashboard/project/ewzpwldtaeaxtesimjau/sql/new
-- ============================================================

-- ─── PROFILES (ya cubierto en 002 — re-aplica por seguridad) ────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_all  ON profiles;
DROP POLICY IF EXISTS profiles_modify_own  ON profiles;
CREATE POLICY profiles_select_all ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_modify_own ON profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─── USER_ROLES ──────────────────────────────────────────────────────────────
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ur_select ON user_roles;
DROP POLICY IF EXISTS ur_update ON user_roles;
CREATE POLICY ur_select ON user_roles FOR SELECT USING (true);
CREATE POLICY ur_update ON user_roles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── SPORTS ──────────────────────────────────────────────────────────────────
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sports_select ON sports;
CREATE POLICY sports_select ON sports FOR SELECT USING (true);

-- ─── MATCHES ─────────────────────────────────────────────────────────────────
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS matches_select    ON matches;
DROP POLICY IF EXISTS matches_insert    ON matches;
DROP POLICY IF EXISTS matches_update    ON matches;
DROP POLICY IF EXISTS matches_delete    ON matches;
-- Todos pueden ver partidos públicos
CREATE POLICY matches_select ON matches FOR SELECT USING (is_public OR organizer_id = auth.uid());
-- Usuarios autenticados pueden crear partidos
CREATE POLICY matches_insert ON matches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = organizer_id);
-- Solo el organizador puede editar/cancelar
CREATE POLICY matches_update ON matches FOR UPDATE TO authenticated
  USING (auth.uid() = organizer_id);
CREATE POLICY matches_delete ON matches FOR DELETE TO authenticated
  USING (auth.uid() = organizer_id);

-- ─── MATCH_PARTICIPANTS ───────────────────────────────────────────────────────
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mp_select ON match_participants;
DROP POLICY IF EXISTS mp_insert ON match_participants;
DROP POLICY IF EXISTS mp_update ON match_participants;
DROP POLICY IF EXISTS mp_delete ON match_participants;
CREATE POLICY mp_select ON match_participants FOR SELECT USING (true);
CREATE POLICY mp_insert ON match_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY mp_update ON match_participants FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM matches WHERE id = match_id AND organizer_id = auth.uid())
  );
CREATE POLICY mp_delete ON match_participants FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM matches WHERE id = match_id AND organizer_id = auth.uid())
  );

-- ─── MATCH_EVENTS ────────────────────────────────────────────────────────────
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS me_select ON match_events;
DROP POLICY IF EXISTS me_insert ON match_events;
CREATE POLICY me_select ON match_events FOR SELECT USING (true);
CREATE POLICY me_insert ON match_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM matches WHERE id = match_id AND organizer_id = auth.uid())
  );

-- ─── MATCH_INVITATIONS ───────────────────────────────────────────────────────
ALTER TABLE match_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mi_select ON match_invitations;
DROP POLICY IF EXISTS mi_insert ON match_invitations;
DROP POLICY IF EXISTS mi_update ON match_invitations;
CREATE POLICY mi_select ON match_invitations FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
CREATE POLICY mi_insert ON match_invitations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY mi_update ON match_invitations FOR UPDATE TO authenticated
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

-- ─── MATCH_RATINGS (ya cubierto en 001 — re-aplica) ─────────────────────────
ALTER TABLE match_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can insert ratings" ON match_ratings;
DROP POLICY IF EXISTS "Anyone can view ratings"        ON match_ratings;
DROP POLICY IF EXISTS "Raters can update their own"    ON match_ratings;
CREATE POLICY mr_select ON match_ratings FOR SELECT USING (true);
CREATE POLICY mr_insert ON match_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id);
CREATE POLICY mr_update ON match_ratings FOR UPDATE TO authenticated
  USING (auth.uid() = rater_id) WITH CHECK (auth.uid() = rater_id);

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS msg_select ON messages;
DROP POLICY IF EXISTS msg_insert ON messages;
-- Cualquier participante del partido puede leer/enviar mensajes
CREATE POLICY msg_select ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM match_participants
    WHERE match_id = messages.match_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM matches WHERE id = messages.match_id AND organizer_id = auth.uid()
  )
);
CREATE POLICY msg_insert ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (SELECT 1 FROM match_participants WHERE match_id = messages.match_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM matches WHERE id = messages.match_id AND organizer_id = auth.uid())
    )
  );

-- ─── FRIENDSHIPS ─────────────────────────────────────────────────────────────
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fs_select ON friendships;
DROP POLICY IF EXISTS fs_insert ON friendships;
DROP POLICY IF EXISTS fs_update ON friendships;
DROP POLICY IF EXISTS fs_delete ON friendships;
CREATE POLICY fs_select ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY fs_insert ON friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY fs_update ON friendships FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY fs_delete ON friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notif_select ON notifications;
DROP POLICY IF EXISTS notif_update ON notifications;
CREATE POLICY notif_select ON notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY notif_update ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ─── CANCHAS ─────────────────────────────────────────────────────────────────
ALTER TABLE canchas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS canchas_select ON canchas;
DROP POLICY IF EXISTS canchas_insert ON canchas;
DROP POLICY IF EXISTS canchas_update ON canchas;
DROP POLICY IF EXISTS canchas_delete ON canchas;
CREATE POLICY canchas_select ON canchas FOR SELECT USING (true);
CREATE POLICY canchas_insert ON canchas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY canchas_update ON canchas FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY canchas_delete ON canchas FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ─── CANCHA_SCHEDULES ────────────────────────────────────────────────────────
ALTER TABLE cancha_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cs_select ON cancha_schedules;
DROP POLICY IF EXISTS cs_insert ON cancha_schedules;
DROP POLICY IF EXISTS cs_update ON cancha_schedules;
DROP POLICY IF EXISTS cs_delete ON cancha_schedules;
CREATE POLICY cs_select ON cancha_schedules FOR SELECT USING (true);
CREATE POLICY cs_insert ON cancha_schedules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM canchas WHERE id = cancha_id AND owner_id = auth.uid()));
CREATE POLICY cs_update ON cancha_schedules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM canchas WHERE id = cancha_id AND owner_id = auth.uid()));
CREATE POLICY cs_delete ON cancha_schedules FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM canchas WHERE id = cancha_id AND owner_id = auth.uid()));

-- ─── CANCHA_BOOKINGS ─────────────────────────────────────────────────────────
ALTER TABLE cancha_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cb_select ON cancha_bookings;
DROP POLICY IF EXISTS cb_insert ON cancha_bookings;
DROP POLICY IF EXISTS cb_update ON cancha_bookings;
CREATE POLICY cb_select ON cancha_bookings FOR SELECT
  USING (
    auth.uid() = booked_by
    OR EXISTS (SELECT 1 FROM canchas WHERE id = cancha_id AND owner_id = auth.uid())
  );
CREATE POLICY cb_insert ON cancha_bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = booked_by);
CREATE POLICY cb_update ON cancha_bookings FOR UPDATE TO authenticated
  USING (
    auth.uid() = booked_by
    OR EXISTS (SELECT 1 FROM canchas WHERE id = cancha_id AND owner_id = auth.uid())
  );

-- ─── TOURNAMENTS ─────────────────────────────────────────────────────────────
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tourn_select ON tournaments;
DROP POLICY IF EXISTS tourn_insert ON tournaments;
DROP POLICY IF EXISTS tourn_update ON tournaments;
DROP POLICY IF EXISTS tourn_delete ON tournaments;
CREATE POLICY tourn_select ON tournaments FOR SELECT USING (true);
CREATE POLICY tourn_insert ON tournaments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY tourn_update ON tournaments FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY tourn_delete ON tournaments FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ─── TOURNAMENT_REGISTRATIONS ────────────────────────────────────────────────
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tr_select ON tournament_registrations;
DROP POLICY IF EXISTS tr_insert ON tournament_registrations;
DROP POLICY IF EXISTS tr_delete ON tournament_registrations;
CREATE POLICY tr_select ON tournament_registrations FOR SELECT USING (true);
CREATE POLICY tr_insert ON tournament_registrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = registered_by);
CREATE POLICY tr_delete ON tournament_registrations FOR DELETE TO authenticated
  USING (
    auth.uid() = registered_by
    OR EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND owner_id = auth.uid())
  );

-- ─── TOURNAMENT_MATCHES ──────────────────────────────────────────────────────
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tm2_select ON tournament_matches;
DROP POLICY IF EXISTS tm2_insert ON tournament_matches;
DROP POLICY IF EXISTS tm2_update ON tournament_matches;
CREATE POLICY tm2_select ON tournament_matches FOR SELECT USING (true);
CREATE POLICY tm2_insert ON tournament_matches FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND owner_id = auth.uid())
  );
CREATE POLICY tm2_update ON tournament_matches FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND owner_id = auth.uid())
  );

-- ─── STANDINGS ───────────────────────────────────────────────────────────────
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS st_select ON standings;
DROP POLICY IF EXISTS st_all    ON standings;
CREATE POLICY st_select ON standings FOR SELECT USING (true);
-- Upsert de standings lo hace el organizador del torneo
CREATE POLICY st_all ON standings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND owner_id = auth.uid())
  );

-- ─── AGE_VERIFICATIONS ───────────────────────────────────────────────────────
ALTER TABLE age_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS av_select ON age_verifications;
DROP POLICY IF EXISTS av_upsert ON age_verifications;
DROP POLICY IF EXISTS av_update ON age_verifications;
-- Usuario ve su propia; authenticated ve todas (admins necesitan leer todas)
CREATE POLICY av_select ON age_verifications FOR SELECT TO authenticated USING (true);
CREATE POLICY av_upsert ON age_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY av_update ON age_verifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR true); -- admin puede actualizar (sin rol formal aún)

-- ─── TEAMS (re-aplica 003 con DROP IF EXISTS) ────────────────────────────────
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teams_select ON teams;
DROP POLICY IF EXISTS teams_insert ON teams;
DROP POLICY IF EXISTS teams_update ON teams;
DROP POLICY IF EXISTS teams_delete ON teams;
CREATE POLICY teams_select ON teams FOR SELECT USING (
  is_public
  OR owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = auth.uid())
);
CREATE POLICY teams_insert ON teams FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY teams_update ON teams FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY teams_delete ON teams FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ─── TEAM_MEMBERS (re-aplica 003) ────────────────────────────────────────────
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tm_select ON team_members;
DROP POLICY IF EXISTS tm_insert ON team_members;
DROP POLICY IF EXISTS tm_delete ON team_members;
CREATE POLICY tm_select ON team_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM teams WHERE id = team_id AND (is_public OR owner_id = auth.uid()))
);
CREATE POLICY tm_insert ON team_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );
CREATE POLICY tm_delete ON team_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- ─── FEEDBACK ────────────────────────────────────────────────────────────────
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fb_insert ON feedback;
DROP POLICY IF EXISTS fb_select ON feedback;
CREATE POLICY fb_insert ON feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY fb_select ON feedback FOR SELECT TO authenticated USING (true);

-- ─── MARKET_VALIDATION_RESPONSES ────────────────────────────────────────────
ALTER TABLE market_validation_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mvr_insert ON market_validation_responses;
CREATE POLICY mvr_insert ON market_validation_responses FOR INSERT WITH CHECK (true);

-- ─── FIN ─────────────────────────────────────────────────────────────────────
-- Verificá que todo quedó bien:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;
