/**
 * Service Worker: cachea modelos de HuggingFace para uso offline.
 * Intercepta requests a huggingface.co y cdn-lfs, sirve desde cache si existe.
 */

const CACHE_NAME = 'model-cache-v1';
const HF_DOMAINS = ['huggingface.co', 'cdn-lfs.huggingface.co', 'cdn-lfs-us-1.huggingface.co'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo interceptar requests a HuggingFace
  if (!HF_DOMAINS.some(d => url.hostname.includes(d))) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Intentar servir desde cache
      const cached = await cache.match(event.request);
      if (cached) {
        return cached;
      }

      // No esta en cache — descargar y cachear
      const response = await fetch(event.request);

      // Solo cachear respuestas exitosas y archivos grandes (modelos)
      if (response.ok && response.status === 200) {
        // Clonar antes de cachear (el body solo se puede leer una vez)
        cache.put(event.request, response.clone());
      }

      return response;
    })
  );
});
