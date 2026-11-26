/*
 * Files shared to the installed app (the manifest's `share_target`:
 * Android's share sheet, "Send" from another app). The system posts them
 * here as a form; the service worker keeps them in a cache of their own
 * and sends the app to `#/?compartido`, where it takes them out
 * (src/lib/incomingFiles.ts, keep the names in step) and shows what each
 * one is before anything is imported (src/lib/fileImport.ts).
 *
 * Loaded into the service worker by workbox's `importScripts`
 * (vite.config.ts). Nothing leaves the device: the files go from the
 * form straight into this origin's cache.
 */

const SHARED_CACHE = "solo-compass-shared-files";
// Never more than the app will open, nor anything near this big
// (fileImport.ts refuses past 64 MB anyway).
const MAX_FILES = 10;
const MAX_BYTES = 64 * 1024 * 1024;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "POST") return;
  const target = new URL("share-target", self.registration.scope);
  if (new URL(request.url).pathname !== target.pathname) return;

  event.respondWith(
    (async () => {
      try {
        const form = await request.formData();
        const files = form
          .getAll("file")
          .filter((value) => typeof value === "object" && value !== null && "arrayBuffer" in value)
          .slice(0, MAX_FILES);
        await caches.delete(SHARED_CACHE);
        const cache = await caches.open(SHARED_CACHE);
        let index = 0;
        for (const file of files) {
          if (file.size > MAX_BYTES) continue;
          await cache.put(
            new Request(new URL(`shared-file/${index++}`, self.registration.scope)),
            new Response(file, {
              headers: {
                "x-file-name": encodeURIComponent(file.name || ""),
                "x-file-type": file.type || "",
              },
            }),
          );
        }
      } catch {
        // Nothing readable came: the app opens as usual.
      }
      return Response.redirect(new URL("./#/?compartido", self.registration.scope).href, 303);
    })(),
  );
});
