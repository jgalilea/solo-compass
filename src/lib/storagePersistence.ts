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
 * Por eso nunca se pide en silencio ni se ofrece por iniciativa de la
 * app: solo desde Ajustes, con la explicación al lado
 * (StorageProtection), para que el aviso de Firefox no pille a nadie
 * por sorpresa.
 */

export type PersistenceStatus = "persisted" | "not-persisted" | "unsupported";

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
