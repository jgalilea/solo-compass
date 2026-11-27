/**
 * The sync relay's wire format, shared by the app (syncRelay.ts) and the
 * relay itself (relay/src/), so the two can't drift apart.
 *
 * Every request and every answer is one frame: four bytes (big-endian)
 * with the length of a small JSON header, the header, then the bytes it
 * describes, one part after another. A request is always a single POST
 * with a text/plain body: a "simple" request in CORS terms, so the
 * browser sends no preflight before it (a preflight would count against
 * the relay's daily requests as one more).
 *
 * The relay only ever sees sealed bytes (syncCrypto.ts): a box's id, the
 * hash of its pass, sizes and times. Nothing here is secret.
 */

export const SYNC_PROTOCOL = 1;

/** A box's id: 16 bytes in hex. */
export const BOX_ID = /^[0-9a-f]{32}$/;
/** A box's pass: 32 bytes in base64url. */
export const BOX_PASS = /^[A-Za-z0-9_-]{43}$/;

/** The most one request may carry (a change or a snapshot). */
export const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
/** The most a box may hold, snapshot and changes together. */
export const MAX_BOX_BYTES = 24 * 1024 * 1024;
/** A JSON header is a few hundred bytes; this only stops nonsense. */
const MAX_HEADER_BYTES = 16 * 1024;

export type SyncRequest =
  /** Sends a change (if `op` bytes follow) and asks for what's after `since`. */
  | {
      v: 1;
      op: "sync";
      box: string;
      pass: string;
      epoch: string | null;
      since: number | null;
      size: number;
    }
  /** Replaces the snapshot with one that holds everything up to `upto`. */
  | {
      v: 1;
      op: "snapshot";
      box: string;
      pass: string;
      epoch: string;
      upto: number;
      gen: number;
      size: number;
    }
  /** Wipes the box and closes it for good: other devices stop syncing. */
  | { v: 1; op: "close"; box: string; pass: string };

export type SyncFailure =
  /** Closed from another device (or its code changed). */
  | "closed"
  /** The box exists with another pass. */
  | "forbidden"
  /** The box (or what's being sent) is past the limits. */
  | "full"
  /** Too many writes in a short time. */
  | "rate"
  /** The snapshot was replaced meanwhile. */
  | "conflict"
  /** The relay's free daily allowance is used up. */
  | "quota"
  | "unavailable"
  | "bad-request"
  | "origin";

export interface SyncStats {
  /** Changes after the snapshot. */
  ops: number;
  opsBytes: number;
  snapshotBytes: number;
}

export type SyncReply =
  | {
      ok: true;
      op: "sync";
      epoch: string;
      /** The last change's number (0 if none yet). */
      latest: number;
      /** The snapshot's generation: it goes up each time it's replaced. */
      gen: number;
      /** Bytes of the snapshot in the payload (first), if it was sent. */
      snapshot: number | null;
      /** The changes in the payload, after the snapshot, in order. */
      ops: { seq: number; size: number }[];
      /** The number given to the change just sent, if any. */
      appended: number | null;
      /** A new box, or another one under the same id: everything was sent. */
      reset: boolean;
      /** Only when a change was sent: that device may fold the changes (reading them all costs rows). */
      stats: SyncStats | null;
      /** The relay's clock (ms). */
      now: number;
      /** Seconds before coming back on its own (0: no limit). */
      wait: number;
    }
  | { ok: true; op: "snapshot"; gen: number; stats: SyncStats; now: number; wait: number }
  | { ok: true; op: "close"; now: number }
  | { ok: false; error: SyncFailure; now: number; retryAfter?: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });

export function encodeFrame(
  header: object,
  parts: readonly Uint8Array[] = [],
): Uint8Array<ArrayBuffer> {
  const head = encoder.encode(JSON.stringify(header));
  const size = parts.reduce((sum, p) => sum + p.length, 4 + head.length);
  const frame = new Uint8Array(size);
  new DataView(frame.buffer).setUint32(0, head.length);
  frame.set(head, 4);
  let at = 4 + head.length;
  for (const part of parts) {
    frame.set(part, at);
    at += part.length;
  }
  return frame;
}

export class FrameError extends Error {}

export function decodeFrame(frame: Uint8Array): { header: unknown; payload: Uint8Array } {
  if (frame.length < 4) throw new FrameError("short frame");
  const length = new DataView(frame.buffer, frame.byteOffset, frame.byteLength).getUint32(0);
  if (length > MAX_HEADER_BYTES || 4 + length > frame.length)
    throw new FrameError("bad header length");
  let header: unknown;
  try {
    header = JSON.parse(decoder.decode(frame.subarray(4, 4 + length)));
  } catch {
    throw new FrameError("bad header");
  }
  return { header, payload: frame.subarray(4 + length) };
}

/** The payload cut into the parts a header lists, in order. */
export function splitParts(payload: Uint8Array, sizes: readonly number[]): Uint8Array[] {
  const parts: Uint8Array[] = [];
  let at = 0;
  for (const size of sizes) {
    if (!Number.isInteger(size) || size < 0 || at + size > payload.length)
      throw new FrameError("bad part size");
    parts.push(payload.subarray(at, at + size));
    at += size;
  }
  if (at !== payload.length) throw new FrameError("trailing bytes");
  return parts;
}

function isCount(x: unknown): x is number {
  return typeof x === "number" && Number.isInteger(x) && x >= 0;
}

/** A request as the relay receives it: anything else is "bad-request". */
export function parseSyncRequest(header: unknown, payloadSize: number): SyncRequest | null {
  if (!header || typeof header !== "object") return null;
  const h = header as Record<string, unknown>;
  if (h.v !== SYNC_PROTOCOL || typeof h.box !== "string" || !BOX_ID.test(h.box)) return null;
  if (typeof h.pass !== "string" || !BOX_PASS.test(h.pass)) return null;
  const box = { v: 1 as const, box: h.box, pass: h.pass };
  if (h.op === "sync") {
    if (
      !(h.epoch === null || typeof h.epoch === "string") ||
      !(h.since === null || isCount(h.since))
    )
      return null;
    if (!isCount(h.size) || h.size !== payloadSize) return null;
    return { ...box, op: "sync", epoch: h.epoch, since: h.since, size: h.size };
  }
  if (h.op === "snapshot") {
    if (typeof h.epoch !== "string" || !isCount(h.upto) || !isCount(h.gen)) return null;
    if (!isCount(h.size) || h.size === 0 || h.size !== payloadSize) return null;
    return { ...box, op: "snapshot", epoch: h.epoch, upto: h.upto, gen: h.gen, size: h.size };
  }
  if (h.op === "close") return payloadSize === 0 ? { ...box, op: "close" } : null;
  return null;
}
