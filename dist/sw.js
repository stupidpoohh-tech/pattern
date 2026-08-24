// 오프라인 지원 service worker. 아래 캐시 이름의 자리표시자는 빌드 시 앱 해시로 치환된다.
const CACHE = "han-georeum-feb89a1c9d";
const ASSETS = [
  "./",
  "index.html",
  "app.js",
  "styles.css",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // 캐시 우선 (지정 경로 ?mode=path… 도 캐시된 index.html로 동작하도록 ignoreSearch)
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return res;
          })
          .catch(() => caches.match("index.html"))
    )
  );
});
