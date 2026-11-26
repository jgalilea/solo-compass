/**
 * Whether something drawn once is open, when it's opened from several
 * places: a tiny external store, read with useSyncExternalStore.
 */
export function createOpenStore() {
  let open = false;
  const listeners = new Set<() => void>();

  function set(value: boolean) {
    if (open === value) return;
    open = value;
    for (const listener of listeners) listener();
  }

  return {
    open: () => set(true),
    close: () => set(false),
    isOpen: () => open,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
