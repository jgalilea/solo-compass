/**
 * Almacenamiento persistente del navegador (Storage API).
 *
 * Sin servidor, el diario solo existe en este dispositivo. Por defecto
 * el navegador guarda los datos de una web en modo "best effort": si
 * se queda sin espacio, o (en Safari) si la web no se usa en un
 * tiempo, puede borrarlos por su cuenta. Marcarlos como persistentes
 * se lo impide; solo se borrarían si la persona lo decide.
 *
 * Cada navegador lo gestiona a su manera:
 * - Firefox muestra su propio aviso de permiso al pedirlo.
 * - Chrome/Edge y Safari no preguntan: lo conceden o no según el uso
 *   (p. ej. si la app está instalada en la pantalla de inicio).
 * Por eso nunca se pide en silencio: antes se explica en la app qué
 * es (StorageProtection), para que el aviso de Firefox no pille a
 * nadie por sorpresa, y la persona decide si lo pide.
 */

export type PersistenceStatus = "persisted" | "not-persisted" | "unsupported";

const PROMPT_SEEN_KEY = "solo-compass:storage-prompt-seen";

function isSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.storage &&
    typeof navigator.storage.persist === "function" &&
    typeof navigator.storage.persisted === "function"
  );
}

export async function getPersistenceStatus(): Promise<PersistenceStatus> {
  if (!isSupported()) return "unsupported";
  try {
    return (await navigator.storage.persisted()) ? "persisted" : "not-persisted";
  } catch {
    return "unsupported";
  }
}

/** Pide el permiso. Devuelve si los datos han quedado protegidos. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Si ya se mostró la explicación automática (solo se enseña una vez). */
export function hasSeenPersistencePrompt(): boolean {
  try {
    return window.localStorage.getItem(PROMPT_SEEN_KEY) === "1";
  } catch {
    // Sin localStorage no se puede recordar: mejor no insistir.
    return true;
  }
}

export function markPersistencePromptSeen(): void {
  try {
    window.localStorage.setItem(PROMPT_SEEN_KEY, "1");
  } catch {
    // Sin localStorage disponible: no pasa nada.
  }
}
