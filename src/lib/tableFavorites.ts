/**
 * Tablas marcadas como favoritas. Almacenamiento best-effort, igual
 * que el tema visual: si localStorage falla, la app sigue
 * funcionando, simplemente no recuerda la marca entre sesiones.
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
    // No es crítico: si falla, simplemente no persiste.
  }
}
