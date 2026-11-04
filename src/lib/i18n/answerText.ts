import type { Answer, Qualifier } from "../oracle";
import type { Dictionary } from "./types";

/** "Yes" / "Yes, and." / "No, but." … according to the active dictionary. */
export function formatAnswer(
  t: Dictionary,
  roll: { answer: Answer; qualifier: Qualifier },
): string {
  const base = t.answer[roll.answer];
  if (!roll.qualifier) return base;
  return `${base}, ${t.qualifier[roll.qualifier]}.`;
}
