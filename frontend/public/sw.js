/* ================================================================
   Service Worker — 월계고 에타 (최종 안정화 버전)
   ================================================================ */

const CACHE_NAME = 'wolgyetime-v2'
const OFFLINE_URL = '/offline.html'

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
]

/* ── 설치 ── */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

/* ── 활성화 ── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

/* ── fetch ── */
self.addEventListener('fetch', (e) => {
  const { request } = e

  // 🚨 chrome-extension 같은 거 필터링 (에러 방지)
  if (!request.url.startsWith('http')) return

  const url = new URL(request.url)

  // 🚨 API 요청은 무조건 네트워크 (CORS 안전)
  if (url.pathname.startsWith('/api')) {
    e.respondWith(fetch(request))
    return
  }

  // 🚫 GET 아닌 요청은 건드리지 않음
  if (request.method !== 'GET') return

  // 📦 정적 파일 → Cache First
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf)$/)) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached

        return fetch(request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // 🌐 HTML → Network First
  if (request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return res
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match(OFFLINE_URL)
        })
    )
  }
})