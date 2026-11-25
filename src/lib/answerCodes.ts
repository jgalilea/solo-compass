import type { Answer } from "./oracle";

/** Lonelog's answer codes (§3.2.2): "Y", "Nb", "Yx"…, maybe with the roll after them ("Nb (3)"). */
export const ANSWER_CODE = /^([YN])([abx]?)(?=\s*(?:\(|$))/;

/** An answer's code as its parts; null if it isn't one. */
export function readAnswerCode(result: string): { answer: Answer; shade: "" | "a" | "b" | "x"; rest: string } | null {
  const m = result.match(ANSWER_CODE);
  return m && { answer: m[1] === "Y" ? "si" : "no", shade: m[2] as "" | "a" | "b" | "x", rest: result.slice(m[0].length).trim() };
}
