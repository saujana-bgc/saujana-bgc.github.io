// Kill-switch: clears all caches and unregisters this service worker.
// Browsers that have the old PWA will fetch this, activate it, and clean up.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        await self.clients.claim()
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(n => caches.delete(n)))
        await self.registration.unregister()
    })())
})
