// KhoaiBonlingo Service Worker — offline support + instant repeat loads (PWA).
//
// Every same-origin static asset is versioned via a ?v= (code) or ?d= (data) query
// string, so a CACHE-FIRST strategy is safe: a new deploy produces a NEW URL, which is a
// cache miss, so the fresh file is fetched and cached. Stale code is therefore never
// served. The app shell (navigations) uses network-first so a fresh index.html — which
// points at the newest versioned assets — always wins when online, with a cached fallback
// when offline. Supabase / TTS / any cross-origin request is left untouched (network).
//
// Bump CACHE only for a hard reset of everything cached.
const CACHE = 'khoai-cache-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {})));
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    let url;
    try { url = new URL(req.url); } catch (e) { return; }
    // Only ever handle our OWN origin. Supabase REST/realtime, TTS voices, fonts, any CDN
    // — all go straight to the network so dynamic data is never cached.
    if (url.origin !== self.location.origin) return;

    // App shell / navigations: network-first (get the freshest index.html when online),
    // fall back to the cached shell when offline so the app still opens.
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const fresh = await fetch(req);
                const cache = await caches.open(CACHE);
                cache.put(req, fresh.clone());
                return fresh;
            } catch (e) {
                return (await caches.match(req)) || (await caches.match('./index.html')) || Response.error();
            }
        })());
        return;
    }

    // Everything else same-origin (versioned JS/CSS/data/images/sounds): cache-first.
    event.respondWith((async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
            const fresh = await fetch(req);
            // Only cache full, successful, same-origin (basic) responses.
            if (fresh && fresh.status === 200 && fresh.type === 'basic') {
                const cache = await caches.open(CACHE);
                cache.put(req, fresh.clone());
            }
            return fresh;
        } catch (e) {
            return cached || Response.error();
        }
    })());
});
