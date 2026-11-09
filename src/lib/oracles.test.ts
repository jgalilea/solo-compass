import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialOracleId, loadFavoriteOracleId, saveFavoriteOracleId, saveOracleId } from "./oracles";

describe("the favorite oracle", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("opens the app with the last oracle used when there's no favorite", () => {
    expect(initialOracleId()).toBe("recluse");
    saveOracleId("ironsworn");
    expect(initialOracleId()).toBe("ironsworn");
  });

  it("opens with the favorite even after switching to another", () => {
    saveFavoriteOracleId("loner");
    saveOracleId("opse");
    expect(initialOracleId()).toBe("loner");
    saveFavoriteOracleId(null);
    expect(loadFavoriteOracleId()).toBeNull();
    expect(initialOracleId()).toBe("opse");
  });

  it("ignores a favorite that isn't an oracle any more", () => {
    window.localStorage.setItem("solo-compass:oracle-favorite", "mythic");
    expect(loadFavoriteOracleId()).toBeNull();
  });
});
