import { afterEach, describe, expect, it, vi } from "vitest";
import { LIKELIHOOD_DICE, rollOracle, type Likelihood } from "./oracle";

/**
 * Forces the d6 values in the order they're rolled: first all the
 * white ones and then all the black ones (as rollOracle does).
 */
function forceDice(...values: number[]) {
  const spy = vi.spyOn(Math, "random");
  for (const v of values) spy.mockReturnValueOnce((v - 1) / 6 + 0.01);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rollOracle (Recluse)", () => {
  it("higher white → Yes", () => {
    forceDice(5, 2);
    const roll = rollOracle("¿Hay alguien?", "equilibrado");
    expect(roll.answer).toBe("si");
    expect(roll.white.kept).toBe(5);
    expect(roll.black.kept).toBe(2);
  });

  it("higher black → No", () => {
    forceDice(1, 6);
    expect(rollOracle("?", "equilibrado").answer).toBe("no");
  });

  it("tie → Contradiction, with no qualifier even if the dice are high or low", () => {
    forceDice(6, 6);
    const high = rollOracle("?", "equilibrado");
    expect(high.answer).toBe("contradiccion");
    expect(high.qualifier).toBeNull();

    forceDice(2, 2);
    expect(rollOracle("?", "equilibrado").qualifier).toBeNull();
  });

  it("both low (≤3) → \"but\"", () => {
    forceDice(3, 1);
    const roll = rollOracle("?", "equilibrado");
    expect(roll.answer).toBe("si");
    expect(roll.qualifier).toBe("pero");
  });

  it("both high (≥4) → \"and\"", () => {
    forceDice(4, 6);
    const roll = rollOracle("?", "equilibrado");
    expect(roll.answer).toBe("no");
    expect(roll.qualifier).toBe("y");
  });

  it("one low and one high → plain answer", () => {
    forceDice(3, 4);
    expect(rollOracle("?", "equilibrado").qualifier).toBeNull();
  });

  it("with extra dice, keeps the highest of each colour", () => {
    // Very likely: three white and one black.
    forceDice(1, 5, 2, 4);
    const roll = rollOracle("?", "muy-probable");
    expect(roll.white.rolls).toEqual([1, 5, 2]);
    expect(roll.white.kept).toBe(5);
    expect(roll.black.rolls).toEqual([4]);
    expect(roll.answer).toBe("si");
    expect(roll.qualifier).toBe("y");
  });

  it.each(Object.entries(LIKELIHOOD_DICE) as [Likelihood, { white: number; black: number }][])(
    "%s lanza el número de dados que toca",
    (likelihood, config) => {
      const roll = rollOracle("?", likelihood);
      expect(roll.white.rolls).toHaveLength(config.white);
      expect(roll.black.rolls).toHaveLength(config.black);
      for (const v of [...roll.white.rolls, ...roll.black.rolls]) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(6);
      }
    },
  );

  it("likelihoods favour the right colour", () => {
    const rate = (likelihood: Likelihood) => {
      let yes = 0;
      for (let i = 0; i < 4000; i++) if (rollOracle("?", likelihood).answer === "si") yes++;
      return yes / 4000;
    };
    // Even: 15/36 ≈ 0.42 Yes (the rest, No or Contradiction).
    expect(rate("muy-improbable")).toBeLessThan(rate("equilibrado"));
    expect(rate("equilibrado")).toBeLessThan(rate("muy-probable"));
  });

  it("saves the question without extra whitespace", () => {
    expect(rollOracle("  ¿Llueve?  ", "equilibrado").question).toBe("¿Llueve?");
  });
});
