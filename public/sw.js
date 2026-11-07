/*
 * Quran Muallem – service worker for the installable web app (PWA / GitHub Pages / iOS Home Screen).
 * Not used inside the iOS/Android apps (Capacitor ships the files locally).
 *
 *  - install:  caches the app shell + every built JS/CSS file (precache.json, written by the build)
 *              + the Mushaf data and the phoneme lexicon → the app opens without internet.
 *  - "warm":   after the first start the page asks the worker to store the speech model
 *              (zipformer_p_arabic_v3.1.int8.onnx, ~70 MB) in the same cache the engine uses, so
 *              recitation works 100 % offline afterwards.
 *  - fetch:    same-origin files cache-first (any cache), pages network-first with the cached shell
 *              as offline fallback, HEAD requests answered from the cache (the engine checks its files
 *              with HEAD). Other origins (recitation audio, Quran.com) are left to the app.
 */
const SHELL_PREFIX = "qm-shell-";
const RUNTIME = "qm-runtime-v1";
const MODEL_CACHE = "quran-muallem-zipformer-v3.1"; // same name as src/lib/zipformer.worker.ts
const MODEL_FILES = ["models/zipformer_p_arabic_v3.1.int8.onnx", "models/tokens.txt", "models/quran_phonemes.json"];
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
  "mushaf/layout.json", "mushaf/words.json", "models/tokens.txt", "models/quran_phonemes.json",
];
const scopeUrl = (p) => new URL(p, self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    let version = "dev", files = [];
    try {
      const r = await fetch(scopeUrl("precache.json"), { cache: "no-store" });
      if (r.ok) ({ version, files } = await r.json());
    } catch { /* no build manifest (dev): shell only */ }
    const cache = await caches.open(SHELL_PREFIX + version);
    const urls = [...new Set([...SHELL, ...files])].map(scopeUrl);
    // One by one: a single missing file must not stop the installation.
    await Promise.all(urls.map((u) => cache.add(new Request(u, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const shells = keys.filter((k) => k.startsWith(SHELL_PREFIX));
    // Keep only the newest shell (the one just installed is last).
    await Promise.all(shells.slice(0, -1).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function warmModel() {
  const cache = await caches.open(MODEL_CACHE);
  for (const f of MODEL_FILES) {
    const url = scopeUrl(f);
    if (await caches.match(url)) continue;
    try { const r = await fetch(url); if (r.ok) await cache.put(url, r); } catch { /* offline: next start */ }
  }
}

self.addEventListener("message", (event) => {
  if (event.data === "warm") event.waitUntil(warmModel());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.method === "HEAD") {
    event.respondWith((async () => {
      const hit = await caches.match(req.url);
      if (hit) return new Response(null, { status: 200, headers: hit.headers });
      return fetch(req);
    })());
    return;
  }
  if (req.method !== "GET" || req.headers.has("range")) return;
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        return (await caches.match(scopeUrl("index.html"))) ?? (await caches.match(scopeUrl("./"))) ?? Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok && r.type === "basic" && !url.pathname.endsWith(".onnx")) {
      const copy = r.clone();
      caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
    }
    return r;
  })());
});
