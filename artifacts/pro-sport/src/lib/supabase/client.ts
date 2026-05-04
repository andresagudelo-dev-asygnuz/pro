import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!_client) {
    const url =
      import.meta.env.VITE_SUPABASE_URL ||
      import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    _client = createBrowserClient(url, key, {
      cookies: {
        get(name: string) {
          try {
            return localStorage.getItem(`sb_cookie_${name}`) ?? undefined;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string) {
          try {
            localStorage.setItem(`sb_cookie_${name}`, value);
          } catch {}
        },
        remove(name: string) {
          try {
            localStorage.removeItem(`sb_cookie_${name}`);
          } catch {}
        },
      },
    });
  }
  return _client;
}
