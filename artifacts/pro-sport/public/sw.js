// PRO. Service Worker
// Handles caching, push notifications, and background sync

const CACHE_NAME = 'pro-sport-v1';
const STATIC_ASSETS = [
  '/',
  '/feed',
];

// ── Install: pre-cache shell ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently fail on individual assets
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Network-first for API, Cache-first for assets ─────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache: Supabase API calls, auth, realtime
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/auth') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML navigation (SPA shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }
});

// ── Push Notifications ───────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {
    title: 'PRO.',
    body: 'Tenés una nueva notificación',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'pro-notification',
    data: { url: '/feed' },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: payload.data,
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

// ── Notification click: open/focus app ──────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/feed';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If app is already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
