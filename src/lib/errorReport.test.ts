import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./appVersion";
import { errorIssueUrl, errorReport } from "./errorReport";

describe("error report", () => {
  const error = new TypeError("x is undefined");
  error.stack = "TypeError: x is undefined\n    at a (app.js:1:2)\n    at b (app.js:3:4)";
  const where = { screen: "#/diario/abc", userAgent: "Firefox 140", date: new Date("2026-11-11T10:00:00Z") };

  it("says which version, where and what, and nothing else", () => {
    const report = errorReport(error, where);
    expect(report.split("\n")).toEqual([
      expect.stringContaining(`Solo Compass ${APP_VERSION}`),
      "2026-11-11T10:00:00.000Z · #/diario/abc",
      "Firefox 140",
      "",
      "TypeError: x is undefined",
      "at a (app.js:1:2)",
      "at b (app.js:3:4)",
    ]);
  });

  it("opens a GitHub issue with it", () => {
    const url = new URL(errorIssueUrl(error, "the report"));
    expect(url.pathname).toBe("/jgalilea/solo-compass/issues/new");
    expect(url.searchParams.get("title")).toBe("Error: x is undefined");
    expect(url.searchParams.get("body")).toContain("the report");
  });
});
