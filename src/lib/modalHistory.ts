/**
 * Open dialogs and menus as history entries, so going back (the
 * phone's back gesture or button) closes the one on top instead of
 * leaving the screen behind it (`useCloseOnBack`).
 *
 * Each open dialog pushes an entry with the same URL and its depth in
 * the state (`modalDepth`); the router sees the same location when it
 * pops. Closing a dialog any other way (its button, Esc, the backdrop)
 * takes its entry off again, a moment later: a dialog that opens in the
 * meantime (React's StrictMode remounting it, or one dialog replaced by
 * another) reuses it instead of pushing a new one.
 */

const KEY = "modalDepth";

/** Depth the history should go back to, once the current task ends. */
let pendingDepth: number | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | undefined;

/** Depth of the dialogs open in the current history entry. */
export function currentModalDepth(): number {
  const state: unknown = window.history.state;
  const depth = state && typeof state === "object" ? (state as Record<string, unknown>)[KEY] : undefined;
  return typeof depth === "number" ? depth : 0;
}

/** A dialog opens: returns its depth. */
export function pushModalEntry(): number {
  const current = currentModalDepth();
  if (pendingDepth !== null) {
    // Take over an entry that was about to go.
    const reused = pendingDepth + 1;
    pendingDepth = reused;
    if (reused >= current) {
      clearTimeout(pendingTimer);
      pendingDepth = null;
    }
    if (reused <= current) return reused;
  }
  const depth = current + 1;
  window.history.pushState({ ...(window.history.state as object | null), [KEY]: depth }, "");
  return depth;
}

/** A dialog closes: takes its entry off, unless back already did. */
export function popModalEntry(depth: number) {
  // Already gone (back), or the app navigated somewhere else meanwhile.
  if (currentModalDepth() < depth) return;
  pendingDepth = Math.min(pendingDepth ?? depth - 1, depth - 1);
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    const target = pendingDepth;
    pendingDepth = null;
    if (target === null) return;
    const current = currentModalDepth();
    if (current > target) window.history.go(target - current);
  }, 0);
}
