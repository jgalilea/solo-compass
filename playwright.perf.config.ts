import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config.ts";

/**
 * Performance checks (e2e/*.perf.ts): start-up on a slow connection
 * and a large synthetic journal, apart from the smoke test so the
 * deploy doesn't run them. Phone only:
 * CPU throttling is a Chromium feature, and the phone is the slow case.
 */
export default defineConfig({
  ...base,
  testMatch: "*.perf.ts",
  retries: 0,
  // One at a time: timings taken side by side disturb each other.
  workers: 1,
  projects: [{ name: "slow-phone", use: { ...devices["Pixel 7"] } }],
});
