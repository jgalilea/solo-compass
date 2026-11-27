/**
 * The device sync (its own chunk, loaded only on a device that syncs, or
 * when Settings turns it on): when to exchange with the relay
 * (syncExchange.ts does the exchange) and what each outcome means for
 * the person (the status Settings shows, syncStatus.ts).
 *
 * When: on opening the app, always (another device may have been used
 * meanwhile); on coming back to it after half a minute away (another
 * app, another window, the screen off), or on the first touch or key
 * after five minutes without any (a computer's window left in view while
 * the phone was used), while another device is in use these days (else
 * only after ten minutes away: a device used alone has nothing to find);
 * three minutes after the last change (at most half an hour after the
 * first one: leaving sends at once anyway); on leaving the app with
 * changes waiting; when the connection comes back, if something was
 * waiting or failed; and with "Sync now".
 * Waiting leaves time for "Undo", too: a deletion that has travelled
 * can't be undone on the other devices.
 *
 * Leaving is when the person moves to another device, and closing the
 * app or the tab leaves no time to read and seal everything: so a moment
 * after each change, what's waiting is worked out and sealed ahead
 * (prepareChange), and leaving only sends it (keepalive: it goes even if
 * the page is closed right then); its answer is taken in if the page
 * lives on. One exchange at a time across tabs (Web Locks), and a tab
 * that gets there just after another doesn't ask again.
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
import { deriveKeys, type SyncKeys } from "./syncCrypto";
import type { Prints, SyncKind } from "./syncData";
import { defaultDeviceName, FORGET_AFTER, MAX_NAME_LENGTH, mergeDevices, type SyncedDevice } from "./syncDevices";
import { exchange, prepareChange, type ChangeInFlight, type PreparedChange, type SyncDevice, type SyncState } from "./syncExchange";
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
/** …but no later than this after the first one still waiting (leaving sends at once anyway). */
const CHANGE_MAX_DELAY = 30 * MINUTE;
/** Opening the app looks for what's new unless an exchange is this fresh (two tabs opened together, a reload). */
const JUST_SYNCED = 20 * 1000;
/** Coming back looks for what's new after this long away (another device may have been used meanwhile)… */
const AWAY = 30 * 1000;
/** …or this long, when nothing has come from another device for SHARED_WINDOW (used alone, it has nothing to find). */
const AWAY_ALONE = 10 * MINUTE;
const SHARED_WINDOW = 14 * 24 * 60 * MINUTE;
/** No touch, click or key for this long: the next one is a coming back too. */
const IDLE = 5 * MINUTE;
/** A change is worked out and sealed this long after the last one, ready for leaving. */
const PREPARE_DELAY = 500;
/** What a request sent on leaving may carry (the browser's limit for keepalive, with room). */
const LEAVING_BYTES = 60 * 1024;
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
  await Promise.all([del("state", db()), del("prints", db()), del("devices", db())]);
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

const DEVICE_KEY = "solo-compass:sync-device";

/** This device among the ones that sync: a random id kept here, and the name chosen (or made from the browser). */
function me(): { id: string; name: string } {
  let saved: { id?: string; name?: string } = {};
  try {
    saved = JSON.parse(window.localStorage.getItem(DEVICE_KEY) ?? "{}") ?? {};
  } catch {
    // Unreadable: a new one.
  }
  let id = saved.id;
  if (!id) {
    id = crypto.randomUUID();
    saved = { ...saved, id };
    try {
      window.localStorage.setItem(DEVICE_KEY, JSON.stringify(saved));
    } catch {
      // Not kept: it's a new device next time, harmlessly.
    }
  }
  const installed = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return { id, name: saved.name || defaultDeviceName(navigator.userAgent, !!installed, navigator.maxTouchPoints > 1) };
}

const loadDevices = async () => (await get<SyncedDevice[]>("devices", db())) ?? [];

function deviceFor(t: Dictionary): SyncDevice {
  return {
    devices: { me, load: loadDevices, save: (devices) => set("devices", devices, db()) },
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

type Reason = "start" | "back" | "online" | "change" | "leaving" | "manual" | "retry" | "follow-up";

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
/** Bumped on every change: a prepared change is good only for the one it was made after. */
let changeStamp = 0;
let prepared: { stamp: number; change: PreparedChange } | null = null;
let prepareTimer: ReturnType<typeof setTimeout> | undefined;
/** Sent on leaving, with the change it was prepared after (later ones are still to go). */
let inFlight: { flight: ChangeInFlight; stamp: number } | null = null;
let cachedKeys: { code: string; keys: SyncKeys } | null = null;
/** When something last came from another device (from the saved state, kept here for the event handlers). */
let othersSeenAt = 0;

function sharedLately(now = Date.now()): boolean {
  return now - othersSeenAt < SHARED_WINDOW;
}

async function keysFor(code: string): Promise<SyncKeys | null> {
  if (cachedKeys?.code === code) return cachedKeys.keys;
  const secret = parseCode(code);
  if (!secret) return null;
  cachedKeys = { code, keys: await deriveKeys(secret) };
  return cachedKeys.keys;
}

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
    clearTimeout(prepareTimer);
  };
}

function attach(): () => void {
  const stopWatching = onLocalChange(noteChange);
  // When the app was left (hidden, or its window in the background), and the last touch or key.
  let leftAt = 0;
  let lastInput = Date.now();
  const cameBack = () => {
    const away = leftAt ? Date.now() - leftAt : 0;
    leftAt = 0;
    lastInput = Date.now();
    if (away >= (sharedLately() ? AWAY : AWAY_ALONE)) void request("back");
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") return cameBack();
    leftAt ||= Date.now();
    leave();
  };
  // On a computer the app can stay in view behind another window: leaving it is a blur.
  const onBlur = () => {
    leftAt ||= Date.now();
  };
  const onInput = () => {
    const now = Date.now();
    if (!leftAt && now - lastInput >= IDLE && sharedLately(now)) void request("back");
    lastInput = now;
  };
  // A connection back matters if something was waiting or failed (phones change networks all the time).
  const onOnline = () => {
    const status = loadSyncStatus();
    if (pending || (status && status.state !== "ok")) void request("online");
  };
  const listen = { capture: true, passive: true } as const;
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", cameBack);
  window.addEventListener("pagehide", leave);
  window.addEventListener("pointerdown", onInput, listen);
  window.addEventListener("keydown", onInput, listen);
  window.addEventListener("online", onOnline);
  void request("start");
  return () => {
    stopWatching();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", cameBack);
    window.removeEventListener("pagehide", leave);
    window.removeEventListener("pointerdown", onInput, listen);
    window.removeEventListener("keydown", onInput, listen);
    window.removeEventListener("online", onOnline);
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
  changeStamp++;
  // One prepared before this change is no good: it could hold what was just undone (a deletion, say).
  prepared = null;
  clearTimeout(prepareTimer);
  prepareTimer = setTimeout(() => void prepare(), PREPARE_DELAY);
}

/** What's waiting, worked out and sealed ahead, so leaving the app only has to send it. */
async function prepare(): Promise<void> {
  const t = dictionary;
  const stamp = changeStamp;
  if (!t || !pending || !canSendNow()) return;
  try {
    const state = await loadState();
    const keys = state && (await keysFor(state.code));
    if (!state || !keys) return;
    const change = await prepareChange(deviceFor(t), keys, state, LEAVING_BYTES);
    if (stamp === changeStamp && pending) prepared = change && { stamp, change };
  } catch {
    // Not ready: leaving does it the usual way.
  }
}

/** Whether an exchange may go now on its own (no pause, no wait, within the day's number). */
function canSendNow(now = Date.now()): boolean {
  if (!isSyncEnabled()) return false;
  const status = loadSyncStatus();
  if (status?.state === "stale" || status?.state === "closed") return false;
  if (status?.state === "paused" && now < status.retryAt) return false;
  if (status?.state === "error" && (status.reason === "update" || (status.retryAt && now < status.retryAt))) return false;
  return now >= waitUntil && exchangesToday(now).count < DAILY_EXCHANGES;
}

/**
 * Leaving the app (hidden, or the page closed) with changes waiting: the
 * prepared change goes at once, before anything else can be awaited (the
 * page may not live to see it), and its answer is taken in by the
 * exchange that follows, if the page lives on. Only one prepared after
 * the very last change: an older one could hold what was undone since.
 * Without one ready (the last change is under a second old), the usual
 * way, which a closed page cuts short: then it goes the next time.
 */
function leave(): void {
  if (!pending) return;
  const ready = prepared?.stamp === changeStamp ? prepared : null;
  prepared = null;
  if (ready && !inFlight && canSendNow()) {
    inFlight = {
      flight: {
        change: ready.change,
        result: callRelay(SYNC_RELAY_URL, ready.change.request, ready.change.op, { keepalive: true }),
        sentAt: Date.now(),
      },
      stamp: ready.stamp,
    };
  }
  void request("leaving");
}

/** Another code, or none: what was prepared or sent for the old one is no longer this device's business. */
function forgetPrepared(): void {
  clearTimeout(prepareTimer);
  prepared = null;
  inFlight = null;
  othersSeenAt = 0;
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
    // Opening the app tries once whatever stopped it last time (not the day's allowance being used up).
    const opening = reason === "start";
    const waitedOut = status?.state === "paused" && now < status.retryAt && !(opening && status.reason === "unreachable");
    if (waitedOut) return scheduleRetry(status.retryAt - now);
    if (status?.state === "error" && status.retryAt && now < status.retryAt && !opening) return scheduleRetry(status.retryAt - now);
    if (now < waitUntil) return scheduleRetry(waitUntil - now);
    if (exchangesToday(now).count >= DAILY_EXCHANGES) return pause("daily", 0);
  }
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks) await locks.request("solo-compass-sync", () => cycle(t, reason));
  else await cycle(t, reason);
}

/** Looking for what's new: not when an exchange has just been made (by another tab, say). */
const FRESH: Partial<Record<Reason, number>> = { start: JUST_SYNCED, back: JUST_SYNCED, online: JUST_SYNCED };
/** Sending what changed: nothing to send, no request. */
const SENDS = new Set<Reason>(["change", "leaving"]);

async function cycle(t: Dictionary, reason: Reason): Promise<void> {
  const state = await loadState();
  if (!state) return;
  othersSeenAt = state.othersSeenAt ?? 0;
  const keys = await keysFor(state.code);
  if (!keys) return problem("damaged");
  // A change sent on leaving: this exchange takes its answer in, whatever brought it about. Only one
  // for this box: sent to the code just replaced, a "closed" from it must not stop this device.
  const flying = inFlight?.flight.change.request.box === keys.box ? inFlight.flight : undefined;
  // Changes made since it left (back in the app at once): still to go.
  const behind = !!flying && inFlight?.stamp !== changeStamp;
  inFlight = null;
  // Checked here, holding the lock: another tab may have just done it. Changes waiting go with their timer.
  const status = loadSyncStatus();
  const fresh = FRESH[reason];
  if (!flying && fresh && state.lastSyncAt && Date.now() - state.lastSyncAt < fresh && status?.state === "ok") return;
  clearTimeout(changeTimer);
  clearTimeout(prepareTimer);
  prepared = null;
  pending = false;
  firstPendingAt = 0;
  setSyncPending(false);
  setSyncBusy(true);
  try {
    const outcome = await exchange(deviceFor(t), reason === "leaving" ? leavingRelay : relay, keys, state, Date.now, {
      onlyToSend: SENDS.has(reason),
      ...(flying ? { inFlight: flying } : {}),
    });
    if (outcome.kind === "ok" && outcome.skipped) return;
    if (reason !== "manual") countExchange();
    if (behind) noteChange();
    switch (outcome.kind) {
      case "ok":
        othersSeenAt = outcome.state.othersSeenAt ?? othersSeenAt;
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

/** This device, and the others that have told it they share the code (most recent first). */
export async function syncedDevices(now = Date.now()): Promise<{ me: { id: string; name: string }; others: SyncedDevice[] }> {
  const self = me();
  const others = mergeDevices(await loadDevices(), [], now).filter((d) => d.id !== self.id && now - d.seenAt < FORGET_AFTER);
  return { me: self, others };
}

/** This device's name, as the others will see it: it goes with the next exchange. */
export function renameDevice(name: string): void {
  const clean = name.trim().slice(0, MAX_NAME_LENGTH);
  const self = me();
  try {
    window.localStorage.setItem(DEVICE_KEY, JSON.stringify({ id: self.id, ...(clean ? { name: clean } : {}) }));
  } catch {
    // Not kept: the name stays as it was.
  }
  void request("manual");
}

/** The code this device syncs with, as shown (null: it doesn't). */
export async function currentCode(): Promise<string | null> {
  return (await loadState())?.code ?? null;
}

/** A new code (sync turned on here first) or another device's. */
export async function linkDevice(code?: string): Promise<string> {
  forgetPrepared();
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
  forgetPrepared();
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
  forgetPrepared();
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
