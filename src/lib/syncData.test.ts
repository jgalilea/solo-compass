import { describe, expect, it } from "vitest";
import { changedRecords, emptyData, fingerprint, printsAfter, splitData } from "./syncData";
import type { MergeData } from "./backupMerge";

const data = (d: Partial<MergeData>): MergeData => ({ ...emptyData(), ...d });

describe("sync fingerprints", () => {
  it("are the same for the same content, whatever the order of its keys", () => {
    expect(fingerprint({ a: 1, b: { c: [1, 2], d: "x" } })).toBe(
      fingerprint({ b: { d: "x", c: [1, 2] }, a: 1 }),
    );
    expect(fingerprint({ a: 1, gone: undefined })).toBe(fingerprint({ a: 1 }));
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
  });

  it("send only what the relay doesn't have, and remember it once sent", async () => {
    const local = data({
      deleted: [
        { id: "x", at: 1 },
        { id: "y", at: 2 },
      ],
    });
    const first = await changedRecords(local, new Map());
    expect(first.delta.deleted).toHaveLength(2);
    const prints = printsAfter(new Map(), first.sent, emptyData(), local);
    expect((await changedRecords(local, prints)).delta.deleted).toHaveLength(0);
    const later = data({ deleted: [...local.deleted, { id: "z", at: 3 }] });
    expect((await changedRecords(later, prints)).delta.deleted).toEqual([{ id: "z", at: 3 }]);
  });

  it("keep a record kept here over what came in as a change still to send", async () => {
    const mine = { id: "x", at: 5 };
    const theirs = { id: "x", at: 1 };
    const prints = printsAfter(
      new Map(),
      new Map(),
      data({ deleted: [theirs] }),
      data({ deleted: [mine] }),
    );
    expect((await changedRecords(data({ deleted: [mine] }), prints)).delta.deleted).toEqual([mine]);
    // Came in as is: nothing to send back.
    const same = printsAfter(
      new Map(),
      new Map(),
      data({ deleted: [theirs] }),
      data({ deleted: [theirs] }),
    );
    expect((await changedRecords(data({ deleted: [theirs] }), same)).delta.deleted).toEqual([]);
  });

  it("split a big upload in parts, every record once", () => {
    const deleted = Array.from({ length: 25 }, (_, i) => ({ id: `d${i}`, at: i }));
    const parts = splitData(data({ deleted }), 10);
    expect(parts.map((p) => p.deleted.length)).toEqual([10, 10, 5]);
    expect(splitData(data({ deleted: deleted.slice(0, 3) }), 10)).toHaveLength(1);
  });
});
