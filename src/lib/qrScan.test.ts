import { describe, expect, it } from "vitest";
import { codeFromScan } from "./qrScan";
import { compactCode, formatCode, newSecret } from "./syncCode";

describe("scanning the sync's QR code", () => {
  const code = formatCode(newSecret());

  it("reads the code from the app's link, wherever the app is served", () => {
    expect(
      codeFromScan(`https://jgalilea.github.io/solo-compass/#/?vincular=${compactCode(code)}`),
    ).toBe(compactCode(code));
    expect(
      codeFromScan(`http://localhost:4174/solo-compass/#/?vincular=${compactCode(code)}\n`),
    ).toBe(compactCode(code));
  });

  it("reads the code on its own too, as it's shown", () => {
    expect(codeFromScan(code)).toBe(code);
    expect(codeFromScan(` ${code.toLowerCase()} `)).toBe(code.toLowerCase());
  });

  it("refuses anything else: another link, a mistyped code, text", () => {
    expect(codeFromScan("https://example.com/")).toBeNull();
    expect(codeFromScan("https://jgalilea.github.io/solo-compass/#/?vincular=ABCD")).toBeNull();
    expect(
      codeFromScan(`https://jgalilea.github.io/solo-compass/#/diario?otra=${compactCode(code)}`),
    ).toBeNull();
    expect(codeFromScan(code.slice(0, -1) + (code.endsWith("0") ? "1" : "0"))).toBeNull();
    expect(codeFromScan("hola")).toBeNull();
    expect(codeFromScan("")).toBeNull();
  });
});
