/*
 * Service worker mínimo, a propósito.
 *
 * REGLA DE ORO: nunca se cachea una navegación. El producto entero se apoya en
 * decir la verdad sobre quién está abierto, y ese estado lo calcula el servidor
 * en cada request. Un HTML servido desde caché podría decir "abierto" un sábado
 * — exactamente el error que no nos podemos permitir.
 *
 * Lo único que se cachea son los assets con hash en el nombre (`/_next/static/`),
 * que por definición no cambian de contenido.
 */

const VERSION = "v1";
const STATIC_CACHE = `kod-static-${VERSION}`;
const OFFLINE_URL = "/sin-conexion.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: siempre a la red. Si no hay red, una página que lo dice.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL, { ignoreSearch: true })),
    );
    return;
  }

  // Assets con hash inmutable: caché primero, y se guarda al vuelo.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }

  // Todo lo demás (API, /ir, imágenes remotas) pasa derecho a la red.
});
