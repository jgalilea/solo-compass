/**
 * Which adventure is active right now (or none). It's a tiny piece of
 * data (an id), so it stays in localStorage, like the chosen
 * theme/language/oracle — it doesn't have the size problem of the
 * history or the journal itself.
 */

const STORAGE_KEY = "solo-compass:active-adventure";

export function loadActiveAdventureId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveAdventureId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not critical: if it fails, it just doesn't persist between sessions.
  }
}
