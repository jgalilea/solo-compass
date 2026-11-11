/**
 * Keeping the screen on while playing (Screen Wake Lock API): with
 * physical dice on the table, the phone used to lock between entries.
 * A per-device setting, off until turned on in Settings. Only while the
 * app is in view: the browser drops the lock when it's hidden, and it's
 * asked for again on coming back.
 */

const STORAGE_KEY = "solo-compass:keep-screen-on";

/** Whether this browser can keep the screen on at all. */
export function canKeepScreenOn(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

function load(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

let enabled = load();
const listeners = new Set<() => void>();

export function isKeepScreenOn(): boolean {
  return enabled;
}

export function setKeepScreenOn(on: boolean): void {
  if (enabled === on) return;
  enabled = on;
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, "on");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not saved: it stays on (or off) until the app is closed.
  }
  for (const listener of listeners) listener();
}

export function subscribeKeepScreenOn(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Holds the lock whenever the setting is on and the app is in view;
 * returns the cleanup. Called once, by Layout.
 */
export function watchKeepScreenOn(): () => void {
  if (!canKeepScreenOn()) return () => {};
  let sentinel: WakeLockSentinel | null = null;
  let requesting = false;

  async function sync() {
    const wanted = enabled && document.visibilityState === "visible";
    if (wanted && !sentinel && !requesting) {
      requesting = true;
      try {
        const lock = await navigator.wakeLock.request("screen");
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null;
        });
        sentinel = lock;
        // Turned off (or hidden) while it was being granted.
        if (!enabled || document.visibilityState !== "visible") void release();
      } catch {
        // Refused (battery saver, a policy): the screen behaves as usual.
      } finally {
        requesting = false;
      }
    } else if (!wanted && sentinel) {
      await release();
    }
  }

  async function release() {
    const lock = sentinel;
    sentinel = null;
    await lock?.release().catch(() => {});
  }

  const onChange = () => void sync();
  document.addEventListener("visibilitychange", onChange);
  const unsubscribe = subscribeKeepScreenOn(onChange);
  void sync();
  return () => {
    document.removeEventListener("visibilitychange", onChange);
    unsubscribe();
    void release();
  };
}
