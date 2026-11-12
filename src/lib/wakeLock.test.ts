import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A browser with the Screen Wake Lock API, where locks can be counted. */
function fakeBrowser() {
  const store = new Map<string, string>();
  const docListeners = new Set<() => void>();
  const held: { released: boolean; fire: () => void }[] = [];
  const document = {
    visibilityState: "visible" as "visible" | "hidden",
    addEventListener: (_: string, listener: () => void) => docListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => docListeners.delete(listener),
  };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    },
  });
  vi.stubGlobal("document", document);
  vi.stubGlobal("navigator", {
    wakeLock: {
      request: async () => {
        let onRelease = () => {};
        const lock = {
          released: false,
          fire: () => onRelease(),
          addEventListener: (_: string, listener: () => void) => (onRelease = listener),
          release: async () => {
            lock.released = true;
            onRelease();
          },
        };
        held.push(lock);
        return lock;
      },
    },
  });
  return {
    store,
    held,
    active: () => held.filter((l) => !l.released).length,
    /** The browser hides the app (and drops the lock itself), or shows it again. */
    setVisible(visible: boolean) {
      document.visibilityState = visible ? "visible" : "hidden";
      if (!visible) for (const lock of held) if (!lock.released) {
        lock.released = true;
        lock.fire();
      }
      for (const listener of docListeners) listener();
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("keeping the screen on", () => {
  let browser: ReturnType<typeof fakeBrowser>;
  beforeEach(() => {
    vi.resetModules();
    browser = fakeBrowser();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is on until turned off, and remembered on this device", async () => {
    const wakeLock = await import("./wakeLock");
    expect(wakeLock.isKeepScreenOn()).toBe(true);
    wakeLock.setKeepScreenOn(false);
    expect(browser.store.get("solo-compass:keep-screen-on")).toBe("off");
    vi.resetModules();
    expect((await import("./wakeLock")).isKeepScreenOn()).toBe(false);
  });

  it("stays on for whoever had turned it on before it was the default", async () => {
    browser.store.set("solo-compass:keep-screen-on", "on");
    expect((await import("./wakeLock")).isKeepScreenOn()).toBe(true);
  });

  it("holds a lock only while it's on", async () => {
    const wakeLock = await import("./wakeLock");
    wakeLock.setKeepScreenOn(false);
    const stop = wakeLock.watchKeepScreenOn();
    await settle();
    expect(browser.active()).toBe(0);
    wakeLock.setKeepScreenOn(true);
    await settle();
    expect(browser.active()).toBe(1);
    wakeLock.setKeepScreenOn(false);
    await settle();
    expect(browser.active()).toBe(0);
    stop();
  });

  it("asks again when the app comes back into view", async () => {
    const wakeLock = await import("./wakeLock");
    wakeLock.setKeepScreenOn(true);
    const stop = wakeLock.watchKeepScreenOn();
    await settle();
    expect(browser.active()).toBe(1);
    browser.setVisible(false);
    await settle();
    expect(browser.active()).toBe(0);
    browser.setVisible(true);
    await settle();
    expect(browser.active()).toBe(1);
    expect(browser.held).toHaveLength(2);
    stop();
    await settle();
    expect(browser.active()).toBe(0);
  });
});
