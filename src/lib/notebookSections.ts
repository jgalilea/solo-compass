/**
 * Which parts of the adventure's side column are folded, so a long
 * cast takes less room: the lists of the notebook (characters, places,
 * threads, clocks…) and its whole blocks (the session index, pinned
 * notes, cast, threads, inventory), and the desktop game table's
 * tools (oracle, dice, tables), for whoever doesn't use one. Per device, the same for every
 * adventure. Best-effort storage, like the Tables screen's blocks: if
 * localStorage fails, they just start unfolded.
 */

export type NotebookSection = "characters" | "places" | "rooms" | "foes" | "threads" | "progress" | "items" | "wealth";
export type NotebookBlock = "sessionsBlock" | "notesBlock" | "castBlock" | "threadsBlock" | "inventoryBlock";
export type PlayToolBlock = "oracleTool" | "diceTool" | "tableTool";
export type NotebookFold = NotebookSection | NotebookBlock | PlayToolBlock;

const STORAGE_KEY = "solo-compass:notebook-sections-folded";

export function loadFoldedNotebookSections(): Set<NotebookFold> {
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

export function saveFoldedNotebookSections(ids: Set<NotebookFold>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Not critical: if it fails, it just doesn't persist.
  }
}

/**
 * Folds or unfolds one, starting from what's stored: the session index
 * and the notebook keep their own copy, and neither may undo the other's.
 */
export function toggleFoldedNotebookSection(id: NotebookFold, fold?: boolean): Set<NotebookFold> {
  const next = loadFoldedNotebookSections();
  if (fold ?? !next.has(id)) next.add(id);
  else next.delete(id);
  saveFoldedNotebookSections(next);
  return next;
}
