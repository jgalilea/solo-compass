import { afterEach, describe, expect, it, vi } from "vitest";
import { syncReport } from "./syncEngine";
import { callRelay, relayTimeout } from "./syncRelay";
import { encodeFrame, type SyncRequest } from "./syncWire";

const request: SyncRequest = {
  v: 1,
  op: "sync",
  box: "ab".repeat(16),
  pass: "p".repeat(43),
  epoch: null,
  since: null,
  size: 0,
};

/** A fetch that never answers, until its signal gives up. */
function hangingFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError")),
      );
    });
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("calling the relay", () => {
  it("gives up on a request that hangs, instead of keeping the sync stuck", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());
    const call = callRelay("https://relay.test", request);
    let settled = false;
    void call.then(() => (settled = true));
    // Half a minute (and a little more for what it carries), not less…
    await vi.advanceTimersByTimeAsync(relayTimeout(0) - 1);
    expect(settled).toBe(false);
    // …nor much more.
    await vi.advanceTimersByTimeAsync(1000);
    await expect(call).resolves.toEqual({ ok: false, error: "network" });
  });

  it("also gives up when the answer stops halfway", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array([0, 0]));
            init?.signal?.addEventListener("abort", () =>
              controller.error(new DOMException("aborted", "AbortError")),
            );
          },
        });
        return new Response(body, { status: 200 });
      }),
    );
    const call = callRelay("https://relay.test", request);
    await vi.advanceTimersByTimeAsync(relayTimeout(0) + 1000);
    await expect(call).resolves.toEqual({ ok: false, error: "network" });
  });

  it("waits longer for a bigger request, within reason", () => {
    expect(relayTimeout(0)).toBe(30_000);
    expect(relayTimeout(8 * 1024 * 1024)).toBeGreaterThan(relayTimeout(1024 * 1024));
    expect(relayTimeout(1e12)).toBe(5 * 60_000);
  });

  it("reads what isn't the relay's answer as a failure, never throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>Cloudflare error</html>", { status: 503 })),
    );
    await expect(callRelay("https://relay.test", request)).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nonsense", { status: 200 })),
    );
    await expect(callRelay("https://relay.test", request)).resolves.toEqual({
      ok: false,
      error: "bad-reply",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );
    await expect(callRelay("https://relay.test", request)).resolves.toEqual({
      ok: false,
      error: "network",
    });
    const frame = encodeFrame({ ok: false, error: "rate", now: 0, retryAfter: 30 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array(frame), { status: 429 })),
    );
    await expect(callRelay("https://relay.test", request)).resolves.toEqual({
      ok: false,
      error: "rate",
      retryAfter: 30,
    });
  });
});

describe("a sync failure's report", () => {
  it("says where it failed, never what the error quoted", () => {
    const error = new SyntaxError(
      'Unexpected token, "La lámpara lleva días apagada" is not valid JSON',
    );
    const report = syncReport(error, "TestBrowser/1.0");
    expect(report).toContain("SyntaxError");
    expect(report).toContain("TestBrowser/1.0");
    expect(report).toMatch(/^Solo Compass .* · sync/);
    expect(report).not.toContain("lámpara");
    expect(report).not.toContain("not valid JSON");
    // Where in the code it happened is kept.
    expect(report.split("\n").length).toBeGreaterThan(5);
  });

  it("copes with anything thrown", () => {
    expect(syncReport("La lámpara", "UA")).not.toContain("lámpara");
    expect(syncReport(undefined, "UA")).toContain("undefined");
  });
});
