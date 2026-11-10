/* Public offline shell only. Never cache APIs, signed-in pages, evidence or bearer links. */
const VERSION = "pumpshield-field-v4";
const SHELL = "/offline";
const ASSETS = [
  SHELL,
  "/manifest.webmanifest",
  "/brand/mark.svg",
  "/brand/icon-192.png",
  "/brand/icon-512.png",
  "/icon.svg",
  "/favicon.ico",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("pumpshield-field-") && key !== VERSION,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/gate/") ||
    url.pathname.startsWith("/auth/") ||

    url.pathname.startsWith("/app/") ||
    url.pathname === "/login"
  )
    return;
  if (request.mode === "navigate" && (url.pathname === SHELL || url.pathname === "/app")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (
            url.pathname === SHELL && response.ok &&
            response.headers.get("content-type")?.includes("text/html")
          ) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(VERSION).then((cache) => cache.put(SHELL, copy)),
            );
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(SHELL);
          return (
            cached ||
            new Response(
              "Open PumpShield online once to prepare this device.",
              { status: 503, headers: { "Content-Type": "text/plain" } },
            )
          );
        }),
    );
    return;
  }
  if (
    publicAsset(url) ||
    (ASSETS.includes(url.pathname) && url.pathname !== SHELL)
  ) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const found = await cache.match(request, {
          ignoreSearch: ASSETS.includes(url.pathname),
        });
        if (found) return found;
        const response = await fetch(request);
        if (response.ok && response.type === "basic")
          await cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
function publicAsset(url) {
  return (
    url.origin === self.location.origin &&
    /^\/_next\/static\/[a-zA-Z0-9_./-]+\.(js|css|woff2)$/.test(url.pathname) &&
    !url.pathname.includes("..")
  );
}
self.addEventListener("message", (event) => {
  if (
    event.data?.type !== "CACHE_PUBLIC_ASSETS" ||
    !Array.isArray(event.data.urls)
  )
    return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      const urls = [...new Set(event.data.urls)]
        .slice(0, 100)
        .map((value) => new URL(value, self.location.origin))
        .filter(publicAsset);
      for (const url of urls) {
        const response = await fetch(url.href, { credentials: "omit" });
        if (!response.ok)
          throw new Error("An offline asset could not be prepared");
        await cache.put(url.href, response);
      }
      event.ports[0]?.postMessage({ ready: true, count: urls.length });
    })().catch(() => event.ports[0]?.postMessage({ ready: false })),
  );
});
