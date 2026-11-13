const CACHE_NAME = 'mtcards-cloudinary-photos-v1';
const MAX_IMAGES = 48;
const DAY_MS = 24 * 60 * 60 * 1000;
const inFlight = new Map();
let writeQueue = Promise.resolve();

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.destination !== 'image' ||
      url.origin !== 'https://res.cloudinary.com' ||
      !/^\/[^/]+\/image\/upload\//.test(url.pathname)) return;

  const key = request.mode + ':' + request.url;
  let pending = inFlight.get(key);
  if (!pending) {
    pending = loadImage(request).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  event.respondWith(pending.then(response => response.clone()));
});

async function loadImage(request) {
  let cache;
  // Keep separate entries for ordinary image tags and CORS-enabled image requests.
  const cacheKey = new URL('/__card-image-cache', self.location.origin);
  cacheKey.searchParams.set('url', request.url);
  cacheKey.searchParams.set('mode', request.mode);
  try {
    cache = await caches.open(CACHE_NAME);
    const day = Math.floor(Date.now() / DAY_MS);
    const currentKey = new URL(cacheKey);
    currentKey.searchParams.set('day', day);
    const match = await cache.match(currentKey);
    if (match) return match;
    cacheKey.searchParams.set('day', day);
  } catch {
    // Storage restrictions must not block image delivery.
  }

  // Read the response status so broken images never enter the cache.
  // For hosts that disallow CORS, retain the original browser image request.
  const response = request.mode === 'no-cors' && cache
    ? await fetch(request.url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(request))
    : await fetch(request);
  if (cache && response.ok) {
    const copy = response.clone();
    writeQueue = writeQueue.then(async () => {
      const keys = await cache.keys();
      const excess = Math.max(0, keys.length - MAX_IMAGES + 1);
      await Promise.all(keys.slice(0, excess).map(key => cache.delete(key)));
      await cache.put(cacheKey, copy);
    }).catch(() => {});
    await writeQueue;
  }
  return response;
}
