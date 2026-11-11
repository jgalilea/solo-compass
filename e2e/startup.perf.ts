import { expect, test, type Browser } from "@playwright/test";

/**
 * Start-up on a modest phone (CPU 4x slower): a first visit over a
 * slow 4G connection, where what counts is how much JavaScript the
 * first screen needs (the main bundle, the language in use), and a
 * repeat visit served by the service worker. Run by hand with
 * `npm run test:perf`; each timing is printed to compare runs.
 *
 * Budgets are generous on purpose: they catch something going badly
 * wrong (a screen that drags in every chunk), not small regressions.
 */

const CPU_SLOWDOWN = 4;
/** Lighthouse's "slow 4G". */
const SLOW_4G = { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
const RUNS = 3;

interface Paint {
  fcp: number;
  /** Compressed JavaScript fetched before the first paint. */
  jsKB: number;
}

async function visitTwice(browser: Browser, baseURL: string, route: string): Promise<{ first: Paint; repeat: Paint }> {
  const context = await browser.newContext({ ...test.info().project.use, locale: "es-ES" });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, ...SLOW_4G });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });

  const paint = async (): Promise<Paint> => {
    await page.getByRole("navigation").first().waitFor();
    return page.evaluate(() => {
      // (This tsconfig has no DOM types: the resource entries by shape.)
      type Resource = { name: string; responseEnd: number; transferSize: number };
      const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
      const js = (performance.getEntriesByType("resource") as unknown as Resource[])
        .filter((r) => r.name.endsWith(".js") && r.responseEnd <= fcp)
        .reduce((sum, r) => sum + r.transferSize, 0);
      return { fcp, jsKB: js / 1024 };
    });
  };

  await page.goto(baseURL + route);
  const first = await paint();
  // Once the service worker has everything, the same screen again.
  await page.evaluate(() => (navigator as unknown as { serviceWorker: { ready: Promise<unknown> } }).serviceWorker.ready);
  await page.waitForTimeout(1000);
  await page.goto("about:blank");
  await page.goto(baseURL + route);
  const repeat = await paint();
  await context.close();
  return { first, repeat };
}

const median = (values: number[]) => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];

for (const [label, route] of [
  ["oracle", ""],
  ["journal list", "#/diario"],
] as const) {
  test(`starts quickly on the ${label}`, async ({ browser, baseURL }) => {
    test.setTimeout(3 * 60_000);
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await visitTwice(browser, baseURL!, route));
    for (const visit of ["first", "repeat"] as const) {
      const fcp = median(runs.map((r) => r[visit].fcp));
      const jsKB = median(runs.map((r) => r[visit].jsKB));
      console.log(`${`${label}, ${visit} visit`.padEnd(30)} first paint ${String(Math.round(fcp)).padStart(5)} ms  (JS before it: ${Math.round(jsKB)} kB)`);
      test.info().annotations.push({ type: `${visit} visit`, description: `${Math.round(fcp)} ms` });
    }
    expect(median(runs.map((r) => r.first.fcp)), "first visit").toBeLessThan(3000);
    expect(median(runs.map((r) => r.repeat.fcp)), "repeat visit").toBeLessThan(1000);
  });
}
