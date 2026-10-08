// Service worker de Vamo y vamo (decisión 047): que la app abra rápido con mala conexión y que
// el viaje y los pasajes ya vistos se puedan ver sin señal. No hay modo offline real: cargar o
// cambiar cosas necesita conexión (las acciones esperan y se reintentan solas, ver useOffline).
//
// - Archivos de la app (/_next/static): se guardan para siempre (cada versión tiene otro nombre).
// - Páginas (navegación y datos RSC): primero la red; si tarda más de 4 s o no hay señal, la
//   última versión guardada.
// - Pasajes y comprobantes (URLs firmadas de Supabase Storage): se guardan sin el token, así el
//   que ya abriste se ve sin conexión. Cada archivo tiene una ruta única, nunca cambia.
// - Mapa (OpenStreetMap) y fotos de ciudades (Wikipedia): lo guardado al toque y se actualiza atrás.
// - Todo lo demás (Supabase, login, acciones) va siempre a la red.

const VERSION = "v1";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const FILES = `files-${VERSION}`;
const MEDIA = `media-${VERSION}`;
const KEEP = [STATIC, PAGES, FILES, MEDIA];
const MAX_MEDIA = 400;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!KEEP.includes(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// Al salir de la cuenta, la app pide borrar las páginas y los archivos guardados.
self.addEventListener("message", (event) => {
  if (event.data === "clear-private") {
    event.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(FILES)]));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(request, STATIC));
    if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
    if (url.pathname.startsWith("/login") || url.pathname.startsWith("/auth")) return;
    if (request.mode === "navigate" || request.headers.get("RSC") === "1") {
      return event.respondWith(networkFirst(request, PAGES, 4000));
    }
    return; // íconos, manifest: el navegador ya los cachea
  }

  if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/storage/v1/object/sign/")) {
    return event.respondWith(signedFile(request, url));
  }
  if (url.hostname.endsWith("tile.openstreetmap.org") || url.hostname === "upload.wikimedia.org") {
    return event.respondWith(staleWhileRevalidate(request, MEDIA));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  // Los datos RSC dependen de la página de origen: se guardan con su header en la clave.
  const key = request.headers.get("RSC") === "1" ? `${request.url}#rsc` : request.url;
  const network = fetch(request).then((response) => {
    if (response.ok && !response.redirected) cache.put(key, response.clone());
    return response;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs, null));
  try {
    const fast = await Promise.race([network, timeout]);
    if (fast) return fast;
  } catch {
    // sin red: se usa lo guardado
  }
  const hit = await cache.match(key);
  if (hit) return hit;
  return network; // nada guardado: esperar a la red (o fallar como siempre)
}

async function signedFile(request, url) {
  const cache = await caches.open(FILES);
  const key = `${url.origin}${url.pathname}`; // sin ?token=: la ruta del archivo no cambia
  const hit = await cache.match(key);
  if (hit) return hit;
  // Siempre el archivo entero: pdf.js a veces pide pedazos (Range) y un 206 no se puede guardar.
  const response = await fetch(url.toString());
  if (response.status === 200) cache.put(key, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok || response.type === "opaque") {
        await cache.put(request, response.clone());
        trim(cache, MAX_MEDIA);
      }
      return response;
    })
    .catch(() => hit);
  return hit ?? network;
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
