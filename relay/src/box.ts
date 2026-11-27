/**
 * One sync box, the relay's whole job: plain logic over a `BoxStore`,
 * so the same code runs in the Durable Object (sqlStore.ts), in the
 * tests and in the app's e2e (memoryStore.ts).
 *
 * A box holds sealed bytes it can't read (the app encrypts them with a
 * key only the player's devices have): a snapshot with everything up
 * to change `upto`, and the changes after it, numbered. Devices send
 * their changes and get everyone else's after the last number they've
 * seen; since the app's merge is a union by id where the newest edit
 * wins, the order changes arrive in doesn't matter and taking one twice
 * is harmless, so appending needs no lock. Only replacing the snapshot
 * (folding the changes into it) checks that nobody did it meanwhile.
 *
 * Written rows are a daily allowance on the free plan (100,000 a day,
 * like requests), so a box writes as little as it can: sending a change
 * writes that one row, and nothing else (the counters are read from the
 * changes themselves); asking for what's new writes nothing; the box's
 * own record changes only when it's made, folded, closed, or once a week
 * to move its expiry.
 */

import { MAX_BOX_BYTES, encodeFrame, type SyncReply, type SyncRequest, type SyncStats } from "../../src/lib/syncWire.ts";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
/**
 * Unused this long, a box goes: half a year, so what's abandoned doesn't
 * fill the free 5 GB. A device back after that starts a new one with
 * everything it has (and the app keeps its deletions a year).
 */
export const EXPIRE_AFTER = 182 * DAY;
/** A closed box's marker (no data, a few bytes) stays longer, so a device back late still stops. */
export const CLOSED_KEPT = 365 * DAY;
/** The expiry moves forward at most this often: moving it is a write. */
export const EXPIRY_STEP = 7 * DAY;
/** Changes a box takes per minute. */
export const WRITES_PER_MINUTE = 20;
/** And a snapshot at most this often. */
export const SNAPSHOT_GAP = 10 * 1000;

export interface BoxMeta {
  /** SHA-256 of the pass, in hex: the relay never keeps the pass itself. */
  passHash: string;
  /** Random, per box: a device that knew another box under this id starts over. */
  epoch: string;
  closed: boolean;
  /** The snapshot holds every change up to this one. */
  upto: number;
  gen: number;
  snapshotBytes: number;
  /** When the last snapshot was written, for its limit. */
  snapshotAt: number;
  alarmAt: number;
}

export interface BoxStore {
  meta(): BoxMeta | null;
  setMeta(meta: BoxMeta): void;
  appendChange(seq: number, at: number, data: Uint8Array): void;
  /** The last change's number, if any is kept. */
  lastChange(): number | null;
  changesAfter(seq: number): { seq: number; data: Uint8Array }[];
  /** The changes kept after `seq`: how many and their bytes. */
  changeStatsAfter(seq: number): { count: number; bytes: number };
  /** When the last `count` changes came, newest first. */
  recentChangeTimes(count: number): number[];
  deleteChangesUpTo(seq: number): void;
  snapshot(): Uint8Array | null;
  setSnapshot(data: Uint8Array): void;
  wipe(): void;
}

type WithoutPass<T> = T extends unknown ? Omit<T, "pass"> & { passHash: string } : never;
/** A request with its pass already hashed (by the Worker, before the box sees it). */
export type BoxRequest = WithoutPass<SyncRequest>;

export interface BoxOptions {
  now: number;
  newEpoch: () => string;
  /** Seconds devices are asked to wait before coming back on their own. */
  wait: number;
}

export interface BoxResult {
  status: number;
  frame: Uint8Array;
  /** When the box should next expire, if that moved. */
  alarmAt: number | null;
}

function answer(status: number, reply: SyncReply, parts: Uint8Array[] = [], alarmAt: number | null = null): BoxResult {
  return { status, frame: encodeFrame(reply, parts), alarmAt };
}

function failure(status: number, error: Extract<SyncReply, { ok: false }>["error"], now: number, retryAfter?: number): BoxResult {
  return answer(status, { ok: false, error, now, ...(retryAfter ? { retryAfter } : {}) });
}

function newMeta(passHash: string, epoch: string): BoxMeta {
  return { passHash, epoch, closed: false, upto: 0, gen: 0, snapshotBytes: 0, snapshotAt: 0, alarmAt: 0 };
}

function nextAlarm(meta: BoxMeta, now: number): number | null {
  return meta.alarmAt < now + EXPIRE_AFTER - EXPIRY_STEP ? now + EXPIRE_AFTER : null;
}

function statsOf(store: BoxStore, meta: BoxMeta): SyncStats {
  // Every change kept is after the snapshot (folding deletes the rest).
  const { count, bytes } = store.changeStatsAfter(meta.upto);
  return { ops: count, opsBytes: bytes, snapshotBytes: meta.snapshotBytes };
}

export function handleBox(store: BoxStore, request: BoxRequest, payload: Uint8Array, options: BoxOptions): BoxResult {
  const { now, wait } = options;
  const stored = store.meta();

  if (stored?.closed) {
    if (request.op === "close" && stored.passHash === request.passHash) return answer(200, { ok: true, op: "close", now });
    return failure(410, "closed", now);
  }
  if (stored && stored.passHash !== request.passHash) return failure(403, "forbidden", now);

  if (request.op === "close") {
    store.wipe();
    // A marker stays, so the other devices stop instead of making it again.
    const alarmAt = now + CLOSED_KEPT;
    store.setMeta({ ...newMeta(request.passHash, ""), closed: true, alarmAt });
    return answer(200, { ok: true, op: "close", now }, [], alarmAt);
  }

  const meta = stored ? { ...stored } : newMeta(request.passHash, options.newEpoch());
  const latest = store.lastChange() ?? meta.upto;
  let metaChanged = !stored;

  if (request.op === "snapshot") {
    if (request.epoch !== meta.epoch || request.gen !== meta.gen || request.upto > latest || request.upto < meta.upto) {
      return failure(409, "conflict", now);
    }
    if (now - meta.snapshotAt < SNAPSHOT_GAP) return failure(429, "rate", now, Math.ceil(SNAPSHOT_GAP / 1000));
    // Checked before anything is touched: a refusal leaves the box as it was.
    const after = store.changeStatsAfter(request.upto);
    if (request.size + after.bytes > MAX_BOX_BYTES) return failure(413, "full", now);
    store.deleteChangesUpTo(request.upto);
    store.setSnapshot(payload);
    Object.assign(meta, { upto: request.upto, gen: meta.gen + 1, snapshotBytes: request.size, snapshotAt: now });
    const alarmAt = nextAlarm(meta, now);
    if (alarmAt) meta.alarmAt = alarmAt;
    store.setMeta(meta);
    const stats = { ops: after.count, opsBytes: after.bytes, snapshotBytes: meta.snapshotBytes };
    return answer(200, { ok: true, op: "snapshot", gen: meta.gen, stats, now, wait }, [], alarmAt);
  }

  let appended: number | null = null;
  let stats: SyncStats | null = null;
  if (request.size > 0) {
    const recent = store.recentChangeTimes(WRITES_PER_MINUTE);
    if (recent.length >= WRITES_PER_MINUTE && recent[WRITES_PER_MINUTE - 1] > now - MINUTE) {
      return failure(429, "rate", now, Math.max(1, Math.ceil((recent[WRITES_PER_MINUTE - 1] + MINUTE - now) / 1000)));
    }
    const before = statsOf(store, meta);
    if (meta.snapshotBytes + before.opsBytes + request.size > MAX_BOX_BYTES) return failure(413, "full", now);
    appended = latest + 1;
    store.appendChange(appended, now, payload);
    // Only a device that sends needs them: it's the one that may fold the changes.
    stats = { ...before, ops: before.ops + 1, opsBytes: before.opsBytes + request.size };
  }
  const last = appended ?? latest;

  // Another box under this id, or a number from the future: start over.
  const reset = request.epoch !== meta.epoch || (request.since !== null && request.since > last);
  const since = reset ? null : request.since;
  const withSnapshot = meta.snapshotBytes > 0 && (since === null || since < meta.upto);
  const from = withSnapshot ? meta.upto : (since ?? 0);
  const ops = store.changesAfter(from).filter((o) => o.seq !== appended);
  const snapshot = withSnapshot ? store.snapshot() : null;

  const alarmAt = nextAlarm(meta, now);
  if (alarmAt) {
    meta.alarmAt = alarmAt;
    metaChanged = true;
  }
  if (metaChanged) store.setMeta(meta);

  const reply: SyncReply = {
    ok: true,
    op: "sync",
    epoch: meta.epoch,
    latest: last,
    gen: meta.gen,
    snapshot: snapshot ? snapshot.length : null,
    ops: ops.map((o) => ({ seq: o.seq, size: o.data.length })),
    appended,
    reset,
    stats,
    now,
    wait,
  };
  return answer(200, reply, [...(snapshot ? [snapshot] : []), ...ops.map((o) => o.data)], alarmAt);
}
