/* ══════════════════════════════════════════════════════════
   해태렌트카 — Service Worker (캐시 + 오프라인 fallback)
   ──────────────────────────────────────────────────────────
   · 정적 자산(CSS/JS/이미지/폰트): Cache-First (즉시 응답, 백그라운드 갱신)
   · HTML 페이지: Network-First (최신 콘텐츠 우선, 네트워크 실패 시 캐시)
   · API 호출(/api/*): 캐시하지 않음 (항상 네트워크)
   · 오프라인 시 캐시 미스 → /404.html 로 fallback
   ══════════════════════════════════════════════════════════ */

const SW_VERSION = 'v1.0.0';
const PRECACHE = `haetae-precache-${SW_VERSION}`;
const RUNTIME  = `haetae-runtime-${SW_VERSION}`;

// 설치 시 미리 캐시할 핵심 자산 (오프라인 최소 동작 보장)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/common.css',
  '/js/common.js',
  '/js/seo-schema.js',
  '/includes/header.html',
  '/includes/footer.html',
  '/404.html',
  '/500.html',
  '/images/logo.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/favicon.ico',
  '/site.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== PRECACHE && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Same-origin 만 처리 (외부 폰트/지도 등은 브라우저 캐시에 맡김)
  if (url.origin !== location.origin) return;

  // 2) API 는 캐시 우회 — 항상 네트워크
  if (url.pathname.startsWith('/api/')) return;

  // 3) 관리자 페이지 캐시 금지 (CSP·no-cache 정책과 일치)
  if (url.pathname.startsWith('/admin/')) return;

  // 4) HTML 페이지 — Network-First
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // 200 OK 인 경우만 runtime 캐시에 보관
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/404.html')))
    );
    return;
  }

  // 5) 정적 자산 — Cache-First (백그라운드 갱신)
  event.respondWith(
    caches.match(req).then((cached) => {
      const networked = fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || networked;
    })
  );
});
