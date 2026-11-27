/**
 * One exchange with the sync relay, given a device (its data and its
 * sync state, wherever they're kept) and a way to reach the relay: what
 * the relay doesn't have yet goes out (syncData.ts works it out), what
 * the other devices sent comes in and is merged with the backup's merge
 * (backupMerge.ts: union by id, the newest edit wins, deletions don't
 * come back), written as changes only. syncEngine.ts says when, and what
 * an outcome means for the person; the tests run two devices in memory
 * against the relay's own code.
 */

import { BACKUP_SCHEMA_VERSION, normalizeMergeData } from "./backup";
import { mergeData, type MergeData } from "./backupMerge";
import {
  changedKinds,
  changedRecords,
  combineData,
  countRecords,
  emptyData,
  fingerprint,
  isEmptyData,
  printsAfter,
  splitData,
  SYNC_KINDS,
  type Prints,
  type SyncKind,
} from "./syncData";
import { seal, unseal, type SealedKind, type SyncKeys } from "./syncCrypto";
import { ANNOUNCE_EVERY, mergeDevices, readDevice, type SyncedDevice } from "./syncDevices";
import type { RelayError, RelayResult } from "./syncRelay";
import { MAX_REQUEST_BYTES, type SyncRequest, type SyncStats } from "./syncWire";

const DAY = 24 * 60 * 60 * 1000;
/** Unsynced this long (deletions are kept a year), a device asks before merging. */
export const STALE_AFTER = 335 * DAY;
/** The clock's offset is read only from answers quicker than this. */
const SKEW_MAX_ROUND_TRIP = 10_000;
/** A first upload goes in parts of this many records. */
export const RECORDS_PER_PART = 2000;
/** The changes are folded into the snapshot past this many… */
const COMPACT_OPS = 100;
/** …or when they weigh more than the snapshot (and at least this). */
const COMPACT_MIN_BYTES = 512 * 1024;

export interface SyncState {
  /** The code, as shown. */
  code: string;
  epoch: string | null;
  since: number | null;
  gen: number;
  lastSyncAt: number | null;
  /** Codes replaced: their boxes are still to close (it was offline, say). */
  closeCodes?: string[];
  /** What the person chose for a device unsynced most of a year. */
  staleChoice?: "merge" | "server";
  /** When something last came in from another device: whether another one is in use these days. */
  othersSeenAt?: number;
  /** When this device last told the others it's there, and by which name (syncDevices.ts). */
  announcedAt?: number;
  announcedName?: string;
}

export interface SyncDevice {
  loadData(): Promise<MergeData>;
  /** Writes only what changed from `before` to `after`. */
  saveChanges(before: MergeData, after: MergeData): Promise<void>;
  /** What changed, for the screens to read again. */
  announce(kinds: Set<SyncKind>): void;
  saveState(state: SyncState): Promise<void>;
  loadPrints(): Promise<Prints>;
  savePrints(prints: Prints): Promise<void>;
  /** The devices sharing the code (syncDevices.ts): this one, and the list it keeps. */
  devices?: {
    me(): { id: string; name: string };
    load(): Promise<SyncedDevice[]>;
    save(devices: SyncedDevice[]): Promise<void>;
  };
}

export type Relay = (request: SyncRequest, payload?: Uint8Array) => Promise<RelayResult>;

export type ExchangeOutcome =
  /** `skipped`: nothing to send and only sending was asked, so the relay wasn't called. */
  | {
      kind: "ok";
      state: SyncState;
      skew: number;
      wait: number;
      followUp: boolean;
      skipped?: boolean;
    }
  | { kind: "failed"; error: RelayError; retryAfter?: number }
  | { kind: "problem"; reason: "full" | "update" }
  | { kind: "stale"; lastSyncAt: number };

/** What a sealed change or snapshot holds. */
interface Packet {
  v: number;
  data: Partial<Record<SyncKind, unknown>>;
  /** A change's sender. */
  device?: SyncedDevice;
  /** A snapshot's list of devices. */
  devices?: SyncedDevice[];
}

class NewerDataError extends Error {}

/** This device as a change's sender, if it keeps a list of devices. */
function signed(device: SyncDevice, now: () => number): { device?: SyncedDevice } {
  const me = device.devices?.me();
  return me ? { device: { ...me, seenAt: now() } } : {};
}

/** What came in, opened and read like a backup's records. A part that can't be opened is left out. */
async function openIncoming(
  keys: SyncKeys,
  result: Extract<RelayResult, { ok: true }>,
  seen: SyncedDevice[] = [],
): Promise<MergeData> {
  if (result.reply.op !== "sync") return emptyData();
  const kinds: SealedKind[] = [
    ...(result.reply.snapshot !== null ? ["snapshot" as const] : []),
    ...result.reply.ops.map(() => "op" as const),
  ];
  const datas: MergeData[] = [];
  for (let i = 0; i < kinds.length; i++) {
    let packet: Packet;
    try {
      packet = (await unseal(keys, kinds[i], result.parts[i])) as Packet;
    } catch {
      continue;
    }
    if (!packet || typeof packet !== "object" || typeof packet.v !== "number") continue;
    // From a newer version of the app: merged here, it could lose what this one doesn't know.
    if (packet.v > BACKUP_SCHEMA_VERSION) throw new NewerDataError();
    datas.push(normalizeMergeData(packet.data ?? {}));
    for (const d of [packet.device, ...(Array.isArray(packet.devices) ? packet.devices : [])]) {
      const device = d && readDevice(d);
      if (device) seen.push(device);
    }
  }
  return combineData(datas);
}

/** Writes what came in (only what changed) and tells the screens. */
async function takeIn(device: SyncDevice, incoming: MergeData): Promise<MergeData> {
  const fresh = await device.loadData();
  const merged = mergeData(fresh, incoming);
  await device.saveChanges(fresh, merged);
  device.announce(changedKinds(fresh, merged));
  return merged;
}

function subsetOf(prints: Prints, part: MergeData): Prints {
  const subset: Prints = new Map();
  for (const kind of SYNC_KINDS) {
    for (const record of part[kind] as { id: string }[]) {
      const k = `${kind}:${record.id}`;
      const print = prints.get(k);
      if (print !== undefined) subset.set(k, print);
    }
  }
  return subset;
}

function syncRequest(
  keys: SyncKeys,
  state: Pick<SyncState, "epoch" | "since">,
  size: number,
): SyncRequest {
  return {
    v: 1,
    op: "sync",
    box: keys.box,
    pass: keys.pass,
    epoch: state.epoch,
    since: state.epoch ? state.since : null,
    size,
  };
}

/**
 * A change worked out and sealed ahead of time (a moment after it's
 * made), so that leaving the app has nothing left to do but send it:
 * closing the app or the tab right then leaves no time to read and seal.
 */
export interface PreparedChange {
  request: SyncRequest;
  op: Uint8Array;
  part: MergeData;
  sent: Prints;
}

/** A prepared change already on its way, and when it left. */
export interface ChangeInFlight {
  change: PreparedChange;
  result: Promise<RelayResult>;
  sentAt: number;
}

export interface ExchangeOptions {
  /** Only if there's something to send (after a change): otherwise no request at all. */
  onlyToSend?: boolean;
  /** Sent already (on leaving the app): its answer is taken in like any other. */
  inFlight?: ChangeInFlight;
}

/**
 * What the relay doesn't have yet, sealed and ready to go in one request
 * of at most `maxBytes`; null when there's nothing, or it isn't that
 * simple (a first upload, a question pending, too big): the usual
 * exchange does it then.
 */
export async function prepareChange(
  device: SyncDevice,
  keys: SyncKeys,
  state: SyncState,
  maxBytes: number,
  now = Date.now,
): Promise<PreparedChange | null> {
  if (state.epoch === null || state.closeCodes?.length || state.staleChoice) return null;
  if (state.lastSyncAt !== null && now() - state.lastSyncAt > STALE_AFTER) return null;
  const [prints, local] = await Promise.all([device.loadPrints(), device.loadData()]);
  const { delta, sent } = await changedRecords(local, prints);
  if (isEmptyData(delta) || countRecords(delta) > RECORDS_PER_PART) return null;
  const op = await seal(keys, "op", {
    v: BACKUP_SCHEMA_VERSION,
    data: delta,
    ...signed(device, now),
  } satisfies Packet);
  if (op.length > maxBytes) return null;
  return { request: syncRequest(keys, state, op.length), op, part: delta, sent };
}

/** The whole exchange, in as many requests as the changes need. */
export async function exchange(
  device: SyncDevice,
  relay: Relay,
  keys: SyncKeys,
  state: SyncState,
  now = Date.now,
  options: ExchangeOptions = {},
): Promise<ExchangeOutcome> {
  try {
    return await exchangeOrThrow(device, relay, keys, state, now, options);
  } catch (error) {
    if (error instanceof NewerDataError) return { kind: "problem", reason: "update" };
    throw error;
  }
}

async function exchangeOrThrow(
  device: SyncDevice,
  relay: Relay,
  keys: SyncKeys,
  state: SyncState,
  now: () => number,
  options: ExchangeOptions,
): Promise<ExchangeOutcome> {
  let current: SyncState = { ...state };
  let prints = await device.loadPrints();

  if (current.staleChoice === "server") return takeServerCopy(device, relay, keys, current, now);

  // Most of a year without syncing: what it deleted meanwhile is forgotten,
  // so merging could bring it back. A look first, and the person decides.
  if (
    !current.staleChoice &&
    current.lastSyncAt !== null &&
    now() - current.lastSyncAt > STALE_AFTER
  ) {
    const probe = await relay(syncRequest(keys, current, 0));
    if (!probe.ok) return { kind: "failed", error: probe.error, retryAfter: probe.retryAfter };
    if (probe.reply.op === "sync" && !probe.reply.reset)
      return { kind: "stale", lastSyncAt: current.lastSyncAt };
  }

  const local = await device.loadData();
  const flying = options.inFlight;
  const { delta, sent } = flying
    ? { delta: flying.change.part, sent: flying.change.sent }
    : await changedRecords(local, prints);
  // A change that came to nothing (undone, or already sent by another tab): every request counts.
  if (
    !flying &&
    options.onlyToSend &&
    isEmptyData(delta) &&
    current.epoch !== null &&
    !current.closeCodes?.length
  ) {
    return { kind: "ok", state: current, skew: 0, wait: 0, followUp: false, skipped: true };
  }
  // Nothing to send, but the others haven't heard from this device for a day (or of its new name): an empty change says so.
  const me = device.devices?.me();
  const announce =
    !!me &&
    (!current.announcedAt ||
      now() - current.announcedAt > ANNOUNCE_EVERY ||
      current.announcedName !== me.name);
  const parts: (MergeData | null)[] = isEmptyData(delta)
    ? [announce && !flying ? emptyData() : null]
    : flying
      ? [delta]
      : splitData(delta, RECORDS_PER_PART);
  const seen: SyncedDevice[] = [];
  let stats: SyncStats | null = null;
  let skew = 0;
  let wait = 0;
  let followUp = false;
  let compacted = false;

  for (const [index, part] of parts.entries()) {
    const ahead = index === 0 ? flying : undefined;
    const op = ahead
      ? ahead.change.op
      : part
        ? await seal(keys, "op", {
            v: BACKUP_SCHEMA_VERSION,
            data: part,
            ...signed(device, now),
          } satisfies Packet)
        : new Uint8Array();
    if (op.length > MAX_REQUEST_BYTES) return { kind: "problem", reason: "full" };
    const started = ahead ? ahead.sentAt : now();
    let result = ahead
      ? await ahead.result
      : await relay(syncRequest(keys, current, op.length), op);
    // The box is full: fold its changes into the snapshot, then once more.
    if (!result.ok && result.error === "full" && !compacted) {
      compacted = true;
      const freed = await pullAndCompact(device, relay, keys, current, prints);
      if (!freed) return { kind: "problem", reason: "full" };
      ({ state: current, prints } = freed);
      result = await relay(syncRequest(keys, current, op.length), op);
    }
    if (!result.ok) {
      if (result.error === "full") return { kind: "problem", reason: "full" };
      return { kind: "failed", error: result.error, retryAfter: result.retryAfter };
    }
    const reply = result.reply;
    if (reply.op !== "sync") return { kind: "failed", error: "bad-reply" };
    // Another box than the one this device knew (made again after expiring):
    // it has none of ours, so everything goes again. A device just linked
    // (no box known yet) expected nothing else.
    if (reply.reset && current.epoch !== null) {
      prints = new Map();
      followUp = true;
    }
    const incoming = await openIncoming(keys, result, seen);
    const merged = isEmptyData(incoming) ? local : await takeIn(device, incoming);
    const sentNow =
      part && reply.appended !== null ? subsetOf(sent, part) : new Map<string, string>();
    prints = printsAfter(prints, sentNow, incoming, merged);
    current = {
      ...current,
      epoch: reply.epoch,
      since: reply.latest,
      gen: reply.gen,
      lastSyncAt: now(),
    };
    if (!isEmptyData(incoming)) current.othersSeenAt = now();
    if (me && part && reply.appended !== null)
      Object.assign(current, { announcedAt: now(), announcedName: me.name });
    await Promise.all([device.saveState(current), device.savePrints(prints)]);
    stats = reply.stats;
    // Only from a quick answer: one held up (the page frozen in the background) would read as a clock off.
    const elapsed = now() - started;
    if (elapsed < SKEW_MAX_ROUND_TRIP) skew = Math.round((started + now()) / 2 - reply.now);
    wait = reply.wait;
  }

  if (current.staleChoice) {
    delete current.staleChoice;
    await device.saveState(current);
  }
  if (device.devices && seen.length)
    await device.devices.save(mergeDevices(await device.devices.load(), seen, now()));
  if (
    stats &&
    (stats.ops >= COMPACT_OPS || stats.opsBytes > Math.max(stats.snapshotBytes, COMPACT_MIN_BYTES))
  ) {
    const gen = await compact(device, relay, keys, current);
    if (gen !== null) current = { ...current, gen };
  }
  return { kind: "ok", state: current, skew, wait, followUp };
}

/** Asked for what's new, merged, then the changes folded into a new snapshot. */
async function pullAndCompact(
  device: SyncDevice,
  relay: Relay,
  keys: SyncKeys,
  state: SyncState,
  prints: Prints,
): Promise<{ state: SyncState; prints: Prints } | null> {
  const pull = await relay(syncRequest(keys, state, 0));
  if (!pull.ok || pull.reply.op !== "sync") return null;
  const seen: SyncedDevice[] = [];
  const incoming = await openIncoming(keys, pull, seen);
  const merged = isEmptyData(incoming) ? await device.loadData() : await takeIn(device, incoming);
  if (device.devices && seen.length)
    await device.devices.save(mergeDevices(await device.devices.load(), seen));
  const next = { ...state, epoch: pull.reply.epoch, since: pull.reply.latest, gen: pull.reply.gen };
  const nextPrints = printsAfter(
    pull.reply.reset ? new Map() : prints,
    new Map(),
    incoming,
    merged,
  );
  await Promise.all([device.saveState(next), device.savePrints(nextPrints)]);
  const gen = await compact(device, relay, keys, next);
  return gen === null ? null : { state: { ...next, gen }, prints: nextPrints };
}

/** Everything here (which by now holds every change up to `since`) as the new snapshot. */
async function compact(
  device: SyncDevice,
  relay: Relay,
  keys: SyncKeys,
  state: SyncState,
): Promise<number | null> {
  if (!state.epoch || state.since === null) return null;
  const all = await device.loadData();
  // The devices known go with it: one that starts from the snapshot knows them too.
  const me = device.devices?.me();
  const devices = device.devices
    ? mergeDevices(await device.devices.load(), me ? [{ ...me, seenAt: Date.now() }] : [])
    : undefined;
  const snapshot = await seal(keys, "snapshot", {
    v: BACKUP_SCHEMA_VERSION,
    data: all,
    ...(devices ? { devices } : {}),
  } satisfies Packet);
  if (snapshot.length > MAX_REQUEST_BYTES) return null;
  const result = await relay(
    {
      v: 1,
      op: "snapshot",
      box: keys.box,
      pass: keys.pass,
      epoch: state.epoch,
      upto: state.since,
      gen: state.gen,
      size: snapshot.length,
    },
    snapshot,
  );
  // Someone else folded them first: just as good.
  if (!result.ok || result.reply.op !== "snapshot") return null;
  await device.saveState({ ...state, gen: result.reply.gen });
  return result.reply.gen;
}

/** "Keep the server's": this device's data becomes exactly what the relay holds. */
async function takeServerCopy(
  device: SyncDevice,
  relay: Relay,
  keys: SyncKeys,
  state: SyncState,
  now: () => number,
): Promise<ExchangeOutcome> {
  const pull = await relay(syncRequest(keys, { epoch: null, since: null }, 0));
  if (!pull.ok) return { kind: "failed", error: pull.error, retryAfter: pull.retryAfter };
  if (pull.reply.op !== "sync") return { kind: "failed", error: "bad-reply" };
  const seen: SyncedDevice[] = [];
  const server = mergeData(emptyData(), await openIncoming(keys, pull, seen));
  if (device.devices && seen.length)
    await device.devices.save(mergeDevices(await device.devices.load(), seen, now()));
  const fresh = await device.loadData();
  await device.saveChanges(fresh, server);
  device.announce(changedKinds(fresh, server));
  const prints: Prints = new Map();
  for (const kind of SYNC_KINDS)
    for (const r of server[kind] as { id: string }[]) prints.set(`${kind}:${r.id}`, fingerprint(r));
  const next: SyncState = {
    ...state,
    epoch: pull.reply.epoch,
    since: pull.reply.latest,
    gen: pull.reply.gen,
    lastSyncAt: now(),
  };
  delete next.staleChoice;
  await Promise.all([device.saveState(next), device.savePrints(prints)]);
  return { kind: "ok", state: next, skew: 0, wait: pull.reply.wait, followUp: false };
}
