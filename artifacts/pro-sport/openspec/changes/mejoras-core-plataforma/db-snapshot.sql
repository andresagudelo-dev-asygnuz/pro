


-- =============================================================================
-- DB SNAPSHOT — pro-beta (ewzpwldtaeaxtesimjau)
-- Generado: 2026-05-11
-- Comando: npx supabase db dump --schema public
-- =============================================================================
--
-- ANÁLISIS DE TABLAS — estado vs. plan de mejoras
--
-- ✅ YA EXISTEN (no necesitan migración):
--   canchas, cancha_bookings, cancha_schedules, cancha_admins, cancha_client_tags
--   matches, match_participants, match_invitations, match_waitlist, match_ratings
--   recurring_bookings  ← EXISTE pero sin campo 'frequency' ni 'end_date nullable'
--   profiles            ← tiene skill_*, preferred_foot. SIN columnas avanzadas.
--   user_roles          ← tiene is_promoter, is_player, is_cancha (NO está en profiles)
--   teams, team_members
--   conversations, conversation_participants, messages
--   notifications, friendships, sports
--   ratings, rate_limits, market_validation_responses
--
-- ❌ NO EXISTEN — necesitan migración ANTES de implementar:
--   tournaments              ← CRÍTICO: las tablas de torneos no están en DB. El código
--   tournament_registrations   TypeScript existe pero opera contra tablas inexistentes.
--   tournament_matches         Necesita migración completa (Phase 2).
--   profile_morpho           ← Fase 3
--   profile_conditional      ← Fase 3
--   profile_technical_football ← Fase 3
--   recurring_exceptions     ← Fase 4 (recurring_bookings ya existe)
--   feed_posts               ← NO SE NECESITA: el feed en FeedPage usa la tabla matches
--
-- ⚠️  DIFERENCIAS CON EL DISEÑO:
--   recurring_bookings.end_date → NOT NULL en DB (el diseño lo asumía nullable)
--   recurring_bookings          → sin campo 'frequency' (solo day_of_week + fechas)
--   is_promoter                 → está en user_roles, NO en profiles
--                                 Las RLS de profile_morpho deben join a user_roles
--
-- ✅ ÍNDICES YA EXISTENTES (no recrear):
--   matches_starts_at_idx, matches_city_sport_idx, matches_organizer_idx
--   msg_conv_created, conv_updated, conv_type_ref
--   profiles_city_sport_idx
--   rb_cancha, rb_cancha_status, rb_user (en recurring_bookings)
--
-- ❌ ÍNDICES FALTANTES (Phase 5 migración):
--   notifications — sin índice en created_at DESC
--   cancha_bookings — sin índice en (cancha_id, booking_date)
-- =============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."booking_status" AS ENUM (
    'pendiente',
    'confirmada',
    'cancelada'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."cancha_sport_type" AS ENUM (
    'futbol_11',
    'futbol_9',
    'futbol_5',
    'futbol_sala',
    'padel',
    'tenis',
    'basket',
    'voleibol',
    'otro'
);


ALTER TYPE "public"."cancha_sport_type" OWNER TO "postgres";


CREATE TYPE "public"."match_status" AS ENUM (
    'open',
    'full',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."match_status" OWNER TO "postgres";


CREATE TYPE "public"."participant_status" AS ENUM (
    'joined',
    'left',
    'attended',
    'no_show',
    'requested'
);


ALTER TYPE "public"."participant_status" OWNER TO "postgres";


CREATE TYPE "public"."skill_level" AS ENUM (
    'principiante',
    'intermedio',
    'avanzado',
    'pro'
);


ALTER TYPE "public"."skill_level" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_count integer;
begin
  insert into public.rate_limits as rl (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
        when (now() - rate_limits.window_start) > make_interval(secs => p_window_seconds)
        then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when (now() - rate_limits.window_start) > make_interval(secs => p_window_seconds)
        then now()
        else rate_limits.window_start
      end
  returning count into v_count;

  if v_count > p_max then
    raise exception 'rate_limited: % of % requests in % seconds', v_count, p_max, p_window_seconds
      using errcode = 'P0001';
  end if;
end;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_match_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_max int;
  v_count int;
begin
  -- Bloqueamos la fila del partido para serializar inserts concurrentes.
  select max_players into v_max
  from public.matches
  where id = NEW.match_id
  for update;

  if v_max is null then
    raise exception 'Match not found' using errcode = 'P0002';
  end if;

  select count(*) into v_count
  from public.match_participants
  where match_id = NEW.match_id;

  if v_count >= v_max then
    raise exception 'match_full' using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."enforce_match_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_recurring_instances"("p_recurring_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  rb  record;
  d   date;
  n   int := 0;
BEGIN
  SELECT * INTO rb FROM public.recurring_bookings WHERE id = p_recurring_id;
  IF rb IS NULL THEN RETURN 0; END IF;

  d := rb.start_date;
  WHILE d <= rb.end_date LOOP
    IF EXTRACT(DOW FROM d)::smallint = rb.day_of_week THEN
      INSERT INTO public.cancha_bookings (
        cancha_id, booked_by, booking_date, start_time, end_time,
        status, total_price, recurring_booking_id
      )
      VALUES (
        rb.cancha_id, rb.user_id, d,
        rb.start_time || ':00',
        rb.end_time   || ':00',
        'confirmada', rb.price_per_session, rb.id
      )
      ON CONFLICT DO NOTHING;
      n := n + 1;
    END IF;
    d := d + 1;
  END LOOP;

  UPDATE public.recurring_bookings
     SET status = 'confirmada', confirmed_at = now(), updated_at = now()
   WHERE id = p_recurring_id;

  RETURN n;
END;
$$;


ALTER FUNCTION "public"."generate_recurring_instances"("p_recurring_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_player   BOOLEAN := COALESCE(NULLIF(LOWER(NEW.raw_user_meta_data->>'is_player'), '') IN ('true','t','yes','y','1','on'), false);
  v_is_promoter BOOLEAN := COALESCE(NULLIF(LOWER(NEW.raw_user_meta_data->>'is_promoter'), '') IN ('true','t','yes','y','1','on'), false);
  v_is_cancha   BOOLEAN := COALESCE(NULLIF(LOWER(NEW.raw_user_meta_data->>'is_cancha'), '') IN ('true','t','yes','y','1','on'), false);
BEGIN
  IF NOT v_is_player AND NOT v_is_promoter AND NOT v_is_cancha THEN v_is_player := true; END IF;
  INSERT INTO public.user_roles (user_id, is_player, is_promoter, is_cancha)
  VALUES (NEW.id, v_is_player, v_is_promoter, v_is_cancha)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."handle_new_user_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_new_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.conversations
  set
    last_message_text = left(new.content, 120),
    last_message_at   = new.created_at,
    last_sender_id    = new.sender_id,
    updated_at        = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."on_new_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_messages_on_closed_match"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    declare
      v_status match_status;
    begin
      -- Only block for match-type conversations; look up via conversation reference_id
      select m.status into v_status
      from public.conversations c
      join public.matches m on m.id::text = c.reference_id::text
      where c.id = new.conversation_id
        and c.type = 'match';

      if v_status in ('cancelled', 'completed') then
        raise exception 'match_closed: cannot send messages to a % match', v_status
          using errcode = 'P0001';
      end if;

      return new;
    end;
    $$;


ALTER FUNCTION "public"."prevent_messages_on_closed_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_organizer_leave"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_organizer uuid;
begin
  select organizer_id into v_organizer
  from public.matches
  where id = coalesce(old.match_id, new.match_id);

  if v_organizer = coalesce(old.user_id, new.user_id) then
    if (tg_op = 'DELETE')
       or (tg_op = 'UPDATE' and new.status in ('left', 'no_show')) then
      raise exception 'organizer_cannot_leave'
        using errcode = 'P0001',
              hint = 'Cancela el partido con cancelMatch en su lugar.';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


ALTER FUNCTION "public"."prevent_organizer_leave"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_profile_matches_played"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.user_id, old.user_id);
  update public.profiles p
     set matches_played = sub.count
    from (
      select count(*)::int as count
      from public.match_participants
      where user_id = target_id and status = 'attended'
    ) sub
   where p.id = target_id;
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."refresh_profile_matches_played"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_profile_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.rated_id, old.rated_id);
  update public.profiles p
     set rating_count = sub.count,
         rating_avg   = sub.avg
    from (
      select
        count(*)::int                               as count,
        coalesce(avg(score)::numeric(3,2), 0)       as avg
      from public.ratings
      where rated_id = target_id
    ) sub
   where p.id = target_id;
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."refresh_profile_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_match_status_on_roster_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_match_id uuid := coalesce(new.match_id, old.match_id);
  v_count integer;
  v_max integer;
  v_status match_status;
begin
  select m.max_players, m.status into v_max, v_status
  from public.matches m
  where m.id = v_match_id;

  if not found then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Solo tocamos transiciones entre open y full; in_progress/completed/cancelled
  -- son estados "manuales" que no dependen del roster.
  if v_status not in ('open', 'full') then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select count(*) into v_count
  from public.match_participants
  where match_id = v_match_id and status = 'joined';

  if v_count >= v_max and v_status = 'open' then
    update public.matches set status = 'full' where id = v_match_id;
  elsif v_count < v_max and v_status = 'full' then
    update public.matches set status = 'open' where id = v_match_id;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


ALTER FUNCTION "public"."sync_match_status_on_roster_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profile_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE profiles
  SET
    rating_avg = (
      SELECT COALESCE(AVG(rating)::numeric(4,2), 0)
      FROM match_ratings WHERE rated_id = NEW.rated_id
    ),
    rating_count = (
      SELECT COUNT(*) FROM match_ratings WHERE rated_id = NEW.rated_id
    )
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_profile_rating"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cancha_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cancha_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "can_confirm" boolean DEFAULT true NOT NULL,
    "can_schedule" boolean DEFAULT false NOT NULL,
    "can_stats" boolean DEFAULT true NOT NULL,
    "can_clients" boolean DEFAULT false NOT NULL,
    "invited_by" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cancha_admins_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'staff'::"text"]))),
    CONSTRAINT "cancha_admins_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."cancha_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cancha_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cancha_id" "uuid" NOT NULL,
    "booked_by" "uuid" NOT NULL,
    "booking_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "status" "public"."booking_status" DEFAULT 'pendiente'::"public"."booking_status" NOT NULL,
    "match_id" "uuid",
    "total_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recurring_booking_id" "uuid",
    CONSTRAINT "valid_booking_times" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."cancha_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cancha_client_tags" (
    "cancha_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cancha_client_tags_tag_check" CHECK (("tag" = ANY (ARRAY['vip'::"text", 'frecuente'::"text", 'bloqueado'::"text"])))
);


ALTER TABLE "public"."cancha_client_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cancha_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cancha_id" "uuid" NOT NULL,
    "day_of_week" smallint NOT NULL,
    "opens_at" time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    "closes_at" time without time zone DEFAULT '22:00:00'::time without time zone NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    CONSTRAINT "cancha_schedules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "valid_schedule_times" CHECK (("closes_at" > "opens_at"))
);


ALTER TABLE "public"."cancha_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."canchas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sport_type" "public"."cancha_sport_type" DEFAULT 'futbol_5'::"public"."cancha_sport_type" NOT NULL,
    "capacity" integer DEFAULT 10 NOT NULL,
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "price_per_hour" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount_percent" numeric(5,2) DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "phone" "text",
    "whatsapp" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "canchas_capacity_check" CHECK (("capacity" > 0)),
    CONSTRAINT "canchas_discount_percent_check" CHECK ((("discount_percent" >= (0)::numeric) AND ("discount_percent" <= (100)::numeric))),
    CONSTRAINT "canchas_name_check" CHECK ((("char_length"("name") >= 2) AND ("char_length"("name") <= 100))),
    CONSTRAINT "canchas_price_per_hour_check" CHECK (("price_per_hour" >= (0)::numeric))
);


ALTER TABLE "public"."canchas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "reference_id" "text",
    "title" "text" NOT NULL,
    "subtitle" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_message_text" "text",
    "last_message_at" timestamp with time zone,
    "last_sender_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "conversations_type_check" CHECK (("type" = ANY (ARRAY['booking'::"text", 'match'::"text", 'tournament'::"text", 'friend'::"text", 'direct'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "addressee_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "friendships_check" CHECK (("requester_id" <> "addressee_id")),
    CONSTRAINT "friendships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_validation_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "email" "text",
    "age" "text",
    "main_sport" "text",
    "frequency" "text",
    "organizer_type" "text",
    "problems" "text",
    "beta_interest" boolean DEFAULT false,
    "tools" "jsonb" DEFAULT '[]'::"jsonb",
    "lost_money" boolean DEFAULT false,
    "searched_solution" boolean DEFAULT false,
    "digital_payment" boolean DEFAULT false,
    "bad_experience_unknowns" boolean DEFAULT false,
    "signals" "jsonb" DEFAULT '{}'::"jsonb",
    "role" "text",
    "pain_intensity" "text",
    "limited_venues_knowledge" boolean DEFAULT false,
    "coordination_time_hours" integer DEFAULT 0,
    "price_point" integer DEFAULT 0,
    "gender" "text"
);


ALTER TABLE "public"."market_validation_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invitee_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "match_invitations_check" CHECK (("inviter_id" <> "invitee_id")),
    CONSTRAINT "match_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."match_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_participants" (
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."participant_status" DEFAULT 'joined'::"public"."participant_status" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "rater_id" "uuid" NOT NULL,
    "rated_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "match_ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."match_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_waitlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "sport_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "skill_level" "public"."skill_level",
    "city" "text" NOT NULL,
    "location" "text" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "duration_minutes" integer DEFAULT 60 NOT NULL,
    "max_players" integer NOT NULL,
    "status" "public"."match_status" DEFAULT 'open'::"public"."match_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancha_booking_id" "uuid",
    "is_public" boolean DEFAULT true NOT NULL,
    CONSTRAINT "matches_city_length_check" CHECK ((("char_length"("city") >= 1) AND ("char_length"("city") <= 80))),
    CONSTRAINT "matches_description_length_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 2000))),
    CONSTRAINT "matches_duration_check" CHECK ((("duration_minutes" >= 1) AND ("duration_minutes" <= 600))),
    CONSTRAINT "matches_duration_minutes_check" CHECK (("duration_minutes" > 0)),
    CONSTRAINT "matches_location_length_check" CHECK ((("char_length"("location") >= 1) AND ("char_length"("location") <= 200))),
    CONSTRAINT "matches_max_players_check" CHECK (("max_players" >= 2)),
    CONSTRAINT "matches_title_length_check" CHECK ((("char_length"("title") >= 3) AND ("char_length"("title") <= 120)))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    CONSTRAINT "messages_content_check" CHECK ((("length"("content") >= 1) AND ("length"("content") <= 2000))),
    CONSTRAINT "messages_content_length_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 2000)))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "city" "text",
    "primary_sport_id" "text",
    "primary_skill_level" "public"."skill_level",
    "rating_avg" numeric(3,2) DEFAULT 0 NOT NULL,
    "rating_count" integer DEFAULT 0 NOT NULL,
    "matches_played" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "skill_pace" smallint DEFAULT 50 NOT NULL,
    "skill_shooting" smallint DEFAULT 50 NOT NULL,
    "skill_passing" smallint DEFAULT 50 NOT NULL,
    "skill_dribbling" smallint DEFAULT 50 NOT NULL,
    "skill_defending" smallint DEFAULT 50 NOT NULL,
    "skill_physical" smallint DEFAULT 50 NOT NULL,
    "position" "text",
    "banner_url" "text",
    "business_name" "text",
    "business_phone" "text",
    "business_whatsapp" "text",
    "business_website" "text",
    "preferred_foot" "text",
    CONSTRAINT "profiles_bio_length_check" CHECK ((("bio" IS NULL) OR ("char_length"("bio") <= 500))),
    CONSTRAINT "profiles_city_length_check" CHECK ((("city" IS NULL) OR ("char_length"("city") <= 80))),
    CONSTRAINT "profiles_full_name_length_check" CHECK ((("full_name" IS NULL) OR ("char_length"("full_name") <= 80)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "key" "text" NOT NULL,
    "count" integer DEFAULT 0 NOT NULL,
    "window_start" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "rater_id" "uuid" NOT NULL,
    "rated_id" "uuid" NOT NULL,
    "score" smallint NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ratings_check" CHECK (("rater_id" <> "rated_id")),
    CONSTRAINT "ratings_score_check" CHECK ((("score" >= 1) AND ("score" <= 5)))
);


ALTER TABLE "public"."ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cancha_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "day_of_week" smallint NOT NULL,
    "start_time" "text" NOT NULL,
    "end_time" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "price_per_session" numeric(10,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "confirmed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recurring_bookings_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "recurring_bookings_status_check" CHECK (("status" = ANY (ARRAY['pendiente'::"text", 'confirmada'::"text", 'cancelada'::"text", 'pausada'::"text"])))
);


ALTER TABLE "public"."recurring_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'player'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "sport_type" "text" DEFAULT 'futbol_5'::"text" NOT NULL,
    "city" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "max_members" smallint DEFAULT 20 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "header_color" "text" DEFAULT '#7c3aed'::"text",
    "jersey_color" "text" DEFAULT '#7c3aed'::"text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "is_player" boolean DEFAULT true NOT NULL,
    "is_promoter" boolean DEFAULT false NOT NULL,
    "is_cancha" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_roles_at_least_one_role" CHECK (("is_player" OR "is_promoter" OR "is_cancha"))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cancha_admins"
    ADD CONSTRAINT "cancha_admins_cancha_id_user_id_key" UNIQUE ("cancha_id", "user_id");



ALTER TABLE ONLY "public"."cancha_admins"
    ADD CONSTRAINT "cancha_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cancha_bookings"
    ADD CONSTRAINT "cancha_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cancha_client_tags"
    ADD CONSTRAINT "cancha_client_tags_pkey" PRIMARY KEY ("cancha_id", "user_id");



ALTER TABLE ONLY "public"."cancha_schedules"
    ADD CONSTRAINT "cancha_schedules_cancha_id_day_of_week_key" UNIQUE ("cancha_id", "day_of_week");



ALTER TABLE ONLY "public"."cancha_schedules"
    ADD CONSTRAINT "cancha_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canchas"
    ADD CONSTRAINT "canchas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_requester_id_addressee_id_key" UNIQUE ("requester_id", "addressee_id");



ALTER TABLE ONLY "public"."market_validation_responses"
    ADD CONSTRAINT "market_validation_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_invitations"
    ADD CONSTRAINT "match_invitations_match_id_invitee_id_key" UNIQUE ("match_id", "invitee_id");



ALTER TABLE ONLY "public"."match_invitations"
    ADD CONSTRAINT "match_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_pkey" PRIMARY KEY ("match_id", "user_id");



ALTER TABLE ONLY "public"."match_ratings"
    ADD CONSTRAINT "match_ratings_match_id_rater_id_rated_id_key" UNIQUE ("match_id", "rater_id", "rated_id");



ALTER TABLE ONLY "public"."match_ratings"
    ADD CONSTRAINT "match_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_waitlist"
    ADD CONSTRAINT "match_waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_waitlist"
    ADD CONSTRAINT "match_waitlist_unique" UNIQUE ("match_id", "user_id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_match_id_rater_id_rated_id_key" UNIQUE ("match_id", "rater_id", "rated_id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_bookings"
    ADD CONSTRAINT "recurring_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "ca_active" ON "public"."cancha_admins" USING "btree" ("user_id", "status");



CREATE INDEX "ca_cancha" ON "public"."cancha_admins" USING "btree" ("cancha_id");



CREATE INDEX "ca_user" ON "public"."cancha_admins" USING "btree" ("user_id");



CREATE INDEX "cancha_bookings_booked_by_idx" ON "public"."cancha_bookings" USING "btree" ("booked_by");



CREATE INDEX "cancha_bookings_cancha_date_idx" ON "public"."cancha_bookings" USING "btree" ("cancha_id", "booking_date");



CREATE UNIQUE INDEX "cancha_bookings_no_overlap" ON "public"."cancha_bookings" USING "btree" ("cancha_id", "booking_date", "start_time") WHERE ("status" <> 'cancelada'::"public"."booking_status");



CREATE INDEX "cancha_schedules_cancha_idx" ON "public"."cancha_schedules" USING "btree" ("cancha_id");



CREATE INDEX "canchas_active_idx" ON "public"."canchas" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "canchas_city_sport_idx" ON "public"."canchas" USING "btree" ("city", "sport_type");



CREATE INDEX "canchas_owner_idx" ON "public"."canchas" USING "btree" ("owner_id");



CREATE INDEX "cct_cancha" ON "public"."cancha_client_tags" USING "btree" ("cancha_id");



CREATE INDEX "conv_type_ref" ON "public"."conversations" USING "btree" ("type", "reference_id");



CREATE INDEX "conv_updated" ON "public"."conversations" USING "btree" ("updated_at" DESC);



CREATE INDEX "cp_user" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "friendships_addressee_idx" ON "public"."friendships" USING "btree" ("addressee_id");



CREATE INDEX "friendships_both_idx" ON "public"."friendships" USING "btree" ("requester_id", "addressee_id");



CREATE INDEX "friendships_requester_idx" ON "public"."friendships" USING "btree" ("requester_id");



CREATE INDEX "idx_match_waitlist_match_joined" ON "public"."match_waitlist" USING "btree" ("match_id", "joined_at");



CREATE INDEX "match_invitations_invitee_idx" ON "public"."match_invitations" USING "btree" ("invitee_id");



CREATE INDEX "match_invitations_inviter_idx" ON "public"."match_invitations" USING "btree" ("inviter_id");



CREATE INDEX "match_invitations_match_idx" ON "public"."match_invitations" USING "btree" ("match_id");



CREATE INDEX "match_participants_user_idx" ON "public"."match_participants" USING "btree" ("user_id");



CREATE INDEX "matches_city_sport_idx" ON "public"."matches" USING "btree" ("city", "sport_id");



CREATE INDEX "matches_organizer_idx" ON "public"."matches" USING "btree" ("organizer_id");



CREATE INDEX "matches_starts_at_idx" ON "public"."matches" USING "btree" ("starts_at");



CREATE INDEX "matches_status_idx" ON "public"."matches" USING "btree" ("status");



CREATE INDEX "msg_conv_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "profiles_city_sport_idx" ON "public"."profiles" USING "btree" ("city", "primary_sport_id");



CREATE INDEX "ratings_match_idx" ON "public"."ratings" USING "btree" ("match_id");



CREATE INDEX "ratings_rated_idx" ON "public"."ratings" USING "btree" ("rated_id");



CREATE INDEX "rb_cancha" ON "public"."recurring_bookings" USING "btree" ("cancha_id");



CREATE INDEX "rb_cancha_status" ON "public"."recurring_bookings" USING "btree" ("cancha_id", "status");



CREATE INDEX "rb_user" ON "public"."recurring_bookings" USING "btree" ("user_id");



CREATE INDEX "user_roles_cancha_idx" ON "public"."user_roles" USING "btree" ("is_cancha") WHERE ("is_cancha" = true);



CREATE INDEX "user_roles_player_idx" ON "public"."user_roles" USING "btree" ("is_player") WHERE ("is_player" = true);



CREATE INDEX "user_roles_promoter_idx" ON "public"."user_roles" USING "btree" ("is_promoter") WHERE ("is_promoter" = true);



CREATE OR REPLACE TRIGGER "match_participants_capacity" BEFORE INSERT ON "public"."match_participants" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_match_capacity"();



CREATE OR REPLACE TRIGGER "matches_set_updated_at" BEFORE UPDATE ON "public"."matches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "participants_refresh_profile" AFTER INSERT OR DELETE OR UPDATE ON "public"."match_participants" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_profile_matches_played"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "ratings_refresh_profile" AFTER INSERT OR DELETE OR UPDATE ON "public"."ratings" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_profile_rating"();



CREATE OR REPLACE TRIGGER "set_cancha_bookings_updated_at" BEFORE UPDATE ON "public"."cancha_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_canchas_updated_at" BEFORE UPDATE ON "public"."canchas" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_friendships_updated_at" BEFORE UPDATE ON "public"."friendships" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_match_invitations_updated_at" BEFORE UPDATE ON "public"."match_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_user_roles_updated_at" BEFORE UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tr_prevent_messages_on_closed" BEFORE INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_messages_on_closed_match"();



CREATE OR REPLACE TRIGGER "tr_prevent_organizer_leave" BEFORE DELETE OR UPDATE ON "public"."match_participants" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_organizer_leave"();



CREATE OR REPLACE TRIGGER "tr_sync_match_status" AFTER INSERT OR DELETE OR UPDATE ON "public"."match_participants" FOR EACH ROW EXECUTE FUNCTION "public"."sync_match_status_on_roster_change"();



CREATE OR REPLACE TRIGGER "trg_new_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."on_new_message"();



CREATE OR REPLACE TRIGGER "trg_update_profile_rating" AFTER INSERT OR UPDATE ON "public"."match_ratings" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_rating"();



ALTER TABLE ONLY "public"."cancha_admins"
    ADD CONSTRAINT "cancha_admins_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "public"."canchas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancha_admins"
    ADD CONSTRAINT "cancha_admins_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cancha_admins"
    ADD CONSTRAINT "cancha_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancha_bookings"
    ADD CONSTRAINT "cancha_bookings_booked_by_fkey" FOREIGN KEY ("booked_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancha_bookings"
    ADD CONSTRAINT "cancha_bookings_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "public"."canchas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancha_client_tags"
    ADD CONSTRAINT "cancha_client_tags_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "public"."canchas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancha_client_tags"
    ADD CONSTRAINT "cancha_client_tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cancha_client_tags"
    ADD CONSTRAINT "cancha_client_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cancha_schedules"
    ADD CONSTRAINT "cancha_schedules_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "public"."canchas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."canchas"
    ADD CONSTRAINT "canchas_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_last_sender_id_fkey" FOREIGN KEY ("last_sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cancha_bookings"
    ADD CONSTRAINT "fk_recurring_booking" FOREIGN KEY ("recurring_booking_id") REFERENCES "public"."recurring_bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_invitations"
    ADD CONSTRAINT "match_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_invitations"
    ADD CONSTRAINT "match_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_invitations"
    ADD CONSTRAINT "match_invitations_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_participants"
    ADD CONSTRAINT "match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_ratings"
    ADD CONSTRAINT "match_ratings_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_ratings"
    ADD CONSTRAINT "match_ratings_rated_id_fkey" FOREIGN KEY ("rated_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_ratings"
    ADD CONSTRAINT "match_ratings_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_waitlist"
    ADD CONSTRAINT "match_waitlist_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_waitlist"
    ADD CONSTRAINT "match_waitlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_primary_sport_id_fkey" FOREIGN KEY ("primary_sport_id") REFERENCES "public"."sports"("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_rated_id_fkey" FOREIGN KEY ("rated_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_bookings"
    ADD CONSTRAINT "recurring_bookings_cancha_id_fkey" FOREIGN KEY ("cancha_id") REFERENCES "public"."canchas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_bookings"
    ADD CONSTRAINT "recurring_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view ratings" ON "public"."match_ratings" FOR SELECT USING (true);



CREATE POLICY "Authenticated delete notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Owner reads cancha bookings" ON "public"."cancha_bookings" FOR SELECT USING ((("auth"."uid"() = "booked_by") OR (EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_bookings"."cancha_id") AND ("c"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Owner updates booking status" ON "public"."cancha_bookings" FOR UPDATE USING ((("auth"."uid"() = "booked_by") OR (EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_bookings"."cancha_id") AND ("c"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "Participants can insert ratings" ON "public"."match_ratings" FOR INSERT WITH CHECK (("auth"."uid"() = "rater_id"));



CREATE POLICY "Permitir Insercion Publica" ON "public"."market_validation_responses" FOR INSERT WITH CHECK (true);



CREATE POLICY "Raters can update their own" ON "public"."match_ratings" FOR UPDATE USING (("auth"."uid"() = "rater_id"));



CREATE POLICY "Users can join waitlist" ON "public"."match_waitlist" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave waitlist" ON "public"."match_waitlist" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert own bookings" ON "public"."cancha_bookings" FOR INSERT WITH CHECK (("auth"."uid"() = "booked_by"));



CREATE POLICY "Users read own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Waitlist visible to all authenticated" ON "public"."match_waitlist" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "admins_see_team" ON "public"."cancha_admins" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."cancha_admins" "ca"
  WHERE (("ca"."cancha_id" = "cancha_admins"."cancha_id") AND ("ca"."user_id" = "auth"."uid"()) AND ("ca"."status" = 'active'::"text")))));



ALTER TABLE "public"."cancha_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cancha_bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cancha_bookings_insert" ON "public"."cancha_bookings" FOR INSERT WITH CHECK (("booked_by" = "auth"."uid"()));



CREATE POLICY "cancha_bookings_select" ON "public"."cancha_bookings" FOR SELECT USING ((("booked_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_bookings"."cancha_id") AND ("c"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "cancha_bookings_update" ON "public"."cancha_bookings" FOR UPDATE USING ((("booked_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_bookings"."cancha_id") AND ("c"."owner_id" = "auth"."uid"()))))));



ALTER TABLE "public"."cancha_client_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cancha_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cancha_schedules_insert" ON "public"."cancha_schedules" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_schedules"."cancha_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "cancha_schedules_select" ON "public"."cancha_schedules" FOR SELECT USING (true);



CREATE POLICY "cancha_schedules_update" ON "public"."cancha_schedules" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_schedules"."cancha_id") AND ("c"."owner_id" = "auth"."uid"())))));



ALTER TABLE "public"."canchas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "canchas_delete" ON "public"."canchas" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "canchas_insert" ON "public"."canchas" FOR INSERT WITH CHECK ((("owner_id" = "auth"."uid"()) AND (COALESCE(( SELECT "user_roles"."is_cancha"
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"())), false) = true)));



CREATE POLICY "canchas_select" ON "public"."canchas" FOR SELECT USING ((("is_active" = true) OR ("owner_id" = "auth"."uid"())));



CREATE POLICY "canchas_update" ON "public"."canchas" FOR UPDATE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "cct_owner_delete" ON "public"."cancha_client_tags" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_client_tags"."cancha_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "cct_owner_insert" ON "public"."cancha_client_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_client_tags"."cancha_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "cct_owner_select" ON "public"."cancha_client_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_client_tags"."cancha_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "cct_owner_update" ON "public"."cancha_client_tags" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_client_tags"."cancha_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "conv_insert" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "conv_select" ON "public"."conversations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND ("cp"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cp_insert" ON "public"."conversation_participants" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "cp_select" ON "public"."conversation_participants" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "cp_update" ON "public"."conversation_participants" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "friendships_delete" ON "public"."friendships" FOR DELETE USING ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"())));



CREATE POLICY "friendships_insert" ON "public"."friendships" FOR INSERT WITH CHECK (("requester_id" = "auth"."uid"()));



CREATE POLICY "friendships_select" ON "public"."friendships" FOR SELECT USING ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"())));



CREATE POLICY "friendships_update" ON "public"."friendships" FOR UPDATE USING ((("requester_id" = "auth"."uid"()) OR ("addressee_id" = "auth"."uid"())));



ALTER TABLE "public"."market_validation_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "match_invitations_insert" ON "public"."match_invitations" FOR INSERT WITH CHECK ((("inviter_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "match_invitations"."match_id") AND ("m"."organizer_id" = "auth"."uid"()))))));



CREATE POLICY "match_invitations_select" ON "public"."match_invitations" FOR SELECT USING ((("inviter_id" = "auth"."uid"()) OR ("invitee_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."matches" "m"
  WHERE (("m"."id" = "match_invitations"."match_id") AND ("m"."organizer_id" = "auth"."uid"()))))));



CREATE POLICY "match_invitations_update" ON "public"."match_invitations" FOR UPDATE USING ((("invitee_id" = "auth"."uid"()) OR ("inviter_id" = "auth"."uid"())));



ALTER TABLE "public"."match_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_waitlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "matches_delete" ON "public"."matches" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "organizer_id"));



CREATE POLICY "matches_delete_own" ON "public"."matches" FOR DELETE USING (("auth"."uid"() = "organizer_id"));



CREATE POLICY "matches_insert" ON "public"."matches" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "organizer_id"));



CREATE POLICY "matches_insert_own" ON "public"."matches" FOR INSERT WITH CHECK (("auth"."uid"() = "organizer_id"));



CREATE POLICY "matches_read_authenticated" ON "public"."matches" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "matches_select" ON "public"."matches" FOR SELECT USING (("is_public" OR ("organizer_id" = "auth"."uid"())));



CREATE POLICY "matches_update" ON "public"."matches" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "organizer_id"));



CREATE POLICY "matches_update_own" ON "public"."matches" FOR UPDATE USING (("auth"."uid"() = "organizer_id")) WITH CHECK (("auth"."uid"() = "organizer_id"));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "msg_insert" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND (EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"()))))));



CREATE POLICY "msg_select" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owner_full_admins" ON "public"."cancha_admins" USING ((EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_admins"."cancha_id") AND ("c"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "cancha_admins"."cancha_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "participants_join_self" ON "public"."match_participants" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "participants_leave_self" ON "public"."match_participants" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "participants_read_authenticated" ON "public"."match_participants" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "participants_update_by_self_or_organizer" ON "public"."match_participants" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = ( SELECT "matches"."organizer_id"
   FROM "public"."matches"
  WHERE ("matches"."id" = "match_participants"."match_id"))))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = ( SELECT "matches"."organizer_id"
   FROM "public"."matches"
  WHERE ("matches"."id" = "match_participants"."match_id")))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_modify_own" ON "public"."profiles" TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_all" ON "public"."profiles" FOR SELECT USING (true);



ALTER TABLE "public"."ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ratings_insert_if_both_participated" ON "public"."ratings" FOR INSERT WITH CHECK ((("auth"."uid"() = "rater_id") AND (EXISTS ( SELECT 1
   FROM "public"."match_participants"
  WHERE (("match_participants"."match_id" = "ratings"."match_id") AND ("match_participants"."user_id" = "ratings"."rater_id")))) AND (EXISTS ( SELECT 1
   FROM "public"."match_participants"
  WHERE (("match_participants"."match_id" = "ratings"."match_id") AND ("match_participants"."user_id" = "ratings"."rated_id"))))));



CREATE POLICY "ratings_read_authenticated" ON "public"."ratings" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "rb_owner_select" ON "public"."recurring_bookings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "recurring_bookings"."cancha_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "rb_owner_update" ON "public"."recurring_bookings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."canchas" "c"
  WHERE (("c"."id" = "recurring_bookings"."cancha_id") AND ("c"."owner_id" = "auth"."uid"())))));



CREATE POLICY "rb_user_insert" ON "public"."recurring_bookings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "rb_user_select" ON "public"."recurring_bookings" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."recurring_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sports_read_all" ON "public"."sports" FOR SELECT USING (true);



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_delete" ON "public"."teams" FOR DELETE TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "teams_insert" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "teams_select" ON "public"."teams" FOR SELECT USING (("is_public" OR ("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."team_id" = "teams"."id") AND ("team_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "teams_update" ON "public"."teams" FOR UPDATE TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "tm_delete" ON "public"."team_members" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_members"."team_id") AND ("teams"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "tm_insert" ON "public"."team_members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."teams"
  WHERE (("teams"."id" = "team_members"."team_id") AND ("teams"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "tm_select" ON "public"."team_members" FOR SELECT USING (true);



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_select_own" ON "public"."user_roles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_roles_update_own" ON "public"."user_roles" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_see_own_entry" ON "public"."cancha_admins" FOR SELECT USING (("auth"."uid"() = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_key" "text", "p_max" integer, "p_window_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_match_capacity"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_match_capacity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_match_capacity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_recurring_instances"("p_recurring_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_recurring_instances"("p_recurring_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_recurring_instances"("p_recurring_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_new_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_new_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_new_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_messages_on_closed_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_messages_on_closed_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_messages_on_closed_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_organizer_leave"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_organizer_leave"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_organizer_leave"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_profile_matches_played"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_profile_matches_played"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_profile_matches_played"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_profile_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_profile_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_profile_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_match_status_on_roster_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_match_status_on_roster_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_match_status_on_roster_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profile_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_profile_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profile_rating"() TO "service_role";



GRANT ALL ON TABLE "public"."cancha_admins" TO "anon";
GRANT ALL ON TABLE "public"."cancha_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."cancha_admins" TO "service_role";



GRANT ALL ON TABLE "public"."cancha_bookings" TO "anon";
GRANT ALL ON TABLE "public"."cancha_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."cancha_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."cancha_client_tags" TO "anon";
GRANT ALL ON TABLE "public"."cancha_client_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."cancha_client_tags" TO "service_role";



GRANT ALL ON TABLE "public"."cancha_schedules" TO "anon";
GRANT ALL ON TABLE "public"."cancha_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."cancha_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."canchas" TO "anon";
GRANT ALL ON TABLE "public"."canchas" TO "authenticated";
GRANT ALL ON TABLE "public"."canchas" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."market_validation_responses" TO "anon";
GRANT ALL ON TABLE "public"."market_validation_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."market_validation_responses" TO "service_role";



GRANT ALL ON TABLE "public"."match_invitations" TO "anon";
GRANT ALL ON TABLE "public"."match_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."match_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."match_participants" TO "anon";
GRANT ALL ON TABLE "public"."match_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."match_participants" TO "service_role";



GRANT ALL ON TABLE "public"."match_ratings" TO "anon";
GRANT ALL ON TABLE "public"."match_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."match_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."match_waitlist" TO "anon";
GRANT ALL ON TABLE "public"."match_waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."match_waitlist" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."ratings" TO "anon";
GRANT ALL ON TABLE "public"."ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."ratings" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_bookings" TO "anon";
GRANT ALL ON TABLE "public"."recurring_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."sports" TO "anon";
GRANT ALL ON TABLE "public"."sports" TO "authenticated";
GRANT ALL ON TABLE "public"."sports" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







