/**
 * Tells the app's other open tabs and windows (an installed app and a
 * browser tab, say) that something was saved, so they read it again
 * instead of showing, and later saving on top of, an old copy. Each
 * collection saves only what changed (collectionStore.ts), so nothing
 * is lost meanwhile: this keeps the screens in step.
 *
 * A BroadcastChannel never delivers to the tab that posted, so a tab
 * doesn't reload its own changes. What the device sync brings in
 * (syncEngine.ts) is the exception: it's new to this tab's screens too,
 * so it's announced here as well. And the sync, in turn, hears of this
 * tab's own saves (onLocalChange), to send them.
 */

export type SyncTopic = "journal" | "history" | "customTables" | "savedRolls" | "generators";

let channel: BroadcastChannel | null | undefined;
const here = new Set<(topic: SyncTopic) => void>();
const localWatchers = new Set<(topic: SyncTopic) => void>();

function getChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    channel =
      typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("solo-compass:changes");
    // In Node (the tests) an open channel would keep the process alive.
    (channel as { unref?: () => void } | null)?.unref?.();
  }
  return channel;
}

/** `from: "sync"`: brought in from another device, so this tab reads it again too. */
export function announceChange(topic: SyncTopic, from?: "sync"): void {
  getChannel()?.postMessage(topic);
  if (from === "sync") for (const listener of [...here]) listener(topic);
  else for (const watcher of [...localWatchers]) watcher(topic);
}

export function onExternalChange(topic: SyncTopic, listener: () => void): () => void {
  const fromHere = (t: SyncTopic) => {
    if (t === topic) listener();
  };
  here.add(fromHere);
  const c = getChannel();
  const handle = (e: MessageEvent) => {
    if (e.data === topic) listener();
  };
  c?.addEventListener("message", handle);
  return () => {
    here.delete(fromHere);
    c?.removeEventListener("message", handle);
  };
}

/** Every save made in this tab (not what the sync brought in). */
export function onLocalChange(watcher: (topic: SyncTopic) => void): () => void {
  localWatchers.add(watcher);
  return () => localWatchers.delete(watcher);
}
