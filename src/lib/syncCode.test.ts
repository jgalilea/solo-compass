import { describe, expect, it } from "vitest";
import { compactCode, formatCode, newSecret, parseCode } from "./syncCode";

describe("sync code", () => {
  it("reads back to the same bytes, however it's typed", () => {
    for (let i = 0; i < 200; i++) {
      const secret = newSecret();
      const code = formatCode(secret);
      expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{3}$/);
      expect(parseCode(code)).toEqual(secret);
      expect(parseCode(compactCode(code).toLowerCase())).toEqual(secret);
      expect(parseCode(` ${code.replace(/-/g, " ")} `)).toEqual(secret);
    }
  });

  it("reads O, I and L as the digits they look like", () => {
    const secret = new Uint8Array(16);
    const code = formatCode(secret);
    expect(code.startsWith("0000")).toBe(true);
    expect(parseCode(code.replace(/0/g, "O"))).toEqual(secret);
    const ones = formatCode(new Uint8Array(16).fill(0x08));
    expect(parseCode(ones.replace(/1/g, "l"))).toEqual(parseCode(ones));
  });

  it("catches any one character wrong and any two neighbours swapped", () => {
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const codes = [
      new Uint8Array(16),
      new Uint8Array(16).fill(0xff),
      ...Array.from({ length: 30 }, newSecret),
    ].map((s) => compactCode(formatCode(s)));
    // "0Z0…": Luhn mod 32 let a 0 and a Z side by side through, swapped.
    const zeroZed = new Uint8Array(16);
    zeroZed.set([0x07, 0xc0]);
    codes.push(compactCode(formatCode(zeroZed)));
    expect(codes.at(-1)!.startsWith("0Z0")).toBe(true);
    for (const code of codes) {
      for (let i = 0; i < code.length; i++) {
        for (const other of alphabet) {
          if (other === code[i]) continue;
          expect(parseCode(code.slice(0, i) + other + code.slice(i + 1))).toBeNull();
        }
      }
      for (let i = 0; i < code.length - 1; i++) {
        if (code[i] === code[i + 1]) continue;
        expect(parseCode(code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2))).toBeNull();
      }
      expect(parseCode(code.slice(1))).toBeNull();
      expect(parseCode(`${code}0`)).toBeNull();
    }
    expect(parseCode("hola")).toBeNull();
  });
});
