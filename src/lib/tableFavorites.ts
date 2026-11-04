/**
 * Tables marked as favourites. Best-effort storage, like the visual
 * theme: if localStorage fails, the app keeps working, it just doesn't
 * remember the mark between sessions.
 */

const STORAGE_KEY = "solo-compass:table-favorites";

export function loadFavoriteTableIds(): Set<string> {
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

export function saveFavoriteTableIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Not critical: if it fails, it just doesn't persist.
  }
}
