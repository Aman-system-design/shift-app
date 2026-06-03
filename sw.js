const CACHE_NAME = 'shift-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './icon-maskable.svg'
];

// Install: cache all core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell, network-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Exclude API requests from being cached by the service worker
  if (url.origin === location.origin && !url.pathname.startsWith('/api')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});

// Push notification handler
self.addEventListener('push', e => {
  let data = { title: 'SHIFT', body: 'Report for duty!' };
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data = { title: 'SHIFT ALERT', body: e.data.text() };
    }
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.svg',
      badge: './icon-192.svg',
      vibrate: [200, 100, 200],
      tag: 'shift-alert',
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'clock-in', title: 'CLOCK IN' },
        { action: 'dismiss', title: 'DISMISS' }
      ]
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const action = e.action;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing window or open new
      for (const client of windowClients) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          client.focus();
          if (action === 'clock-in') {
            client.postMessage({ type: 'CLOCK_IN_FROM_NOTIFICATION' });
          }
          return;
        }
      }
      clients.openWindow('./');
    })
  );
});
