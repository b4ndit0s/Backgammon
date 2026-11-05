/* Gammon Ledger service worker — build f6531e8c0e, Firebase SDK 12.19.0 */
const CACHE = "gammon-f6531e8c0e";
const FONTS = "gammon-fonts";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./firebase-config.js", "./backend-firebase.js",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/maskable-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png",
  "./vendor/firebase-app-compat.js", "./vendor/firebase-auth-compat.js", "./vendor/firebase-firestore-compat.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // Firebase traffic and anything else off-site goes straight to the network.
  if (url.origin !== location.origin) return;

  // Versioned files never change under the same name: cache first.
  if (url.pathname.includes("/vendor/") || url.pathname.includes("/icons/")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  // The page, its settings and scripts: network first so edits show up, cache offline.
  e.respondWith(
    fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, copy)); }
      return r;
    }).catch(() => caches.match(req.mode === "navigate" ? "./index.html" : req))
  );
});
