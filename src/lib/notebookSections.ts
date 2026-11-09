/**
 * Which lists of the adventure notebook (characters, places, threads,
 * clocks) are folded, so a long cast takes less room in the sidebar. Per device,
 * the same for every adventure. Best-effort storage, like the Tables
 * screen's blocks: if localStorage fails, they just start unfolded.
 */

export type NotebookSection = "characters" | "places" | "rooms" | "foes" | "threads" | "progress" | "items" | "wealth";

const STORAGE_KEY = "solo-compass:notebook-sections-folded";

export function loadFoldedNotebookSections(): Set<NotebookSection> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveFoldedNotebookSections(ids: Set<NotebookSection>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Not critical: if it fails, it just doesn't persist.
  }
}
