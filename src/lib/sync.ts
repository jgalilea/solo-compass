/**
 * Tells the app's other open tabs and windows (an installed app and a
 * browser tab, say) that something was saved, so they read it again
 * instead of showing, and later saving on top of, an old copy. Each
 * collection saves only what changed (collectionStore.ts), so nothing
 * is lost meanwhile: this keeps the screens in step.
 *
 * A BroadcastChannel never delivers to the tab that posted, so a tab
 * doesn't reload its own changes.
 */

export type SyncTopic = "journal" | "history" | "customTables" | "savedRolls" | "generators";

let channel: BroadcastChannel | null | undefined;

function getChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("solo-compass:changes");
    // In Node (the tests) an open channel would keep the process alive.
    (channel as { unref?: () => void } | null)?.unref?.();
  }
  return channel;
}

export function announceChange(topic: SyncTopic): void {
  getChannel()?.postMessage(topic);
}

export function onExternalChange(topic: SyncTopic, listener: () => void): () => void {
  const c = getChannel();
  if (!c) return () => {};
  const handle = (e: MessageEvent) => {
    if (e.data === topic) listener();
  };
  c.addEventListener("message", handle);
  return () => c.removeEventListener("message", handle);
}
