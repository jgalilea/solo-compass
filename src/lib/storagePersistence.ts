/**
 * Browser persistent storage (Storage API).
 *
 * With no server, the journal only exists on this device. By default
 * the browser keeps a site's data in "best effort" mode: if it runs out
 * of space, or (in Safari) if the site isn't used for a while, it may
 * delete it on its own. Marking it as persistent prevents that; it
 * would only be deleted if the person decides so.
 *
 * Each browser handles it its own way:
 * - Firefox shows its own permission prompt when it's requested.
 * - Chrome/Edge and Safari don't ask: they grant it or not based on
 *   usage (e.g. whether the app is installed on the home screen).
 * That's why it's never requested silently or offered on the app's own
 * initiative: only from Settings, with the explanation alongside
 * (StorageProtection), so Firefox's prompt doesn't catch anyone by
 * surprise.
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

/** Requests the permission. Returns whether the data is now protected. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
