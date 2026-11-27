import { describe, expect, it } from "vitest";
import { defaultDeviceName, FORGET_AFTER, mergeDevices, readDevice } from "./syncDevices";

describe("synced devices", () => {
  it("names a device after what it is and its browser, or 'app' when installed", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
    const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    const android = "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
    const ipad = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
    expect(defaultDeviceName(iphone, true)).toBe("iPhone · app");
    expect(defaultDeviceName(iphone, false)).toBe("iPhone · Safari");
    expect(defaultDeviceName(windows, false)).toBe("Windows · Chrome");
    expect(defaultDeviceName(android, false)).toBe("Android · Chrome");
    expect(defaultDeviceName(ipad, false, true)).toBe("iPad · Safari");
    expect(defaultDeviceName(ipad, false, false)).toBe("Mac · Safari");
  });

  it("keeps each device's latest news, and forgets one not heard of for long", () => {
    const now = 100 * FORGET_AFTER;
    const merged = mergeDevices(
      [{ id: "a", name: "Old name", seenAt: now - 1000 }, { id: "gone", name: "Gone", seenAt: now - FORGET_AFTER - 1 }],
      [{ id: "a", name: "New name", seenAt: now - 10 }, { id: "b", name: "Tablet", seenAt: now - 500 }],
      now,
    );
    expect(merged).toEqual([
      { id: "a", name: "New name", seenAt: now - 10 },
      { id: "b", name: "Tablet", seenAt: now - 500 },
    ]);
  });

  it("reads only what's a device", () => {
    expect(readDevice({ id: "a", name: "  Phone  ", seenAt: 1 })).toEqual({ id: "a", name: "Phone", seenAt: 1 });
    expect(readDevice({ id: "a", name: "x".repeat(200), seenAt: 1 })?.name).toHaveLength(40);
    expect(readDevice({ id: "a", seenAt: 1 })).toBeNull();
    expect(readDevice("nonsense")).toBeNull();
  });
});
