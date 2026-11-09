import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config.ts";

/**
 * Performance check with a large synthetic journal (e2e/*.perf.ts),
 * apart from the smoke test so the deploy doesn't run it. Phone only:
 * CPU throttling is a Chromium feature, and the phone is the slow case.
 */
export default defineConfig({
  ...base,
  testMatch: "*.perf.ts",
  retries: 0,
  projects: [{ name: "slow-phone", use: { ...devices["Pixel 7"] } }],
});
