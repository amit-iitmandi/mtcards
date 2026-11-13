// Retire the image worker so existing visitors resume normal browser image loading.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await caches.delete('mtcards-cloudinary-photos-v1').catch(() => {});
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
