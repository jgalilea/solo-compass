import { describe, expect, it } from "vitest";
import { sceneVerdict } from "./sceneCheck";

describe("sceneVerdict", () => {
  it("reads every answer as how the scene starts", () => {
    expect(sceneVerdict({ answer: "si", qualifier: null })).toBe("expected");
    expect(sceneVerdict({ answer: "si", qualifier: "y" })).toBe("expectedAnd");
    expect(sceneVerdict({ answer: "si", qualifier: "pero" })).toBe("expectedBut");
    expect(sceneVerdict({ answer: "no", qualifier: null })).toBe("altered");
    expect(sceneVerdict({ answer: "no", qualifier: "pero" })).toBe("alteredBut");
    expect(sceneVerdict({ answer: "no", qualifier: "y" })).toBe("interrupted");
    expect(sceneVerdict({ answer: "contradiccion", qualifier: null })).toBe("interrupted");
  });

  it("a Loner twist interrupts the scene whatever the answer", () => {
    expect(sceneVerdict({ answer: "si", qualifier: null, twist: { counter: 0, happened: true } })).toBe("interrupted");
    expect(sceneVerdict({ answer: "si", qualifier: null, twist: { counter: 2, happened: false } })).toBe("expected");
  });
});
