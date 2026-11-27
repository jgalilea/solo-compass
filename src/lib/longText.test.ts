import { describe, expect, it } from "vitest";
import { parseMarkdownToEntries } from "./lonelog";
import { actorParts, formatScene, parseScene } from "./lonelogLines";
import { parseInline } from "./noteMarkdown";
import { fromRollLine, loneRoll, splitRollSeries, toRollLine } from "./rollLine";
import { foreignRollKind, splitOwnRolls } from "./journalUi";
import { showDetail } from "./lonelogTags";
import { DICTIONARIES } from "./i18n/allDictionaries";

/**
 * Text no one writes, but a file can bring: each of these took a time
 * that grew with the square of its length (a line of 300,000 characters
 * froze the tab for most of a minute while importing, and the same
 * when drawing it). Every one is read in a blink now. The budget is
 * generous, so a slow machine doesn't fail it: the old way took seconds
 * to minutes at these lengths.
 */
const LONG = 200_000;
const BUDGET_MS = 1000;

function fast(run: () => unknown) {
  const started = performance.now();
  run();
  expect(performance.now() - started).toBeLessThan(BUDGET_MS);
}

describe("long texts read in linear time", () => {
  it("a roll line that never ends", () => {
    const line = "d: " + "d6+".repeat(LONG / 3);
    fast(() => parseMarkdownToEntries(line, "a", 0));
    fast(() => fromRollLine(line.slice(3)));
  });

  it("rolls as the journal draws them", () => {
    const spaces = " ".repeat(LONG);
    for (const text of [spaces, "d6 -> 3, ".repeat(LONG / 9), "(".repeat(LONG)]) {
      fast(() => loneRoll(text));
      fast(() => splitRollSeries(text));
      fast(() => toRollLine(text));
      fast(() => splitOwnRolls(`d: ${text}`));
      fast(() => foreignRollKind(text, "3"));
    }
  });

  it("scenes, actors and tag details", () => {
    const spaces = " ".repeat(LONG);
    fast(() => formatScene("S1", spaces));
    fast(() => parseScene(`S1 ${spaces}x`));
    fast(() => actorParts(spaces));
    fast(() => showDetail(spaces, DICTIONARIES.es.notebook.categories));
  });

  it("a note's marks", () => {
    for (const text of [
      "[".repeat(LONG),
      "*".repeat(LONG),
      "~".repeat(LONG),
      "_a".repeat(LONG / 2),
    ]) {
      fast(() => parseInline(text));
    }
  });

  it("still reads what it always read", () => {
    expect(
      actorParts("Kael > Odile + Hal")
        .filter((p) => p.name)
        .map((p) => p.name),
    ).toEqual(["Kael", "Odile", "Hal"]);
    expect(formatScene("S2", "La cripta\n  @(Jordan)")).toBe("S2 *La cripta* @(Jordan)");
    expect(loneRoll("Ataque d20+5 -> 19 (14 + 5)")).toMatchObject({
      rolls: [{ die: "d20+5", result: "19 (14 + 5)" }],
    });
  });
});
