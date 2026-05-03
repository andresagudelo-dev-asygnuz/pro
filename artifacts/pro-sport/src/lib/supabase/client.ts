import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!_client) {
    // Use localStorage-backed cookie shim so session persists correctly
    // in Replit's proxied/iframe environment (document.cookie is unreliable there).
    _client = createBrowserClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!,
      {
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
      },
    );
  }
  return _client;
}
