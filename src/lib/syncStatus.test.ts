import { describe, expect, it } from "vitest";
import { nextSyncReset, PAUSE_DOT_AFTER, syncGlance, syncNeedsAttention } from "./syncStatus";

describe("sync status", () => {
  it("knows when the relay's daily allowance starts again: midnight UTC", () => {
    expect(new Date(nextSyncReset(Date.UTC(2026, 10, 26, 21, 40))).toISOString()).toBe("2026-11-27T00:00:00.000Z");
    expect(new Date(nextSyncReset(Date.UTC(2026, 11, 31, 23, 59))).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("puts a dot on Settings only for a long pause or something to do", () => {
    const now = 10_000_000;
    expect(syncNeedsAttention(null, now)).toBe(false);
    expect(syncNeedsAttention({ state: "ok", at: now, skew: 0 }, now)).toBe(false);
    expect(syncNeedsAttention({ state: "offline", since: 0 }, now)).toBe(false);
    const paused = { state: "paused" as const, reason: "unreachable" as const, retryAt: now };
    expect(syncNeedsAttention({ ...paused, since: now - 60_000 }, now)).toBe(false);
    expect(syncNeedsAttention({ ...paused, since: now - PAUSE_DOT_AFTER }, now)).toBe(true);
    expect(syncNeedsAttention({ state: "error", since: now, reason: "full" }, now)).toBe(true);
    // Something that failed here and is tried again by itself: like a pause.
    const hiccup = { state: "error" as const, reason: "unexpected" as const, retryAt: now + 60_000 };
    expect(syncNeedsAttention({ ...hiccup, since: now - 60_000 }, now)).toBe(false);
    expect(syncNeedsAttention({ ...hiccup, since: now - PAUSE_DOT_AFTER }, now)).toBe(true);
    expect(syncNeedsAttention({ state: "stale", since: now, lastSyncAt: 0 }, now)).toBe(true);
    expect(syncNeedsAttention({ state: "closed", since: now }, now)).toBe(true);
  });

  it("says at a glance how the sync is going", () => {
    const now = Date.now();
    const ok = { state: "ok" as const, at: now, skew: 0 };
    expect(syncGlance(false, null, false, false)).toBe("off");
    expect(syncGlance(true, null, false, false)).toBe("waiting");
    expect(syncGlance(true, ok, false, false)).toBe("ok");
    // What's being done comes first, then what's waiting to go.
    expect(syncGlance(true, ok, true, true)).toBe("syncing");
    expect(syncGlance(true, ok, false, true)).toBe("pending");
    expect(syncGlance(true, { state: "offline", since: now }, false, true)).toBe("offline");
    expect(syncGlance(true, { state: "paused", since: now, reason: "quota", retryAt: now }, false, false)).toBe("paused");
    expect(syncGlance(true, { state: "error", since: now, reason: "full" }, false, false)).toBe("problem");
    const hiccup = { state: "error" as const, reason: "unexpected" as const, retryAt: now };
    expect(syncGlance(true, { ...hiccup, since: now }, false, false)).toBe("paused");
    expect(syncGlance(true, { ...hiccup, since: now - PAUSE_DOT_AFTER }, false, false)).toBe("problem");
    expect(syncGlance(true, { state: "stale", since: now, lastSyncAt: 0 }, false, false)).toBe("problem");
    // Closed from another device: this one stopped, and says so until it's read.
    expect(syncGlance(false, { state: "closed", since: now }, false, false)).toBe("problem");
  });
});
