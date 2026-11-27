/**
 * The device sync's small part, in the main bundle: whether this build
 * has a relay, whether this device syncs, what the last attempt said
 * (for Settings and the dot on its button), and starting the engine
 * (syncEngine.ts, its own chunk) once the first screen is up, only on a
 * device that syncs. The status lives in localStorage so every tab sees
 * the same one (the `storage` event tells the others).
 */

import type { Dictionary } from "./i18n";

/** The relay's address, from .env (VITE_SYNC_RELAY_URL): empty, no sync in this build. */
export const SYNC_RELAY_URL: string = (import.meta.env.VITE_SYNC_RELAY_URL ?? "").replace(/\/+$/, "");

export function syncAvailable(): boolean {
  return SYNC_RELAY_URL !== "";
}

const ENABLED_KEY = "solo-compass:sync";
const STATUS_KEY = "solo-compass:sync-status";

/** daily: this device made far more exchanges than a day of play needs (a safeguard), back after midnight UTC. */
export type SyncPause = "unreachable" | "quota" | "rate" | "daily";
/**
 * full: the relay's copy is at its limit; update: data from a newer app;
 * damaged: the code kept here can't be read; unexpected: something failed
 * on this device (its storage, say), tried again by itself.
 */
export type SyncProblem = "full" | "update" | "damaged" | "unexpected";

export type SyncStatus =
  | { state: "ok"; at: number; skew: number }
  | { state: "offline"; since: number }
  | { state: "paused"; since: number; reason: SyncPause; retryAt: number }
  /** `retryAt` when it tries again by itself; `report`, for the ideas and bugs form (never journal content). */
  | { state: "error"; since: number; reason: SyncProblem; retryAt?: number; report?: string }
  /** A device that hasn't synced for most of a year: asks before merging. */
  | { state: "stale"; since: number; lastSyncAt: number }
  /** Closed from another device (or its code changed): this one stopped. */
  | { state: "closed"; since: number };

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedStatus: SyncStatus | null = null;
let cachedEnabled: boolean | undefined;
let busy = false;
let pending = false;

function notify(): void {
  for (const listener of [...listeners]) listener();
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Not critical: the next attempt says it again.
  }
}

export function isSyncEnabled(): boolean {
  if (typeof window === "undefined") return false;
  cachedEnabled ??= syncAvailable() && read(ENABLED_KEY) === "1";
  return cachedEnabled;
}

export function setSyncEnabled(on: boolean): void {
  write(ENABLED_KEY, on ? "1" : null);
  cachedEnabled = on && syncAvailable();
  notify();
}

export function loadSyncStatus(): SyncStatus | null {
  if (typeof window === "undefined") return null;
  const raw = read(STATUS_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedStatus = raw ? (JSON.parse(raw) as SyncStatus) : null;
    } catch {
      cachedStatus = null;
    }
  }
  return cachedStatus;
}

export function saveSyncStatus(status: SyncStatus | null): void {
  write(STATUS_KEY, status && JSON.stringify(status));
  notify();
}

/** Sending or receiving right now (this tab only). */
export function isSyncBusy(): boolean {
  return busy;
}

export function setSyncBusy(value: boolean): void {
  if (busy === value) return;
  busy = value;
  notify();
}

/** Changes made in this tab that haven't gone yet (they wait a few minutes, or for leaving the app). */
export function isSyncPending(): boolean {
  return pending;
}

export function setSyncPending(value: boolean): void {
  if (pending === value) return;
  pending = value;
  notify();
}

/** What the header's sync icon says, at a glance. */
export type SyncGlance = "off" | "syncing" | "pending" | "ok" | "waiting" | "offline" | "paused" | "problem";

export function syncGlance(enabled: boolean, status: SyncStatus | null, busy: boolean, pending: boolean): SyncGlance {
  if (!enabled) return status?.state === "closed" ? "problem" : "off";
  if (busy) return "syncing";
  switch (status?.state) {
    case "offline":
      return "offline";
    case "paused":
      return "paused";
    case "error":
      // Tried again by itself (something failed on the device): a pause, until it lasts.
      return status.reason === "unexpected" && !syncNeedsAttention(status) ? "paused" : "problem";
    case "stale":
    case "closed":
      return "problem";
    default:
      if (pending) return "pending";
      return status?.state === "ok" ? "ok" : "waiting";
  }
}

let showSyncCard = false;

/** Settings opened from the header's sync icon: straight to the sync's card. */
export function askForSyncCard(): void {
  showSyncCard = true;
}

/** Whether Settings was opened to show the sync's card (once). */
export function takeSyncCardRequest(): boolean {
  const asked = showSyncCard;
  showSyncCard = false;
  return asked;
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STATUS_KEY || e.key === ENABLED_KEY || e.key === null) {
      cachedEnabled = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** When the relay's free daily allowance starts again: midnight UTC. */
export function nextSyncReset(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

/** How long a pause lasts before the Settings button shows a dot: a short cut isn't worth one. */
export const PAUSE_DOT_AFTER = 15 * 60 * 1000;

/** Whether the Settings button should carry a dot for the sync. */
export function syncNeedsAttention(status: SyncStatus | null, now = Date.now()): boolean {
  if (!status) return false;
  switch (status.state) {
    case "paused":
      return now - status.since >= PAUSE_DOT_AFTER;
    case "error":
      // Tried again by itself: like a pause, a single hiccup isn't worth a dot.
      return status.reason !== "unexpected" || now - status.since >= PAUSE_DOT_AFTER;
    case "stale":
    case "closed":
      return true;
    default:
      return false;
  }
}

/** The search parameter of a link that carries a sync code (`#/?vincular=…`). */
export const SYNC_LINK_PARAM = "vincular";

/** A code waiting for a yes: opened from a link (anyone can send one) or scanned here. */
export interface PendingSyncLink {
  code: string;
  source: "link" | "scan";
}
let pendingLink: PendingSyncLink | null = null;

/** A link to link another device: the code travels in the #, which never reaches a server. */
export function syncLinkUrl(code: string): string {
  return `${window.location.origin}${window.location.pathname}#/?${SYNC_LINK_PARAM}=${code.replace(/-/g, "")}`;
}

/** Opened with a code in the link, or scanned: Settings asks before linking (never by itself). */
export function offerSyncLink(code: string, source: PendingSyncLink["source"] = "link"): void {
  pendingLink = { code, source };
  notify();
}

export function pendingSyncLink(): PendingSyncLink | null {
  return pendingLink;
}

export function clearSyncLink(): void {
  pendingLink = null;
  notify();
}

/**
 * The engine runs in every tab of a device that syncs, from Layout,
 * once the first screen is up; turning sync on starts it right away.
 */
export function watchSync(t: Dictionary): () => void {
  if (!syncAvailable() || typeof window === "undefined") return () => {};
  let stop: (() => void) | null = null;
  let cancelled = false;
  let starting = false;

  const startIfOn = () => {
    if (cancelled || stop || starting || !isSyncEnabled()) return;
    starting = true;
    void import("./syncEngine")
      .then((engine) => {
        starting = false;
        if (cancelled) return;
        stop = engine.startSync(t);
      })
      .catch(() => {
        starting = false;
      });
  };
  const whenIdle = () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(startIfOn, { timeout: 3000 });
    else setTimeout(startIfOn, 1500);
  };
  void document.fonts.ready.then(whenIdle, whenIdle);
  const unsubscribe = subscribeSyncStatus(() => {
    if (isSyncEnabled()) startIfOn();
    else {
      stop?.();
      stop = null;
    }
  });
  return () => {
    cancelled = true;
    unsubscribe();
    stop?.();
  };
}
