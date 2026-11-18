/*
 * Rutina 2.0 — Service Worker offline shell.
 * Plain JS, no build step. Strategi:
 * - install   : precache app shell ('/' + manifest) aset-per-aset agar
 *               satu 404 tidak membatalkan seluruh instalasi.
 * - activate  : bersihkan cache versi lama, klaim klien aktif.
 * - fetch     : navigasi → network-first (fallback shell offline);
 *               aset statis same-origin → stale-while-revalidate;
 *               /api/** → network-only (data selalu segar; aplikasi
 *               sudah offline-first lewat localStorage).
 * Setiap operasi cache dibungkus aman — handler fetch tidak pernah
 * melempar error karena kegagalan cache.
 */

const VERSION = 'rutina-2.0-v1'
const SHELL_CACHE = VERSION + '-shell'
const STATIC_CACHE = VERSION + '-static'

/* Aset shell — di-cache individual dengan catch (manifest bisa 404
   tergantung versi Next; jangan gagal atomik seperti cache.addAll). */
const SHELL_ASSETS = ['/', '/manifest.webmanifest']

/* Prefiks berkas statis same-origin yang aman di-cache. */
const STATIC_PREFIXES = ['/_next/static/', '/icons/']
const STATIC_FILES = ['/logo.svg', '/manifest.webmanifest', '/favicon.ico']

function isStaticAsset(url, destination) {
  if (STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) return true
  if (STATIC_FILES.indexOf(url.pathname) !== -1) return true
  return (
    destination === 'image' ||
    destination === 'font' ||
    destination === 'style' ||
    destination === 'script'
  )
}

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE)
  await Promise.all(
    SHELL_ASSETS.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }))
        if (res && res.ok) await cache.put(url, res)
      } catch (err) {
        /* Aset opsional — 404/jaringan gagal tidak menggagalkan instalasi. */
      }
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await precacheShell()
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k.indexOf(VERSION) !== 0)
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

/* Navigasi — network-first; saat offline jatuh ke cache halaman atau
   shell '/'. Respons sukses dikloning ke SHELL_CACHE. */
async function handleNavigation(request) {
  try {
    const fresh = await fetch(request)
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(request, fresh.clone()).catch(() => {})
    }
    return fresh
  } catch (err) {
    const cached =
      (await caches.match(request)) || (await caches.match('/'))
    return cached || Response.error()
  }
}

/* Aset statis — stale-while-revalidate: sajikan cache bila ada,
   perbarui cache di latar belakang. */
async function handleStatic(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((res) => {
      if (res && res.status === 200) {
        cache.put(request, res.clone()).catch(() => {})
      }
      return res
    })
    .catch(() => null)
  if (cached) return cached
  const fresh = await network
  return fresh || Response.error()
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  /* Lintasan bebas: lintas origin & API tidak dihalangi (API selalu
    network-only — data keuangan/kebiasaan harus segar). */
  if (url.origin !== self.location.origin) return
  if (url.pathname.indexOf('/api/') === 0) return

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(req))
    return
  }
  if (isStaticAsset(url, req.destination)) {
    event.respondWith(handleStatic(req))
  }
  /* Permintaan same-origin lainnya (RSC, dsb.) dibiarkan lewat. */
})
