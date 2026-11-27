import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleBox, type BoxRequest } from "../../relay/src/box";
import { MemoryBoxStore } from "../../relay/src/memoryStore";
import type { MergeData } from "./backupMerge";
import type { Adventure } from "./journal";
import type { JournalEntry } from "./lonelog";
import { formatCode, newSecret, parseCode } from "./syncCode";
import { deriveKeys, type SyncKeys } from "./syncCrypto";
import { emptyData, type Prints } from "./syncData";
import { exchange, prepareChange, RECORDS_PER_PART, STALE_AFTER, type Relay, type SyncDevice, type SyncState } from "./syncExchange";
import type { HistoryEntry } from "./history";
import { callRelay } from "./syncRelay";
import { MAX_BOX_BYTES, MAX_REQUEST_BYTES, decodeFrame, parseSyncRequest } from "./syncWire";

const adventure = (id: string, extra: Partial<Adventure> = {}): Adventure => ({
  id,
  name: id,
  createdAt: 1,
  updatedAt: 1,
  favorite: false,
  status: "ongoing",
  ...extra,
});
const entry = (id: string, adventureId: string, text: string, extra: Partial<JournalEntry> = {}): JournalEntry => ({
  id,
  adventureId,
  timestamp: 10,
  kind: "note",
  text,
  ...extra,
});

/** The relay's own code behind a stubbed fetch, one box per id. */
let boxes: Map<string, MemoryBoxStore>;
let requests: number;
/** The biggest request body seen. */
let biggest: number;
/** The relay's clock: a few seconds per request, so a test doesn't hit the per-minute limit. */
let clock: number;
beforeEach(() => {
  boxes = new Map();
  requests = 0;
  biggest = 0;
  clock = Date.now();
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    requests++;
    biggest = Math.max(biggest, (init.body as Uint8Array).length);
    const { header, payload } = decodeFrame(init.body as Uint8Array);
    const parsed = parseSyncRequest(header, payload.length);
    if (!parsed) return new Response("bad", { status: 400 });
    const { pass, ...rest } = parsed;
    const store = boxes.get(parsed.box) ?? new MemoryBoxStore();
    boxes.set(parsed.box, store);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pass));
    const passHash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const result = handleBox(store, { ...rest, passHash } as BoxRequest, payload, {
      now: (clock += 4000),
      newEpoch: () => crypto.randomUUID(),
      wait: 0,
    });
    return new Response(result.frame as Uint8Array<ArrayBuffer>, { status: result.status });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const relay: Relay = (request, payload) => callRelay("https://relay.test", request, payload);

/** A device in memory: what it holds, its sync state and prints. */
class Device {
  data: MergeData;
  state: SyncState;
  prints: Prints = new Map();
  keys!: SyncKeys;

  constructor(code: string, data: Partial<MergeData> = {}) {
    this.data = { ...emptyData(), ...data };
    this.state = { code, epoch: null, since: null, gen: 0, lastSyncAt: null };
  }

  get device(): SyncDevice {
    return {
      // Fresh objects each time, like IndexedDB.
      loadData: async () => structuredClone(this.data),
      saveChanges: async (_before, after) => {
        this.data = structuredClone(after);
      },
      announce: () => {},
      saveState: async (state) => {
        this.state = structuredClone(state);
      },
      loadPrints: async () => new Map(this.prints),
      savePrints: async (prints) => {
        this.prints = new Map(prints);
      },
    };
  }

  async sync() {
    this.keys ??= await deriveKeys(parseCode(this.state.code)!);
    const outcome = await exchange(this.device, relay, this.keys, this.state);
    if (outcome.kind === "ok") this.state = outcome.state;
    return outcome;
  }

  ids(kind: keyof MergeData): string[] {
    return (this.data[kind] as { id: string }[]).map((r) => r.id).sort();
  }
}

/** Syncs until nothing more is sent (a reset asks for a second round). */
async function settle(...devices: Device[]) {
  for (let round = 0; round < 3; round++) for (const d of devices) await d.sync();
}

describe("sync exchange", () => {
  it("brings two devices to the same journal", async () => {
    const code = formatCode(newSecret());
    const phone = new Device(code, { adventures: [adventure("a1")], entries: [entry("e1", "a1", "En el móvil")] });
    const laptop = new Device(code, { adventures: [adventure("a2")], entries: [entry("e2", "a2", "En el portátil")] });

    expect((await phone.sync()).kind).toBe("ok");
    await laptop.sync();
    await phone.sync();
    expect(phone.ids("adventures")).toEqual(["a1", "a2"]);
    expect(laptop.ids("adventures")).toEqual(["a1", "a2"]);
    expect(phone.data.entries.find((e) => e.id === "e2")?.text).toBe("En el portátil");
    expect(laptop.ids("entries")).toEqual(["e1", "e2"]);
  });

  it("sends nothing more once both have everything", async () => {
    const code = formatCode(newSecret());
    const a = new Device(code, {
      adventures: [adventure("a1", { notes: "Pistas", notesUpdatedAt: 50, updatedAt: 5 })],
      entries: [entry("e1", "a1", "Uno")],
    });
    const b = new Device(code, { adventures: [adventure("a1", { oracle: "loner", oracleUpdatedAt: 60, updatedAt: 7 })] });
    await settle(a, b);
    // Both took the newest of each part of the adventure.
    for (const d of [a, b]) expect(d.data.adventures[0]).toMatchObject({ notes: "Pistas", oracle: "loner", updatedAt: 7 });
    const box = [...boxes.values()][0];
    const latest = box.lastChange();
    const written = box.rowsWritten;
    await settle(a, b);
    expect(box.lastChange()).toBe(latest);
    // Asking for what's new writes nothing on the relay.
    expect(box.rowsWritten).toBe(written);
  });

  it("notes when something last came from another device", async () => {
    const code = formatCode(newSecret());
    const phone = new Device(code, { adventures: [adventure("a1")] });
    await phone.sync();
    await phone.sync();
    // Alone: nothing has ever come in.
    expect(phone.state.othersSeenAt).toBeUndefined();
    const laptop = new Device(code);
    await laptop.sync();
    expect(laptop.state.othersSeenAt).toBeGreaterThan(0);
    laptop.data.entries.push(entry("e1", "a1", "Desde el portátil"));
    await laptop.sync();
    await phone.sync();
    expect(phone.state.othersSeenAt).toBeGreaterThan(0);
  });

  it("makes no request after a change that left nothing to send", async () => {
    const code = formatCode(newSecret());
    const a = new Device(code, { adventures: [adventure("a1")] });
    await a.sync();
    requests = 0;
    const quiet = await exchange(a.device, relay, a.keys, a.state, Date.now, { onlyToSend: true });
    expect(quiet).toMatchObject({ kind: "ok", skipped: true });
    expect(requests).toBe(0);
    a.data.entries.push(entry("e1", "a1", "Algo nuevo"));
    const sent = await exchange(a.device, relay, a.keys, a.state, Date.now, { onlyToSend: true });
    expect(sent.kind === "ok" && sent.skipped).toBeFalsy();
    expect(requests).toBe(1);
  });

  it("sends a change prepared ahead the moment the app is left, and takes its answer in", async () => {
    const code = formatCode(newSecret());
    const phone = new Device(code, { adventures: [adventure("a1")] });
    const laptop = new Device(code);
    await settle(phone, laptop);

    phone.data.entries.push(entry("e1", "a1", "Escrito antes de cerrar"));
    const ready = (await prepareChange(phone.device, phone.keys, phone.state, 60 * 1024))!;
    expect(ready.part.entries.map((e) => e.id)).toEqual(["e1"]);
    // Leaving: sent at once; the exchange after it only takes the answer in.
    requests = 0;
    const inFlight = { change: ready, result: relay(ready.request, ready.op), sentAt: Date.now() };
    const outcome = await exchange(phone.device, relay, phone.keys, phone.state, Date.now, { inFlight });
    expect(outcome.kind).toBe("ok");
    if (outcome.kind === "ok") phone.state = outcome.state;
    expect(requests).toBe(1);
    // It's known to be sent: nothing more goes.
    expect(await exchange(phone.device, relay, phone.keys, phone.state, Date.now, { onlyToSend: true })).toMatchObject({ skipped: true });
    await laptop.sync();
    expect(laptop.ids("entries")).toEqual(["e1"]);
  });

  it("sends a prepared change again if the app closed before its answer, and nothing doubles", async () => {
    const code = formatCode(newSecret());
    const phone = new Device(code, { adventures: [adventure("a1")] });
    const laptop = new Device(code);
    await settle(phone, laptop);
    phone.data.entries.push(entry("e1", "a1", "Escrito antes de cerrar"));
    const ready = (await prepareChange(phone.device, phone.keys, phone.state, 60 * 1024))!;
    // Sent on leaving, and the page was gone before the answer: nothing taken in.
    await relay(ready.request, ready.op);
    await laptop.sync();
    expect(laptop.ids("entries")).toEqual(["e1"]);
    // Opened again: it doesn't know it went, so it goes again; harmless.
    await settle(phone, laptop);
    expect(laptop.ids("entries")).toEqual(["e1"]);
    expect(phone.ids("entries")).toEqual(["e1"]);
  });

  it("doesn't read an answer held up in the background as a clock off", async () => {
    const code = formatCode(newSecret());
    const phone = new Device(code, { adventures: [adventure("a1")] });
    await phone.sync();
    phone.data.entries.push(entry("e1", "a1", "Escrito antes de cerrar"));
    const ready = (await prepareChange(phone.device, phone.keys, phone.state, 60 * 1024))!;
    // Sent ten minutes ago, the page frozen since: the answer is taken in now.
    const inFlight = { change: ready, result: relay(ready.request, ready.op), sentAt: Date.now() - 10 * 60_000 };
    const outcome = await exchange(phone.device, relay, phone.keys, phone.state, Date.now, { inFlight });
    expect(outcome).toMatchObject({ kind: "ok", skew: 0 });
  });

  it("prepares nothing when there's nothing to send, or it isn't a small change", async () => {
    const code = formatCode(newSecret());
    const phone = new Device(code, { adventures: [adventure("a1")] });
    // Never synced: the first upload goes the usual way.
    expect(await prepareChange(phone.device, (phone.keys ??= await deriveKeys(parseCode(code)!)), phone.state, 60 * 1024)).toBeNull();
    await phone.sync();
    expect(await prepareChange(phone.device, phone.keys, phone.state, 60 * 1024)).toBeNull();
    // Text that doesn't compress, past what a request on leaving may carry.
    const noise = Array.from(crypto.getRandomValues(new Uint8Array(4096)), (b) => b.toString(36)).join("");
    phone.data.entries.push(entry("e1", "a1", noise));
    expect(await prepareChange(phone.device, phone.keys, phone.state, 1024)).toBeNull();
    expect(await prepareChange(phone.device, phone.keys, phone.state, 60 * 1024)).not.toBeNull();
  });

  it("carries edits and deletions, and deleted things don't come back", async () => {
    const code = formatCode(newSecret());
    const a = new Device(code, {
      adventures: [adventure("a1")],
      entries: [entry("e1", "a1", "Primera"), entry("e2", "a1", "Segunda")],
    });
    const b = new Device(code);
    await settle(a, b);

    b.data.entries = b.data.entries.map((e) => (e.id === "e1" ? { ...e, text: "Primera, corregida", editedAt: 99 } : e));
    a.data.entries = a.data.entries.filter((e) => e.id !== "e2");
    a.data.deleted = [{ id: "e2", at: Date.now() }];
    await settle(a, b);

    for (const d of [a, b]) {
      expect(d.ids("entries")).toEqual(["e1"]);
      expect(d.data.entries[0].text).toBe("Primera, corregida");
    }
  });

  it("folds many changes into a snapshot that a new device starts from", async () => {
    const code = formatCode(newSecret());
    const a = new Device(code, { adventures: [adventure("a1")] });
    await a.sync();
    for (let i = 0; i < 105; i++) {
      a.data.entries = [...a.data.entries, entry(`e${i}`, "a1", `Entrada ${i}`, { timestamp: 100 + i })];
      await a.sync();
    }
    const box = [...boxes.values()][0];
    expect(box.meta()!.gen).toBeGreaterThan(0);
    expect(box.changeStatsAfter(box.meta()!.upto).count).toBeLessThan(100);
    const c = new Device(code);
    await c.sync();
    expect(c.ids("entries")).toHaveLength(105);
  });

  it("sends a big first upload in parts", async () => {
    const code = formatCode(newSecret());
    const count = RECORDS_PER_PART * 2 + 10;
    const a = new Device(code, {
      adventures: [adventure("a1")],
      entries: Array.from({ length: count }, (_, i) => entry(`e${i}`, "a1", `Entrada ${i}`)),
    });
    requests = 0;
    await a.sync();
    // Three parts, each a change of its own.
    expect(requests).toBe(3);
    const b = new Device(code);
    await b.sync();
    expect(b.ids("entries")).toHaveLength(count);
  });

  it("starts over with a box made again (it expired)", async () => {
    const code = formatCode(newSecret());
    const a = new Device(code, { adventures: [adventure("a1")], entries: [entry("e1", "a1", "Uno")] });
    await a.sync();
    for (const box of boxes.values()) box.wipe();
    const outcome = await a.sync();
    expect(outcome).toMatchObject({ kind: "ok", followUp: true });
    await a.sync();
    const b = new Device(code);
    await b.sync();
    expect(b.ids("entries")).toEqual(["e1"]);
  });

  it("asks before merging on a device unsynced for most of a year", async () => {
    const code = formatCode(newSecret());
    const a = new Device(code, { adventures: [adventure("a1")], entries: [entry("old", "a1", "Vieja")] });
    const b = new Device(code);
    await settle(a, b);
    // On A, "old" is deleted; B sleeps in a drawer for a year.
    a.data.entries = [entry("new", "a1", "Nueva")];
    a.data.deleted = [{ id: "old", at: Date.now() }];
    await a.sync();
    b.state = { ...b.state, lastSyncAt: Date.now() - STALE_AFTER - 1000 };

    expect(await b.sync()).toMatchObject({ kind: "stale" });
    expect(b.ids("entries")).toEqual(["old"]);

    b.state = { ...b.state, staleChoice: "server" };
    expect((await b.sync()).kind).toBe("ok");
    expect(b.ids("entries")).toEqual(["new"]);
    expect(b.state.staleChoice).toBeUndefined();
  });

  it("stops before merging what a newer app wrote", async () => {
    const code = formatCode(newSecret());
    const a = new Device(code, { adventures: [adventure("a1")] });
    await a.sync();
    const { seal } = await import("./syncCrypto");
    const sealed = await seal(a.keys, "op", { v: 999, data: { adventures: [adventure("future")] } });
    const store = [...boxes.values()][0];
    store.appendChange((store.lastChange() ?? 0) + 1, Date.now(), sealed);
    const b = new Device(code);
    expect(await b.sync()).toMatchObject({ kind: "problem", reason: "update" });
    expect(b.data.adventures).toEqual([]);
  });

  it("says when the box was closed", async () => {
    const code = formatCode(newSecret());
    const a = new Device(code, { adventures: [adventure("a1")] });
    await a.sync();
    const keys = await deriveKeys(parseCode(code)!);
    await relay({ v: 1, op: "close", box: keys.box, pass: keys.pass });
    expect(await a.sync()).toMatchObject({ kind: "failed", error: "closed" });
  });

  it("carries years of play, within the relay's limits, and then only what changed", { timeout: 120_000 }, async () => {
    const data = yearsOfPlay();
    const counts = `${data.entries!.length} entries, ${data.history!.length} rolls`;
    const code = formatCode(newSecret());
    const phone = new Device(code, data);
    const laptop = new Device(code);

    let started = performance.now();
    expect((await phone.sync()).kind).toBe("ok");
    const upload = performance.now() - started;
    expect(biggest).toBeLessThanOrEqual(MAX_REQUEST_BYTES + 16 * 1024);
    const box = [...boxes.values()][0];
    const stored = box.meta()!.snapshotBytes + box.changeStatsAfter(box.meta()!.upto).bytes;
    expect(stored).toBeLessThan(MAX_BOX_BYTES / 4);

    started = performance.now();
    expect((await laptop.sync()).kind).toBe("ok");
    const download = performance.now() - started;
    for (const kind of ["history", "adventures", "entries"] as const) expect(laptop.ids(kind)).toEqual(phone.ids(kind));
    expect(laptop.data.entries.find((e) => e.id === "big-e4321")).toEqual(phone.data.entries.find((e) => e.id === "big-e4321"));

    // A normal day after that: one entry written, and only it travels.
    phone.data.entries.push(entry("fresh", "big", "Una entrada más."));
    requests = 0;
    biggest = 0;
    started = performance.now();
    await phone.sync();
    const steady = performance.now() - started;
    expect(requests).toBe(1);
    expect(biggest).toBeLessThan(2048);
    await laptop.sync();
    expect(laptop.data.entries.some((e) => e.id === "fresh")).toBe(true);

    console.log(
      `Years of play: ${counts}; ` +
        `${Math.round(stored / 1024)} KB on the relay; first upload ${Math.round(upload)} ms, ` +
        `download ${Math.round(download)} ms, an exchange after one change ${Math.round(steady)} ms`,
    );
  });
});

/** Like e2e/volume.perf.ts: years of play, with words varied enough to compress like real writing. */
function yearsOfPlay(): Partial<MergeData> {
  let seed = 42;
  const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const syllables = ["la", "ber", "tro", "mi", "son", "cal", "de", "ra", "go", "ne", "vi", "sa", "lu", "ter", "pon", "es", "quin", "dor"];
  const word = () => Array.from({ length: 1 + Math.floor(random() * 3) }, () => syllables[Math.floor(random() * syllables.length)]).join("");
  const sentence = (words: number) => Array.from({ length: words }, word).join(" ");
  const adventures: Adventure[] = [];
  const entries: JournalEntry[] = [];
  const history: HistoryEntry[] = [];
  let clock = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;
  const add = (id: string, count: number) => {
    adventures.push(adventure(id, { name: sentence(3), createdAt: clock, updatedAt: clock, notes: sentence(60) }));
    for (let i = 0; i < count; i++) {
      clock += 60_000;
      if (i % 10 === 3) {
        const white = 1 + Math.floor(random() * 6);
        const black = 1 + Math.floor(random() * 6);
        history.push({
          kind: "oraculo",
          id: `${id}-r${i}`,
          timestamp: clock,
          question: sentence(6),
          likelihood: "equilibrado",
          white: { color: "blanco", rolls: [white], kept: white },
          black: { color: "negro", rolls: [black], kept: black },
          answer: white === black ? "contradiccion" : white > black ? "si" : "no",
          qualifier: null,
          favorite: false,
        } as HistoryEntry);
        entries.push(entry(`${id}-e${i}`, id, `Recluse ${white}/${black} -> Sí`, { kind: "roll", timestamp: clock, linkedRollId: `${id}-r${i}` }));
      } else entries.push(entry(`${id}-e${i}`, id, sentence(8 + Math.floor(random() * 40)), { timestamp: clock }));
    }
  };
  add("big", 5000);
  add("unsplit", 2000);
  for (let a = 0; a < 20; a++) add(`adv${a}`, 200);
  while (history.length < 10_000) {
    clock += 60_000;
    const i = history.length;
    history.push({
      kind: "tabla",
      id: `t${i}`,
      timestamp: clock,
      tableId: "accion",
      tableName: "Acción",
      rolls: [1 + (i % 6)],
      total: 1 + (i % 6),
      resultText: sentence(2),
      favorite: false,
    } as HistoryEntry);
  }
  return { adventures, entries, history };
}
