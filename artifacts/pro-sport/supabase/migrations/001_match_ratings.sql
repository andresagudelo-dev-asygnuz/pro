-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ewzpwldtaeaxtesimjau/sql

-- 1. match_ratings table
CREATE TABLE IF NOT EXISTS match_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, rater_id, rated_id)
);

ALTER TABLE match_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can insert ratings"
  ON match_ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Anyone can view ratings"
  ON match_ratings FOR SELECT
  USING (true);

CREATE POLICY "Raters can update their own"
  ON match_ratings FOR UPDATE
  USING (auth.uid() = rater_id);

-- 2. Trigger to recalculate profile rating after each insert/update
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_profile_rating ON match_ratings;
CREATE TRIGGER trg_update_profile_rating
  AFTER INSERT OR UPDATE ON match_ratings
  FOR EACH ROW EXECUTE FUNCTION update_profile_rating();

-- 3. Storage bucket for avatars (run separately or via Dashboard)
-- Dashboard → Storage → New bucket → Name: avatars → Public: ON
-- Then add this policy:
-- CREATE POLICY "Users can upload their own avatar"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Anyone can view avatars"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');
-- CREATE POLICY "Users can update their own avatar"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
