const CACHE_NAME = 'fleetcheck-v1'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/check/selecionar',
  '/check/hodometro',
  '/check/itens',
  '/check/chegada',
  '/check/concluido',
  '/manifest.json',
  '/LOGO_CONSULDATA.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  )
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, cross-origin API calls (Supabase, Anthropic)
  if (request.method !== 'GET') return
  if (url.hostname.includes('supabase') || url.hostname.includes('anthropic')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.startsWith('/_next/static') || STATIC_ASSETS.includes(url.pathname))) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || new Response('Sem conexão', { status: 503 })))
  )
})

// Background sync when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checklists') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_REQUESTED' }))
      })
    )
  }
})
