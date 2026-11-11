/**
 * What a screen reader says after a roll (the oracle's answer, a
 * table's result): the result appears in a card that's drawn anew
 * each time, which isn't read out on its own. Every roll goes through
 * usePlayActions, which announces it here (and the dice tray, as each
 * die lands in it); one live region, drawn by Layout, reads it (a tiny
 * external store, like guide.ts).
 */

export interface Announcement {
  /** Changes every time, so the same text twice is read twice. */
  id: number;
  text: string;
}

let current: Announcement | null = null;
const listeners = new Set<() => void>();

export function announce(text: string): void {
  current = { id: (current?.id ?? 0) + 1, text };
  for (const listener of listeners) listener();
}

export function currentAnnouncement(): Announcement | null {
  return current;
}

export function subscribeAnnouncement(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
