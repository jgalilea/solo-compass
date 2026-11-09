/**
 * Testing a new scene, optional: you write the scene you expect and the
 * oracle that's selected answers "Does the scene go as I expected?",
 * at "Likely" (most scenes do). No rules of its own: just the selected
 * oracle and a reading of its answer. Whether it's on is a per-device
 * setting, off until the player turns it on.
 */

import type { OracleRoll } from "./oracle";

/** Most scenes go as expected: asked at "Likely". */
export const SCENE_CHECK_LIKELIHOOD = "probable" as const;

/** How the scene starts, read from the oracle's answer. */
export type SceneVerdict = "expected" | "expectedAnd" | "expectedBut" | "altered" | "alteredBut" | "interrupted";

/**
 * Yes: as expected ("and" heightens it, "but" changes something small).
 * No: altered ("but": only a little). "No, and", a contradiction or a
 * Loner twist: interrupted, something else happens instead.
 */
export function sceneVerdict(roll: Pick<OracleRoll, "answer" | "qualifier" | "twist">): SceneVerdict {
  if (roll.answer === "contradiccion" || roll.twist?.happened) return "interrupted";
  if (roll.answer === "si") return roll.qualifier === "y" ? "expectedAnd" : roll.qualifier === "pero" ? "expectedBut" : "expected";
  return roll.qualifier === "y" ? "interrupted" : roll.qualifier === "pero" ? "alteredBut" : "altered";
}

const STORAGE_KEY = "solo-compass:scene-check";

export function loadSceneCheck(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function saveSceneCheck(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, "on");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not critical: it's just off next time.
  }
}
