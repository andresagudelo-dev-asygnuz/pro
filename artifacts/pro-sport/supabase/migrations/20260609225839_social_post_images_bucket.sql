-- Create the bucket for social post media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post_media',
  'post_media',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policies for post_media bucket
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post_media');

CREATE POLICY "Users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post_media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post_media'
    AND auth.uid() = owner
  );

CREATE POLICY "Users can delete their own media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post_media'
    AND auth.uid() = owner
  );
