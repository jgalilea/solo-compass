/**
 * What's half written in an adventure's composer, so leaving the
 * adventure (another tab, another screen, closing the app) doesn't lose
 * it: the text, the entry type and who speaks. Per device and per
 * adventure; gone once it's sent. Best-effort, like the other
 * localStorage settings: if storage fails, it just isn't kept.
 */

import type { ComposerMode } from "./journalUi";
import type { Speaker } from "./lonelogLines";

export interface Draft {
  text: string;
  mode: ComposerMode;
  speaker?: Speaker;
}

const key = (adventureId: string) => `solo-compass:draft:${adventureId}`;

export function loadDraft(adventureId: string): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(adventureId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return typeof parsed.text === "string" && parsed.text && typeof parsed.mode === "string"
      ? { text: parsed.text, mode: parsed.mode, speaker: parsed.speaker }
      : null;
  } catch {
    return null;
  }
}

/** An empty text clears it. */
export function saveDraft(adventureId: string, draft: Draft): void {
  if (typeof window === "undefined") return;
  try {
    if (draft.text.trim()) window.localStorage.setItem(key(adventureId), JSON.stringify(draft));
    else window.localStorage.removeItem(key(adventureId));
  } catch {
    // Not critical: if it fails, it just isn't kept.
  }
}
