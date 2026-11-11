import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./appVersion";
import { CHANGELOG } from "./changelog";

const semver = (v: string) => v.split(".").map(Number);
const newer = (a: string, b: string) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

describe("changelog", () => {
  // APP_VERSION is package.json's (vite.config.ts defines it, for tests too).
  it("its newest chapter is the app's version", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(CHANGELOG[0].version).toBe(APP_VERSION);
  });

  it("goes from newest to oldest, one version per chapter", () => {
    for (const entry of CHANGELOG) expect(entry.version, entry.text.en.title).toMatch(/^\d+\.\d+\.\d+$/);
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(newer(CHANGELOG[i - 1].version, CHANGELOG[i].version), CHANGELOG[i].version).toBe(true);
      expect(CHANGELOG[i - 1].date >= CHANGELOG[i].date, CHANGELOG[i].version).toBe(true);
    }
  });

  it("tells each chapter the same in both languages", () => {
    for (const { version, text } of CHANGELOG) {
      expect(text.en.items.length, version).toBe(text.es.items.length);
      expect(!!text.en.intro, version).toBe(!!text.es.intro);
    }
  });
});
