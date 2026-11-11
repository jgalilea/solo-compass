import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "./allDictionaries";
import { splitRollText } from "../journalUi";
import type { OracleRoll } from "../oracle";
import { formatOracleDice, formatOracleResult } from "./answerText";

const t = DICTIONARIES.es;

function roll(partial: Partial<OracleRoll>): OracleRoll {
  return { kind: "oraculo", id: "r", timestamp: 0, question: "", likelihood: "equilibrado", answer: "si", qualifier: null, favorite: false, ...partial };
}

describe("oracle rolls in the journal", () => {
  it("writes each oracle's dice and keeps the answer recognisable", () => {
    const cases: [OracleRoll, string, string][] = [
      [
        roll({ white: { color: "blanco", rolls: [4], kept: 4 }, black: { color: "negro", rolls: [2], kept: 2 }, qualifier: null }),
        "blanco 4 / negro 2",
        "Sí",
      ],
      [
        roll({ oracle: "ironsworn", likelihood: "probable", dice: [{ role: "percentile", sides: 100, rolls: [77], kept: 77 }], special: "match" }),
        "d100 77 vs 26+",
        "Sí · Coincidencia",
      ],
      [
        roll({
          oracle: "opse",
          answer: "no",
          qualifier: "pero",
          dice: [
            { role: "answer", sides: 6, rolls: [2], kept: 2 },
            { role: "modifier", sides: 6, rolls: [1], kept: 1 },
          ],
        }),
        "respuesta 2 vs 4+ / matiz 1",
        "No, pero.",
      ],
      [
        roll({
          oracle: "loner",
          qualifier: "pero",
          special: "double",
          twist: { counter: 0, happened: true, result: "Un tercero · Aparece" },
          dice: [
            { role: "chance", sides: 6, rolls: [3], kept: 3 },
            { role: "risk", sides: 6, rolls: [3], kept: 3 },
          ],
        }),
        "oportunidad 3 / riesgo 3",
        "Sí, pero. · ¡Giro! · Un tercero · Aparece",
      ],
    ];
    for (const [r, dice, result] of cases) {
      expect(formatOracleDice(t, r)).toBe(dice);
      expect(formatOracleResult(t, r)).toBe(result);
      expect(splitRollText(`Oráculo — ${dice} -> ${result}`).answer).toBe(r.answer);
    }
  });

  it("shows Loner's counter after a double that brings no twist yet", () => {
    expect(formatOracleResult(t, roll({ oracle: "loner", qualifier: "pero", twist: { counter: 2, happened: false } }))).toBe(
      "Sí, pero. · dobles 2/3",
    );
  });
});
