import {
  decodeFrame,
  encodeFrame,
  splitParts,
  type SyncFailure,
  type SyncReply,
  type SyncRequest,
} from "./syncWire";

/** What a call to the relay can come to besides an answer. */
export type RelayError = SyncFailure | "network" | "bad-reply";

export type RelayResult =
  | { ok: true; reply: Extract<SyncReply, { ok: true }>; parts: Uint8Array[] }
  | { ok: false; error: RelayError; retryAfter?: number };

/** How long a request may take: half a minute, and more for what it carries (a slow phone connection sends ~20 kB/s). */
export function relayTimeout(bytes: number): number {
  return Math.min(30_000 + bytes / 20, 5 * 60_000);
}

/** What a browser lets a request carry when it may outlive the page (`keepalive`). */
const KEEPALIVE_BYTES = 60 * 1024;

/**
 * One request to the relay. A "network" error is everything the browser
 * won't let us read: no connection, the relay down, or Cloudflare
 * answering for it (past the free daily allowance it does, without the
 * CORS header, so the app can't tell that apart from the relay being
 * down); and a request that hangs (a phone's connection that stalls),
 * given up past `relayTimeout` so the sync isn't stuck behind it.
 */
export async function callRelay(
  url: string,
  request: SyncRequest,
  payload?: Uint8Array,
  options: { keepalive?: boolean } = {},
): Promise<RelayResult> {
  const body = encodeFrame(request, payload && payload.length > 0 ? [payload] : []);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), relayTimeout(body.length));
  try {
    let response: Response;
    try {
      response = await fetch(`${url}/v1`, {
        method: "POST",
        // text/plain keeps it a "simple" request: no preflight.
        headers: { "Content-Type": "text/plain" },
        body,
        cache: "no-store",
        credentials: "omit",
        // Sent on leaving the app: it goes even if the app is closed right after (small ones only).
        keepalive: !!options.keepalive && body.length <= KEEPALIVE_BYTES,
        signal: controller.signal,
      });
    } catch {
      return { ok: false, error: "network" };
    }
    return await readReply(response);
  } catch {
    // The answer stopped halfway (the timeout covers reading it too).
    return { ok: false, error: "network" };
  } finally {
    clearTimeout(timer);
  }
}

async function readReply(response: Response): Promise<RelayResult> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  let reply: SyncReply;
  let parts: Uint8Array[] = [];
  try {
    const { header, payload: rest } = decodeFrame(bytes);
    if (!header || typeof header !== "object" || typeof (header as { ok?: unknown }).ok !== "boolean") throw new Error();
    reply = header as SyncReply;
    if (reply.ok && reply.op === "sync") {
      parts = splitParts(rest, [...(reply.snapshot !== null ? [reply.snapshot] : []), ...reply.ops.map((o) => o.size)]);
    }
  } catch {
    return { ok: false, error: response.status === 429 || response.status >= 500 ? "unavailable" : "bad-reply" };
  }
  if (!reply.ok) return { ok: false, error: reply.error, ...(reply.retryAfter ? { retryAfter: reply.retryAfter } : {}) };
  return { ok: true, reply, parts };
}
