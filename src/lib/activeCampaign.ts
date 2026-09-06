/**
 * Qué campaña está activa ahora mismo (o ninguna). Es un dato
 * minúsculo (un id), así que se queda en localStorage, igual que el
 * tema/idioma/oráculo elegidos — no tiene el problema de tamaño del
 * historial o del propio diario.
 */

const STORAGE_KEY = "solo-compass:active-campaign";

export function loadActiveCampaignId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveCampaignId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // No es crítico: si falla, no persiste entre sesiones.
  }
}
