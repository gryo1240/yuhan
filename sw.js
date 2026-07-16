const CACHE = "yuhan-v3";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("yuhan-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // iframe埋め込み時、一部ブラウザ(iOS Safari等)ではフレーム内ナビゲーションが
  // mode:"navigate"と判定されないことがあり、その場合下のcache-first処理に落ちて
  // 古いindex.htmlが返り続ける不具合があったため、URLでも判定するように追加(2026-07-17)
  const isDocRequest = e.request.mode === "navigate" || e.request.url.endsWith("/") || e.request.url.endsWith("/index.html");
  if (isDocRequest) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", clone));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
