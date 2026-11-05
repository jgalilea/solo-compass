/**
 * Which blocks of the Tables screen (your tables, Solo Compass's,
 * Ironsworn…) are unfolded. They start folded so the list doesn't grow
 * with every game added. Best-effort storage, like the favourites: if
 * localStorage fails, they just start folded again.
 */

const STORAGE_KEY = "solo-compass:table-sections-open";

export function loadOpenTableSections(): Set<string> {
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

export function saveOpenTableSections(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Not critical: if it fails, it just doesn't persist.
  }
}
