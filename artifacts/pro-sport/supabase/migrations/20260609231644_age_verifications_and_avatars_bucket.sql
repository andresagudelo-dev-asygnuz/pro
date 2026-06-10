-- Create age_verifications table
CREATE TABLE IF NOT EXISTS public.age_verifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    status text DEFAULT 'pendiente',
    storage_path text,
    mime_type text,
    file_size_bytes bigint,
    uploaded_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    rejection_reason text
);

ALTER TABLE public.age_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications"
ON public.age_verifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
ON public.age_verifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verifications"
ON public.age_verifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications"
ON public.age_verifications FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can update all verifications"
ON public.age_verifications FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_admin = true));

-- Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) VALUES ('age-verifications', 'age-verifications', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars
CREATE POLICY "Public avatars view" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policies for age-verifications
CREATE POLICY "Users can view own age verification docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'age-verifications' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload own age verification docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'age-verifications' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own age verification docs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'age-verifications' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can view all age verification docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'age-verifications' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_admin = true));
