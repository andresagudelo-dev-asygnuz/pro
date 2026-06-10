-- Migration: Social Feed (El Tercer Tiempo)
-- Description: Creates tables for posts, likes (puñitos), and comments

CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    cancha_id UUID REFERENCES public.canchas(id) ON DELETE SET NULL,
    content TEXT,
    media_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- Policies for posts
CREATE POLICY "Posts are viewable by everyone."
    ON public.posts FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own posts."
    ON public.posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts."
    ON public.posts FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts."
    ON public.posts FOR DELETE
    USING (auth.uid() = author_id);

-- Policies for post_likes
CREATE POLICY "Post likes are viewable by everyone."
    ON public.post_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own likes."
    ON public.post_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes."
    ON public.post_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for post_comments
CREATE POLICY "Post comments are viewable by everyone."
    ON public.post_comments FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own comments."
    ON public.post_comments FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments."
    ON public.post_comments FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments."
    ON public.post_comments FOR DELETE
    USING (auth.uid() = author_id);

-- Create updated_at trigger function if it doesn't exist (assuming handle_updated_at exists from previous migrations)
-- We will use a standard approach just in case
CREATE OR REPLACE FUNCTION update_social_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION update_social_timestamp();

CREATE TRIGGER update_post_comments_updated_at
    BEFORE UPDATE ON public.post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_social_timestamp();
