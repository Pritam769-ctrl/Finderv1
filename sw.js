const CACHE_NAME = 'finder-v2-offline';
const URLs_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    // External Libraries (Must be cached for the app to look right offline)
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js'
];

// 1. Install: Cache core files immediately
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force this SW to become active immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(URLs_TO_CACHE);
        })
    );
});

// 2. Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control of all pages immediately
});

// 3. Fetch: The core offline logic
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // A) If found in cache, return it
            if (response) {
                return response;
            }

            // B) If not in cache, try to fetch from network
            return fetch(event.request).then((networkResponse) => {
                // Check if valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                    return networkResponse;
                }

                // C) Cache the new file for next time (Dynamic Caching)
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // D) Network failed (Offline). If it's a page load, serve index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});