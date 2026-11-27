import { describe, expect, it } from "vitest";
import { newSecret } from "./syncCode";
import { deriveKeys, seal, unseal, SyncDataError } from "./syncCrypto";
import { BOX_ID, BOX_PASS } from "./syncWire";

describe("sync sealing", () => {
  it("derives the same box, pass and key from the same code, and others from another", async () => {
    const secret = newSecret();
    const [a, b, c] = await Promise.all([
      deriveKeys(secret),
      deriveKeys(new Uint8Array(secret)),
      deriveKeys(newSecret()),
    ]);
    expect(a.box).toMatch(BOX_ID);
    expect(a.pass).toMatch(BOX_PASS);
    expect(b.box).toBe(a.box);
    expect(b.pass).toBe(a.pass);
    expect(c.box).not.toBe(a.box);
    expect(a.pass).not.toContain(a.box);
  });

  it("opens what it sealed, and nothing else", async () => {
    const keys = await deriveKeys(newSecret());
    const value = {
      v: 6,
      data: { entries: [{ id: "e1", text: "La lluvia golpea los postigos. ¿Quién llama?" }] },
    };
    const sealed = await seal(keys, "op", value);
    expect(new TextDecoder().decode(sealed)).not.toContain("lluvia");
    expect(await unseal(keys, "op", sealed)).toEqual(value);

    // Another code, the other kind, a byte changed: refused.
    await expect(unseal(await deriveKeys(newSecret()), "op", sealed)).rejects.toThrow(
      SyncDataError,
    );
    await expect(unseal(keys, "snapshot", sealed)).rejects.toThrow(SyncDataError);
    const tampered = sealed.slice();
    tampered[tampered.length - 1] ^= 1;
    await expect(unseal(keys, "op", tampered)).rejects.toThrow(SyncDataError);
    await expect(unseal(keys, "op", new Uint8Array(4))).rejects.toThrow(SyncDataError);
  });

  it("compresses: a long journal travels small", async () => {
    const keys = await deriveKeys(newSecret());
    const entries = Array.from({ length: 2000 }, (_, i) => ({
      id: `e${i}`,
      adventureId: "a",
      timestamp: i,
      kind: "note",
      text: "Busco a Odile en la posada del cruce",
    }));
    const json = JSON.stringify({ v: 6, data: { entries } });
    const sealed = await seal(keys, "snapshot", { v: 6, data: { entries } });
    expect(sealed.length).toBeLessThan(json.length / 5);
  });
});
