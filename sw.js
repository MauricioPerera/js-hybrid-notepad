/**
 * Service Worker: cache completo para funcionamiento 100% offline.
 * Cachea: modelos HuggingFace, Transformers.js, ONNX Runtime, y la app.
 */

const CACHE_NAME = 'notepad-cache-v11';

// Archivos de la app que se pre-cachean en install
const APP_FILES = [
  '/',
  '/index.html',
  '/js-vector-store.js',
  '/js-doc-store.js',
  '/manifest.json',
  '/icon.svg',
];

// Dominios que deben cachearse (modelos, libs, WASM)
const CACHE_DOMAINS = [
  'huggingface.co',
  'cdn-lfs.huggingface.co',
  'cdn-lfs-us-1.huggingface.co',
  'cdn.jsdelivr.net',    // Transformers.js lib
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Limpiar caches viejos
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo GET requests
  if (event.request.method !== 'GET') return;

  const isAppFile = url.origin === self.location.origin;
  const isCacheDomain = CACHE_DOMAINS.some(d => url.hostname.includes(d));

  if (!isAppFile && !isCacheDomain) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (err) {
        // Offline y no esta en cache — solo para app files, retornar index
        if (isAppFile) {
          const fallback = await cache.match('/index.html');
          if (fallback) return fallback;
        }
        throw err;
      }
    })
  );
});
