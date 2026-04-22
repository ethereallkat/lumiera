const CACHE_NAME = "lumiera-cache-v1";
const BASE_URL = self.registration.scope;

// Daftar aset yang harus di-cache untuk penggunaan offline
const urlsToCache = [
  `${BASE_URL}`,
  `${BASE_URL}index.html`,
  `${BASE_URL}manifest.json`,
  // Aset Ikon sesuai manifest.json
  `${BASE_URL}icons/icon-192x192-A.png`,
  `${BASE_URL}icons/icon-512x512-B.png`,
  `${BASE_URL}icons/screenshot1.png`,
  `${BASE_URL}icons/screenshot2.png`,
  // Font eksternal di-cache oleh browser, 
  // namun kita pastikan shell aplikasi utama tersedia
];

// Install Service Worker & simpan file ke cache
self.addEventListener("install", event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("Caching app shell...");
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error("Cache gagal dimuat:", err))
  );
});

// Aktivasi: Hapus cache lama jika CACHE_NAME berubah
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("Menghapus cache lama:", key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// Strategi Fetch: Cache First, falling back to Network
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Abaikan permintaan non-GET atau chrome-extension
  if (request.method !== "GET" || url.protocol.startsWith("chrome-extension")) return;

  event.respondWith(
    caches.match(request).then(response => {
      // Kembalikan dari cache jika ada, jika tidak ambil dari network
      return response || fetch(request).then(networkResponse => {
        // Simpan aset baru ke cache secara dinamis (opsional)
        return networkResponse;
      });
    }).catch(() => {
      // Jika offline dan aset tidak ada di cache, arahkan ke index.html sebagai fallback
      if (request.mode === 'navigate') {
        return caches.match(`${BASE_URL}index.html`);
      }
    })
  );
});