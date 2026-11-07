import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke test in a real browser (e2e/): the app is played as a person
 * would, on a phone and on a desktop, against the production build
 * served by `vite preview`. The deploy workflow runs it after the unit
 * tests, so a blank screen never goes live.
 */
const port = 4173;

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}/solo-compass/`,
    locale: "es-ES",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    // In CI the build is already there (the workflow builds before).
    command: `${process.env.CI ? "" : "npm run build && "}npx vite preview --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
  },
});
