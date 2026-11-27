/**
 * Solo Compass's sync relay: a Cloudflare Worker that hands each request
 * to the Durable Object of its box (one per player's set of devices).
 * It keeps no secret of its own and can't read what it stores: the app
 * seals everything before sending it (src/lib/syncCrypto.ts). Its code
 * is public on purpose; see relay/README.md for deploying it.
 */

import { DurableObject } from "cloudflare:workers";
import { handleBox, type BoxRequest, type BoxResult } from "./box.ts";
import { SqlBoxStore } from "./sqlStore.ts";
import {
  MAX_REQUEST_BYTES,
  decodeFrame,
  encodeFrame,
  parseSyncRequest,
  type SyncFailure,
} from "../../src/lib/syncWire.ts";

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  BOXES: DurableObjectNamespace<SyncBox>;
  /** The app's origins, comma-separated (https://….github.io, http://localhost:5173 in development). */
  ALLOWED_ORIGINS: string;
  /** Seconds devices are asked to wait before coming back on their own ("0": no limit). */
  MIN_WAIT?: string;
  /** Optional: new boxes per IP per minute (see wrangler.jsonc). */
  NEW_BOXES?: RateLimit;
}

const HEADER_ROOM = 16 * 1024;

function failureResponse(
  status: number,
  error: SyncFailure,
  cors: HeadersInit,
  retryAfter?: number,
): Response {
  const reply = { ok: false, error, now: Date.now(), ...(retryAfter ? { retryAfter } : {}) };
  return new Response(encodeFrame(reply), {
    status,
    headers: { ...cors, "Content-Type": "application/octet-stream", "Cache-Control": "no-store" },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    const allowed = env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .includes(origin);
    const cors: Record<string, string> = allowed
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : { Vary: "Origin" };

    if (url.pathname !== "/v1") {
      return new Response("Solo Compass sync relay\n", {
        status: url.pathname === "/" ? 200 : 404,
      });
    }
    // The app only sends simple requests; this is for anything else that asks.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    if (request.method !== "POST")
      return new Response(null, { status: 405, headers: { Allow: "POST" } });
    if (!allowed) return failureResponse(403, "origin", cors);

    const declared = Number(request.headers.get("Content-Length") ?? "0");
    if (declared > MAX_REQUEST_BYTES + HEADER_ROOM) return failureResponse(413, "full", cors);
    const body = new Uint8Array(await request.arrayBuffer());
    if (body.length > MAX_REQUEST_BYTES + HEADER_ROOM) return failureResponse(413, "full", cors);

    let parsed;
    try {
      const { header, payload } = decodeFrame(body);
      const req = parseSyncRequest(header, payload.length);
      if (!req) return failureResponse(400, "bad-request", cors);
      parsed = { req, payload };
    } catch {
      return failureResponse(400, "bad-request", cors);
    }

    const { pass, ...rest } = parsed.req;
    const boxRequest = { ...rest, passHash: await sha256Hex(pass) } as BoxRequest;
    try {
      const box = env.BOXES.get(env.BOXES.idFromName(parsed.req.box));
      const ip = request.headers.get("CF-Connecting-IP") ?? "";
      const result = await box.handle(boxRequest, parsed.payload, ip);
      return new Response(result.frame, {
        status: result.status,
        headers: {
          ...cors,
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      // The Durable Objects' free daily allowance, used up, throws here.
      const quota = /exceeded|limit|quota/i.test(String(error));
      return failureResponse(503, quota ? "quota" : "unavailable", cors, quota ? undefined : 60);
    }
  },
} satisfies ExportedHandler<Env>;

/** One box: its changes and snapshot in its own SQLite database. */
export class SyncBox extends DurableObject<Env> {
  private store: SqlBoxStore;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.store = new SqlBoxStore(ctx.storage.sql);
  }

  async handle(request: BoxRequest, payload: Uint8Array, ip: string): Promise<BoxResult> {
    if (request.op !== "close" && this.env.NEW_BOXES && this.store.meta() === null) {
      const { success } = await this.env.NEW_BOXES.limit({ key: ip || "unknown" });
      if (!success) {
        return {
          status: 429,
          frame: encodeFrame({ ok: false, error: "rate", now: Date.now(), retryAfter: 60 }),
          alarmAt: null,
        };
      }
    }
    const result = this.ctx.storage.transactionSync(() =>
      handleBox(this.store, request, payload, {
        now: Date.now(),
        newEpoch: () => crypto.randomUUID(),
        wait: Number(this.env.MIN_WAIT ?? "0") || 0,
      }),
    );
    if (result.alarmAt !== null) await this.ctx.storage.setAlarm(result.alarmAt);
    return result;
  }

  /** A year without use (or a year after closing): the box goes. */
  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
    this.store.init();
  }
}
