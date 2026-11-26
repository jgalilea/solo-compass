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
 *
 * Any web page can post a form here, not only the system's share
 * sheet (they can't be told apart): what comes is never imported by
 * itself, the app shows it and asks, and says it came shared. Here it
 * only has limits, so it can't fill the device.
 */

const SHARED_CACHE = "solo-compass-shared-files";
// Never more than the app will open, nor anything near this big, in
// all (fileImport.ts refuses a file past 64 MB anyway).
const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;

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
        let total = 0;
        for (const file of files) {
          if (total + file.size > MAX_TOTAL_BYTES) continue;
          total += file.size;
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
