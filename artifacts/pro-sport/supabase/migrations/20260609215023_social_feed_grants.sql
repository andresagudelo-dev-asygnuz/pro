-- Grant access to public/anon/authenticated
GRANT ALL ON TABLE public.posts TO anon, authenticated;
GRANT ALL ON TABLE public.post_likes TO anon, authenticated;
GRANT ALL ON TABLE public.post_comments TO anon, authenticated;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
