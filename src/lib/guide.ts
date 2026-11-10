/**
 * Whether the quick guide (shortcuts, writing in the journal, Lonelog
 * notation) is open. It's opened from several places (the "?" key,
 * Settings, an adventure's menu) and drawn once, by Layout: a tiny
 * external store, read with useSyncExternalStore.
 */

let open = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
  if (open === value) return;
  open = value;
  for (const listener of listeners) listener();
}

export function openGuide(): void {
  set(true);
}

export function closeGuide(): void {
  set(false);
}

export function isGuideOpen(): boolean {
  return open;
}

export function subscribeGuide(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
