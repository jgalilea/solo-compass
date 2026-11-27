/**
 * The device sync (its own chunk, loaded only on a device that syncs, or
 * when Settings turns it on): when to exchange with the relay
 * (syncExchange.ts does the exchange) and what each outcome means for
 * the person (the status Settings shows, syncStatus.ts).
 *
 * When: on opening the app, on coming back to it (if the last exchange
 * is five minutes old), three minutes after the last change (at most a
 * quarter of an hour after the first one, so a long session sends a few
 * times an hour instead of after every roll), on leaving the app with
 * changes waiting (sent so it arrives even if the app is closed right
 * then: that's when the person moves to another device), when the
 * connection comes back, and with "Sync now". That leaves time for
 * "Undo", too: a deletion that has travelled can't be undone on the
 * other devices. One exchange at a time across tabs (Web Locks), and a
 * tab that gets there just after another doesn't ask again.
 *
 * Every request counts against the relay's free daily allowance, shared
 * by every player (100,000 a day), so none is spent for nothing: a change
 * that came to nothing (undone, or sent by another tab) sends nothing,
 * and a device never makes more than DAILY_EXCHANGES on its own in a day
 * (a safeguard against a fault that keeps it asking; "Sync now" still
 * works).
 *
 * If the relay can't be reached, or its free daily allowance is used up,
 * it pauses: nothing is lost (what's waiting is found again next time),
 * Settings says so, and it tries again later, at the latest after the
 * allowance resets (midnight UTC), spread over half an hour so not every
 * device comes back at once. Something failing on this device (its
 * storage, say) is said too, tried again the same way, with a report to
 * send. A request never waits more than a while (syncRelay.ts), so
 * nothing stays stuck. Everything sent is sealed first (syncCrypto.ts):
 * the relay can't read it.
 */

import { createStore, del, get, set, type UseStore } from "idb-keyval";
import { versionLabel } from "./appVersion";
import type { Dictionary } from "./i18n";
import { loadMergeData, saveMergeChanges } from "./backup";
import { announceChange, onLocalChange, type SyncTopic } from "./sync";
import { formatCode, newSecret, parseCode } from "./syncCode";
import { deriveKeys } from "./syncCrypto";
import type { Prints, SyncKind } from "./syncData";
import { exchange, type SyncDevice, type SyncState } from "./syncExchange";
import { callRelay, type RelayError } from "./syncRelay";
import {
  SYNC_RELAY_URL,
  isSyncEnabled,
  loadSyncStatus,
  nextSyncReset,
  saveSyncStatus,
  setSyncBusy,
  setSyncEnabled,
  setSyncPending,
  type SyncPause,
  type SyncProblem,
} from "./syncStatus";
import type { SyncRequest } from "./syncWire";

const MINUTE = 60 * 1000;
/** After the last change… */
const CHANGE_DELAY = 3 * MINUTE;
/** …but no later than this after the first one still waiting. */
const CHANGE_MAX_DELAY = 15 * MINUTE;
/** Coming back to the app checks only if the last exchange is older. */
const FOREGROUND_GAP = 5 * MINUTE;
/** Automatic exchanges a device makes in a day (UTC) at most: a normal day of play is a few dozen. */
export const DAILY_EXCHANGES = 150;
const TODAY_KEY = "solo-compass:sync-today";
/** Retries while the relay can't be reached, in minutes. */
const BACKOFF = [1, 5, 15, 60];

let store: UseStore | null = null;
const db = () => (store ??= createStore("solo-compass-sync", "state"));

const loadState = () => get<SyncState>("state", db());
const saveState = (state: SyncState) => set("state", state, db());

async function clearState(): Promise<void> {
  await Promise.all([del("state", db()), del("prints", db())]);
}

const TOPICS: Record<SyncKind, SyncTopic | null> = {
  history: "history",
  adventures: "journal",
  entries: "journal",
  customTables: "customTables",
  savedRolls: "savedRolls",
  generators: "generators",
  deleted: null,
};

function deviceFor(t: Dictionary): SyncDevice {
  return {
    loadData: () => loadMergeData(t),
    saveChanges: (before, after) => saveMergeChanges(t, before, after),
    announce(kinds) {
      const topics = new Set([...kinds].map((k) => TOPICS[k]).filter((x) => x !== null));
      for (const topic of topics) announceChange(topic, "sync");
    },
    saveState,
    loadPrints: async () => (await get<Prints>("prints", db())) ?? new Map<string, string>(),
    savePrints: (prints) => set("prints", prints, db()),
  };
}

const relay = (request: SyncRequest, payload?: Uint8Array) => callRelay(SYNC_RELAY_URL, request, payload);
/** On leaving the app: the request outlives the page if it's closed right then. */
const leavingRelay = (request: SyncRequest, payload?: Uint8Array) => callRelay(SYNC_RELAY_URL, request, payload, { keepalive: true });

/** Automatic exchanges made today (UTC), by every tab of this device. */
function exchangesToday(now = Date.now()): { day: string; count: number } {
  const day = new Date(now).toISOString().slice(0, 10);
  try {
    const saved = JSON.parse(window.localStorage.getItem(TODAY_KEY) ?? "null") as { day: string; count: number } | null;
    if (saved?.day === day && typeof saved.count === "number") return saved;
  } catch {
    // Unreadable: counted from zero.
  }
  return { day, count: 0 };
}

function countExchange(): void {
  const today = exchangesToday();
  try {
    window.localStorage.setItem(TODAY_KEY, JSON.stringify({ day: today.day, count: today.count + 1 }));
  } catch {
    // Not critical: only the safeguard.
  }
}

type Reason = "start" | "foreground" | "online" | "change" | "leaving" | "manual" | "retry" | "follow-up";

let dictionary: Dictionary | null = null;
let users = 0;
let detach: (() => void) | null = null;
let running: Promise<void> | null = null;
let again: Reason | null = null;
let pending = false;
let firstPendingAt = 0;
let changeTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let waitUntil = 0;
let failures = 0;

/** From Layout (watchSync), in every tab of a device that syncs. */
export function startSync(t: Dictionary): () => void {
  dictionary = t;
  users++;
  detach ??= attach();
  return () => {
    if (--users > 0) return;
    detach?.();
    detach = null;
    clearTimeout(changeTimer);
    clearTimeout(retryTimer);
  };
}

function attach(): () => void {
  const stopWatching = onLocalChange(noteChange);
  const onVisibility = () => {
    if (document.visibilityState === "visible") void request("foreground");
    else if (pending) void request("leaving");
  };
  const onOnline = () => void request("online");
  // On a computer the app can stay in view behind another window: coming back to it is a focus.
  const onFocus = () => void request("foreground");
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("online", onOnline);
  window.addEventListener("focus", onFocus);
  void request("start");
  return () => {
    stopWatching();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onFocus);
  };
}

function noteChange(): void {
  pending = true;
  setSyncPending(true);
  const now = Date.now();
  if (!firstPendingAt) firstPendingAt = now;
  clearTimeout(changeTimer);
  const delay = Math.max(0, Math.min(CHANGE_DELAY, firstPendingAt + CHANGE_MAX_DELAY - now));
  changeTimer = setTimeout(() => void request("change"), delay);
}

function scheduleRetry(ms: number): void {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => void request("retry"), Math.max(1000, ms));
}

function request(reason: Reason): Promise<void> {
  if (running) {
    // The one asked by the person wins; otherwise any will do.
    if (again !== "manual") again = reason;
    return running;
  }
  running = run(reason)
    .catch(unexpected)
    .finally(() => {
      running = null;
      const next = again;
      again = null;
      if (next) void request(next);
    });
  return running;
}

async function run(reason: Reason): Promise<void> {
  const t = dictionary;
  if (!t || !isSyncEnabled()) return;
  const now = Date.now();
  const status = loadSyncStatus();
  if (status?.state === "stale" || status?.state === "closed") return;
  // Data from a newer app: only worth trying again once this one is updated (a reload).
  if (status?.state === "error" && status.reason === "update" && reason !== "start" && reason !== "manual") return;
  if (reason !== "manual") {
    if (status?.state === "paused" && now < status.retryAt) return scheduleRetry(status.retryAt - now);
    if (status?.state === "error" && status.retryAt && now < status.retryAt) return scheduleRetry(status.retryAt - now);
    if (now < waitUntil) return scheduleRetry(waitUntil - now);
    if (exchangesToday(now).count >= DAILY_EXCHANGES) return pause("daily", 0);
  }
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks) await locks.request("solo-compass-sync", () => cycle(t, reason));
  else await cycle(t, reason);
}

/** Looking for what's new, with no changes to send: only if the last exchange is a while ago. */
const LOOKS = new Set<Reason>(["start", "foreground", "online"]);
/** Sending what changed: nothing to send, no request. */
const SENDS = new Set<Reason>(["change", "leaving"]);

async function cycle(t: Dictionary, reason: Reason): Promise<void> {
  const state = await loadState();
  if (!state) return;
  // Checked here, holding the lock: another tab may have just done it. Changes waiting go with their timer.
  const status = loadSyncStatus();
  if (LOOKS.has(reason) && state.lastSyncAt && Date.now() - state.lastSyncAt < FOREGROUND_GAP && status?.state === "ok") return;
  const secret = parseCode(state.code);
  if (!secret) return problem("damaged");
  const keys = await deriveKeys(secret);
  clearTimeout(changeTimer);
  pending = false;
  firstPendingAt = 0;
  setSyncPending(false);
  setSyncBusy(true);
  try {
    const outcome = await exchange(deviceFor(t), reason === "leaving" ? leavingRelay : relay, keys, state, Date.now, {
      onlyToSend: SENDS.has(reason),
    });
    if (outcome.kind === "ok" && outcome.skipped) return;
    if (reason !== "manual") countExchange();
    switch (outcome.kind) {
      case "ok":
        failures = 0;
        waitUntil = outcome.wait > 0 ? Date.now() + outcome.wait * 1000 : 0;
        saveSyncStatus({ state: "ok", at: Date.now(), skew: outcome.skew });
        if (outcome.followUp) again ??= "follow-up";
        if (outcome.state.closeCodes?.length) await closeReplaced(outcome.state.closeCodes);
        break;
      case "stale":
        saveSyncStatus({ state: "stale", since: Date.now(), lastSyncAt: outcome.lastSyncAt });
        break;
      case "problem":
        problem(outcome.reason);
        break;
      case "failed":
        await failed(outcome.error, outcome.retryAfter);
        break;
    }
  } finally {
    setSyncBusy(false);
  }
}

async function closeReplaced(codes: string[]): Promise<void> {
  const left: string[] = [];
  for (const code of codes) {
    const secret = parseCode(code);
    if (!secret) continue;
    const keys = await deriveKeys(secret);
    const result = await relay({ v: 1, op: "close", box: keys.box, pass: keys.pass });
    if (!result.ok && result.error !== "closed" && result.error !== "forbidden") left.push(code);
  }
  const state = await loadState();
  if (!state) return;
  if (left.length) state.closeCodes = left;
  else delete state.closeCodes;
  await saveState(state);
}

/**
 * Something failed here, not at the relay (the browser's storage full or
 * blocked, say): nothing is lost, since what's waiting is worked out
 * again next time and merging twice changes nothing. Said in Settings,
 * tried again like a pause, with a report for the ideas and bugs form.
 */
function unexpected(error: unknown): void {
  setSyncBusy(false);
  failures++;
  const wait = BACKOFF[Math.min(failures, BACKOFF.length) - 1] * MINUTE;
  const status = loadSyncStatus();
  const since = status?.state === "error" && status.reason === "unexpected" ? status.since : Date.now();
  saveSyncStatus({ state: "error", since, reason: "unexpected", retryAt: Date.now() + wait, report: syncReport(error) });
  scheduleRetry(wait);
}

/**
 * Like the error screen's report (errorReport.ts), without the error's
 * message: one from reading data could quote it, and nothing of the
 * journal goes in a report.
 */
export function syncReport(error: unknown, userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : "";
  const frames = (error instanceof Error ? (error.stack ?? "") : "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !(message && line.includes(message)) && !line.startsWith(`${name}:`) && line !== name)
    .slice(0, 8);
  return [`Solo Compass ${versionLabel()} · sync`, new Date().toISOString(), userAgent, "", name, ...frames].join("\n");
}

function problem(reason: SyncProblem): void {
  const status = loadSyncStatus();
  saveSyncStatus({ state: "error", since: status?.state === "error" ? status.since : Date.now(), reason });
}

function pause(reason: SyncPause, delay: number): void {
  const now = Date.now();
  const status = loadSyncStatus();
  const since = status?.state === "paused" || status?.state === "offline" ? status.since : now;
  // Spread over half an hour after the reset, so not every device comes back at once.
  const afterReset = nextSyncReset(now) + Math.random() * 30 * MINUTE - now;
  const wait = reason === "quota" || reason === "daily" ? afterReset : Math.min(delay, afterReset);
  saveSyncStatus({ state: "paused", since, reason, retryAt: now + wait });
  scheduleRetry(wait);
}

async function failed(error: RelayError, retryAfter?: number): Promise<void> {
  failures++;
  const backoff = BACKOFF[Math.min(failures, BACKOFF.length) - 1] * MINUTE;
  switch (error) {
    case "network":
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const status = loadSyncStatus();
        saveSyncStatus({ state: "offline", since: status?.state === "offline" ? status.since : Date.now() });
      } else {
        pause("unreachable", backoff);
      }
      break;
    case "quota":
      pause("quota", 0);
      break;
    case "rate":
      pause("rate", (retryAfter ?? 60) * 1000);
      break;
    case "closed":
    case "forbidden":
      // Closed from another device (or its code changed): this one stops.
      await clearState();
      setSyncEnabled(false);
      saveSyncStatus({ state: "closed", since: Date.now() });
      break;
    default:
      pause("unreachable", retryAfter ? retryAfter * 1000 : backoff);
  }
}

// ---- What Settings does -------------------------------------------------

/** The code this device syncs with, as shown (null: it doesn't). */
export async function currentCode(): Promise<string | null> {
  return (await loadState())?.code ?? null;
}

/** A new code (sync turned on here first) or another device's. */
export async function linkDevice(code?: string): Promise<string> {
  const secret = code ? parseCode(code) : newSecret();
  if (!secret) throw new Error("invalid code");
  const shown = formatCode(secret);
  await clearState();
  await saveState({ code: shown, epoch: null, since: null, gen: 0, lastSyncAt: null });
  failures = 0;
  waitUntil = 0;
  saveSyncStatus(null);
  setSyncEnabled(true);
  // Already running here (another code before): straight away with this one.
  if (detach) void request("manual");
  return shown;
}

export function syncNow(): Promise<void> {
  return request("manual");
}

/** Stops syncing here: the relay's copy and the other devices go on. */
export async function unlinkDevice(): Promise<void> {
  setSyncPending(false);
  await clearState();
  setSyncEnabled(false);
  saveSyncStatus(null);
}

/** Wipes the relay's copy and closes it: every device stops syncing. */
export async function deleteServerCopy(): Promise<boolean> {
  const state = await loadState();
  const secret = state && parseCode(state.code);
  if (secret) {
    const keys = await deriveKeys(secret);
    const result = await relay({ v: 1, op: "close", box: keys.box, pass: keys.pass });
    if (!result.ok && result.error !== "closed") return false;
  }
  await unlinkDevice();
  return true;
}

/** A new code: everything goes to a new box, and the old one is closed (the other devices stop until linked again). */
export async function changeCode(): Promise<string> {
  const state = await loadState();
  const shown = formatCode(newSecret());
  await set("prints", new Map(), db());
  await saveState({
    code: shown,
    epoch: null,
    since: null,
    gen: 0,
    lastSyncAt: state?.lastSyncAt ?? null,
    ...(state ? { closeCodes: [...(state.closeCodes ?? []), state.code] } : {}),
  });
  saveSyncStatus(null);
  void request("manual");
  return shown;
}

/** The person's answer for a device unsynced most of a year. */
export async function resolveStale(choice: "merge" | "server"): Promise<void> {
  const state = await loadState();
  if (!state) return;
  await saveState({ ...state, staleChoice: choice });
  saveSyncStatus(null);
  void request("manual");
}

/** After "closed": the notice has been read. */
export function dismissClosed(): void {
  if (loadSyncStatus()?.state === "closed") saveSyncStatus(null);
}
