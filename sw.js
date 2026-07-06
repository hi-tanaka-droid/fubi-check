"use strict";
// フビチェック Service Worker: ネットワーク優先+キャッシュ退避(オフラインでも起動できる)
const CACHE = "fubicheck-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== "GET") return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (_) {
      const hit = await cache.match(e.request);
      return hit || Response.error();
    }
  })());
});
