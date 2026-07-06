"use strict";
// フビチェック Service Worker
// 方針: 同一オリジンGETはネットワーク優先+キャッシュ退避。
//       初回にアプリシェルをプリキャッシュし、オフライン時のナビゲーションは index.html へフォールバック。
const CACHE = "fubicheck-v2";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .catch(() => {})            // 一部取得失敗でもインストールは継続
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || req.method !== "GET") return; // API等はSW非介入
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (_) {
      const hit = await cache.match(req);
      if (hit) return hit;
      // オフラインでの画面遷移は index.html / ルートへフォールバック(末尾スラッシュ揺れに対応)
      if (req.mode === "navigate") {
        return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
      }
      return Response.error();
    }
  })());
});
