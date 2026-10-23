import { afterEach, describe, expect, it, vi } from "vitest";
import { LIKELIHOOD_DICE, rollOracle, type Likelihood } from "./oracle";

/**
 * Fuerza los valores de los d6 en el orden en que se tiran: primero
 * todos los blancos y luego todos los negros (como hace rollOracle).
 */
function forceDice(...values: number[]) {
  const spy = vi.spyOn(Math, "random");
  for (const v of values) spy.mockReturnValueOnce((v - 1) / 6 + 0.01);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rollOracle (Recluse)", () => {
  it("blanco más alto → Sí", () => {
    forceDice(5, 2);
    const roll = rollOracle("¿Hay alguien?", "equilibrado");
    expect(roll.answer).toBe("si");
    expect(roll.white.kept).toBe(5);
    expect(roll.black.kept).toBe(2);
  });

  it("negro más alto → No", () => {
    forceDice(1, 6);
    expect(rollOracle("?", "equilibrado").answer).toBe("no");
  });

  it("empate → Contradicción, sin matiz aunque los dados sean altos o bajos", () => {
    forceDice(6, 6);
    const high = rollOracle("?", "equilibrado");
    expect(high.answer).toBe("contradiccion");
    expect(high.qualifier).toBeNull();

    forceDice(2, 2);
    expect(rollOracle("?", "equilibrado").qualifier).toBeNull();
  });

  it("ambos bajos (≤3) → «pero»", () => {
    forceDice(3, 1);
    const roll = rollOracle("?", "equilibrado");
    expect(roll.answer).toBe("si");
    expect(roll.qualifier).toBe("pero");
  });

  it("ambos altos (≥4) → «y además»", () => {
    forceDice(4, 6);
    const roll = rollOracle("?", "equilibrado");
    expect(roll.answer).toBe("no");
    expect(roll.qualifier).toBe("y");
  });

  it("uno bajo y otro alto → respuesta seca", () => {
    forceDice(3, 4);
    expect(rollOracle("?", "equilibrado").qualifier).toBeNull();
  });

  it("con dados extra se queda con el más alto de cada color", () => {
    // Muy probable: tres blancos y un negro.
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

  it("las probabilidades favorecen al color que deben", () => {
    const rate = (likelihood: Likelihood) => {
      let yes = 0;
      for (let i = 0; i < 4000; i++) if (rollOracle("?", likelihood).answer === "si") yes++;
      return yes / 4000;
    };
    // Equilibrado: 15/36 ≈ 0,42 de Sí (el resto, No o Contradicción).
    expect(rate("muy-improbable")).toBeLessThan(rate("equilibrado"));
    expect(rate("equilibrado")).toBeLessThan(rate("muy-probable"));
  });

  it("guarda la pregunta sin espacios sobrantes", () => {
    expect(rollOracle("  ¿Llueve?  ", "equilibrado").question).toBe("¿Llueve?");
  });
});
