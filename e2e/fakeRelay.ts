import type { BrowserContext, Route } from "@playwright/test";
import { handleBox } from "../relay/src/box.ts";
import { MemoryBoxStore } from "../relay/src/memoryStore.ts";
import { decodeFrame, encodeFrame, parseSyncRequest } from "../src/lib/syncWire.ts";

/**
 * The sync relay for the e2e: the relay's own code (relay/src/box.ts)
 * behind Playwright's routing, so nothing leaves the machine. With
 * SYNC_E2E_LIVE=1 the requests go on to the build's real relay instead
 * (`npm run dev` in relay/, the app built with
 * VITE_SYNC_RELAY_URL=http://localhost:8787); only failures on purpose
 * are faked then.
 */
export const LIVE_RELAY = process.env.SYNC_E2E_LIVE === "1";

/** One relay for the whole test, shared by every device. */
export function fakeRelay() {
  const boxes = new Map<string, MemoryBoxStore>();
  let failWith: "quota" | null = null;
  let requests = 0;
  async function handle(route: Route) {
    requests++;
    const request = route.request();
    const headers = {
      "Access-Control-Allow-Origin": (await request.headerValue("origin")) ?? "*",
      "Content-Type": "application/octet-stream",
    };
    if (failWith) {
      return route.fulfill({
        status: 503,
        headers,
        body: Buffer.from(encodeFrame({ ok: false, error: failWith, now: Date.now() })),
      });
    }
    if (LIVE_RELAY) return route.continue();
    const { header, payload } = decodeFrame(
      new Uint8Array(request.postDataBuffer() ?? Buffer.alloc(0)),
    );
    const parsed = parseSyncRequest(header, payload.length);
    if (!parsed) return route.fulfill({ status: 400, headers, body: "" });
    const { pass, ...rest } = parsed;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pass));
    const passHash = Buffer.from(digest).toString("hex");
    const store = boxes.get(parsed.box) ?? new MemoryBoxStore();
    boxes.set(parsed.box, store);
    const result = handleBox(store, { ...rest, passHash }, payload, {
      now: Date.now(),
      newEpoch: () => crypto.randomUUID(),
      wait: 0,
    });
    return route.fulfill({ status: result.status, headers, body: Buffer.from(result.frame) });
  }
  return {
    attach: (context: BrowserContext) => context.route(/\/v1$/, handle),
    fail: (error: "quota" | null) => {
      failWith = error;
    },
    /** Requests that reached the relay so far: each one counts against its daily allowance. */
    requests: () => requests,
    /** Rows the boxes wrote (the other daily allowance), when it's the fake one. */
    rowsWritten: () => [...boxes.values()].reduce((sum, box) => sum + box.rowsWritten, 0),
  };
}
