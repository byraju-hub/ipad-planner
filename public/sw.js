// 서비스 워커: 화면 파일을 기기에 저장해 오프라인에서도 열리게 한다. 서버(api) 요청은 저장하지 않는다.
const VERSION = 'v1';
const SHELL = `ip-shell-${VERSION}`;
const ASSETS = `ip-assets-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // 같은 도메인의 다른 앱 캐시는 건드리지 않고, 이 앱(ip-)의 지난 버전만 지운다
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ip-') && !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/api/')) return; // 일정·메모·로그인은 항상 서버로

  // 화면(HTML): 가능하면 최신, 오프라인이면 저장본
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // 빌드된 스크립트·스타일(파일 이름에 해시가 있어 바뀌면 새 이름): 저장본 우선
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // 아이콘·매니페스트: 저장본을 먼저 보여주고 뒤에서 갱신
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
