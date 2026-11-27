import { describe, expect, it } from "vitest";
import {
  CLOSED_KEPT,
  EXPIRE_AFTER,
  EXPIRY_STEP,
  handleBox,
  SNAPSHOT_GAP,
  WRITES_PER_MINUTE,
  type BoxRequest,
} from "./box.ts";
import { MemoryBoxStore } from "./memoryStore.ts";
import { MAX_BOX_BYTES, decodeFrame, splitParts, type SyncReply } from "../../src/lib/syncWire.ts";

const BOX = "0".repeat(32);
const PASS = "a".repeat(64);
let clock = 1_000_000;
let epochs = 0;

function call(
  store: MemoryBoxStore,
  request: Omit<BoxRequest, "v" | "box" | "passHash"> & { passHash?: string },
  payload = new Uint8Array(),
) {
  const result = handleBox(
    store,
    { v: 1, box: BOX, passHash: PASS, ...request } as BoxRequest,
    payload,
    {
      now: clock,
      newEpoch: () => `epoch-${++epochs}`,
      wait: 0,
    },
  );
  const { header, payload: rest } = decodeFrame(result.frame);
  const reply = header as SyncReply;
  const sizes =
    reply.ok && reply.op === "sync"
      ? [...(reply.snapshot !== null ? [reply.snapshot] : []), ...reply.ops.map((o) => o.size)]
      : [];
  return {
    status: result.status,
    reply,
    parts: splitParts(rest, sizes).map((p) => new TextDecoder().decode(p)),
    alarmAt: result.alarmAt,
  };
}

const bytes = (text: string) => new TextEncoder().encode(text);

function sync(store: MemoryBoxStore, epoch: string | null, since: number | null, op?: string) {
  const payload = op ? bytes(op) : new Uint8Array();
  return call(store, { op: "sync", epoch, since, size: payload.length }, payload);
}

function ok<T extends SyncReply>(reply: T) {
  if (!reply.ok) throw new Error(`expected ok, got ${reply.error}`);
  return reply as Extract<T, { ok: true }>;
}

describe("sync box", () => {
  it("creates a box on first use and hands each device the others' changes", () => {
    const store = new MemoryBoxStore();
    const a = ok(sync(store, null, null, "from A").reply);
    if (a.op !== "sync") throw new Error();
    expect(a).toMatchObject({ latest: 1, appended: 1, reset: true, ops: [] });

    // B joins: gets A's change, then sends its own.
    const b = sync(store, null, null, "from B");
    const bReply = ok(b.reply);
    if (bReply.op !== "sync") throw new Error();
    expect(bReply.epoch).toBe(a.epoch);
    expect(b.parts).toEqual(["from A"]);

    // A comes back: only B's.
    const again = sync(store, a.epoch, 1);
    expect(again.parts).toEqual(["from B"]);
    // Nothing new: nothing sent, nothing written.
    const quiet = sync(store, a.epoch, 2);
    expect(quiet.parts).toEqual([]);
  });

  it("refuses another pass and anything after closing", () => {
    const store = new MemoryBoxStore();
    sync(store, null, null, "x");
    expect(
      call(store, { op: "sync", epoch: null, since: null, size: 0, passHash: "b".repeat(64) })
        .status,
    ).toBe(403);
    expect(call(store, { op: "close" }).status).toBe(200);
    const after = sync(store, null, null);
    expect(after.status).toBe(410);
    expect(after.reply).toMatchObject({ ok: false, error: "closed" });
    // Closing twice is fine; the marker keeps the box from coming back.
    expect(call(store, { op: "close" }).status).toBe(200);
    expect(sync(store, null, null, "again").status).toBe(410);
  });

  it("folds the changes into a snapshot, and only once at a time", () => {
    const store = new MemoryBoxStore();
    const first = ok(sync(store, null, null, "1").reply);
    if (first.op !== "sync") throw new Error();
    sync(store, first.epoch, 1, "2");
    sync(store, first.epoch, 2, "3");

    const snap = call(
      store,
      { op: "snapshot", epoch: first.epoch, upto: 3, gen: 0, size: 3 },
      bytes("123"),
    );
    expect(ok(snap.reply)).toMatchObject({
      op: "snapshot",
      gen: 1,
      stats: { ops: 0, opsBytes: 0, snapshotBytes: 3 },
    });
    // Someone else's, on the old generation, loses.
    expect(
      call(store, { op: "snapshot", epoch: first.epoch, upto: 3, gen: 0, size: 1 }, bytes("x"))
        .status,
    ).toBe(409);
    // Past the last change: refused.
    expect(
      call(store, { op: "snapshot", epoch: first.epoch, upto: 9, gen: 1, size: 1 }, bytes("x"))
        .status,
    ).toBe(409);

    sync(store, first.epoch, 3, "4");
    // A new device: the snapshot, then what came after it.
    expect(sync(store, null, null).parts).toEqual(["123", "4"]);
    // One that had seen up to 2 (before the snapshot): the same.
    expect(sync(store, first.epoch, 2).parts).toEqual(["123", "4"]);
    // One past the snapshot: only the change after it.
    expect(sync(store, first.epoch, 3).parts).toEqual(["4"]);
  });

  it("tells a device that knew another box to start over", () => {
    const store = new MemoryBoxStore();
    const first = ok(sync(store, null, null, "1").reply);
    if (first.op !== "sync") throw new Error();
    const stranger = ok(sync(store, "someone-else", 7).reply);
    expect(stranger).toMatchObject({ reset: true });
    expect(sync(store, "someone-else", 7).parts).toEqual(["1"]);
    // Ahead of the box (it was made again): start over too.
    expect(ok(sync(store, first.epoch, 50).reply)).toMatchObject({ reset: true });
  });

  it("limits writes per minute and the box's size", () => {
    const store = new MemoryBoxStore();
    const first = ok(sync(store, null, null, "x").reply);
    if (first.op !== "sync") throw new Error();
    for (let i = 1; i < WRITES_PER_MINUTE; i++)
      expect(sync(store, first.epoch, i, "x").status).toBe(200);
    const limited = sync(store, first.epoch, WRITES_PER_MINUTE, "x");
    expect(limited.status).toBe(429);
    expect(limited.reply).toMatchObject({ ok: false, error: "rate" });
    // Reading still works.
    expect(sync(store, first.epoch, WRITES_PER_MINUTE).status).toBe(200);
    clock += 61_000;
    expect(sync(store, first.epoch, WRITES_PER_MINUTE, "x").status).toBe(200);

    const big = new Uint8Array(MAX_BOX_BYTES);
    const full = call(store, { op: "sync", epoch: first.epoch, since: 0, size: big.length }, big);
    expect(full.status).toBe(413);
  });

  it("moves its expiry (half a year unused) forward at most once a week", () => {
    const store = new MemoryBoxStore();
    const first = sync(store, null, null, "x");
    expect(first.alarmAt).toBe(clock + EXPIRE_AFTER);
    expect(EXPIRE_AFTER).toBeLessThanOrEqual(183 * 24 * 60 * 60 * 1000);
    const epoch = ok(first.reply).op === "sync" ? (first.reply as { epoch: string }).epoch : "";
    clock += 3 * 24 * 60 * 60 * 1000;
    expect(sync(store, epoch, 1).alarmAt).toBeNull();
    clock += EXPIRY_STEP;
    expect(sync(store, epoch, 1).alarmAt).toBe(clock + EXPIRE_AFTER);
    // A closed box's marker stays longer: a device back late still stops.
    expect(call(store, { op: "close" }).alarmAt).toBe(clock + CLOSED_KEPT);
  });

  it("writes one row per change sent, and none to say what's new", () => {
    const store = new MemoryBoxStore();
    const first = ok(sync(store, null, null, "1").reply);
    if (first.op !== "sync") throw new Error();
    // Made: its record and the change.
    expect(store.rowsWritten).toBe(2);
    sync(store, first.epoch, 1, "2");
    expect(store.rowsWritten).toBe(3);
    for (let i = 0; i < 5; i++) sync(store, first.epoch, 2);
    sync(store, null, null);
    expect(store.rowsWritten).toBe(3);
    // Folding: the snapshot's part, its record, and the folded changes dropped at once (not a row each).
    for (let i = 3; i <= 40; i++) {
      clock += 4000;
      expect(sync(store, first.epoch, i - 1, String(i)).status).toBe(200);
    }
    clock += 61_000;
    const before = store.rowsWritten;
    expect(
      call(store, { op: "snapshot", epoch: first.epoch, upto: 40, gen: 0, size: 3 }, bytes("all"))
        .status,
    ).toBe(200);
    expect(store.rowsWritten - before).toBeLessThanOrEqual(4);
    expect(sync(store, null, null).parts).toEqual(["all"]);
    // And numbering goes on after them.
    const next = ok(sync(store, first.epoch, 40, "41").reply);
    expect(next.op === "sync" && next.appended).toBe(41);
  });

  it("hands the counters only to a device that sent something", () => {
    const store = new MemoryBoxStore();
    const first = ok(sync(store, null, null, "abc").reply);
    if (first.op !== "sync") throw new Error();
    expect(first.stats).toEqual({ ops: 1, opsBytes: 3, snapshotBytes: 0 });
    const asked = ok(sync(store, first.epoch, 1).reply);
    expect(asked.op === "sync" && asked.stats).toBeNull();
  });

  it("leaves the box as it was when a fold is refused, and folds at most every few seconds", () => {
    const store = new MemoryBoxStore();
    const first = ok(sync(store, null, null, "1").reply);
    if (first.op !== "sync") throw new Error();
    sync(store, first.epoch, 1, "2");
    const big = new Uint8Array(MAX_BOX_BYTES);
    expect(
      call(store, { op: "snapshot", epoch: first.epoch, upto: 1, gen: 0, size: big.length }, big)
        .status,
    ).toBe(413);
    expect(sync(store, null, null).parts).toEqual(["1", "2"]);

    expect(
      call(store, { op: "snapshot", epoch: first.epoch, upto: 1, gen: 0, size: 1 }, bytes("A"))
        .status,
    ).toBe(200);
    expect(sync(store, null, null).parts).toEqual(["A", "2"]);
    const soon = call(
      store,
      { op: "snapshot", epoch: first.epoch, upto: 2, gen: 1, size: 2 },
      bytes("AB"),
    );
    expect(soon.status).toBe(429);
    clock += SNAPSHOT_GAP;
    expect(
      call(store, { op: "snapshot", epoch: first.epoch, upto: 2, gen: 1, size: 2 }, bytes("AB"))
        .status,
    ).toBe(200);
    expect(sync(store, null, null).parts).toEqual(["AB"]);
  });
});
