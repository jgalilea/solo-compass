import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "./i18n";
import { loadMeaningTables } from "./tableGames";
import { buildSampleAdventure } from "./sampleAdventure";
import { parseMarkdownToEntries } from "./lonelog";
import { splitRollText } from "./journalUi";

describe("sample adventure", () => {
  it("has the same script (kinds and dice) in every language", () => {
    const shape = (lang: "es" | "en") =>
      DICTIONARIES[lang].sample.script.map((l) =>
        "oracle" in l ? `oracle:${l.oracle}` : "table" in l ? `table:${l.table}:${l.roll}` : l.kind,
      );
    expect(shape("en")).toEqual(shape("es"));
  });

  for (const lang of ["es", "en"] as const) {
    it(`imports in full with the oracle answers recognised (${lang})`, async () => {
      const t = DICTIONARIES[lang];
      const { markdown } = buildSampleAdventure(t, await loadMeaningTables("solo-compass", t, lang));
      expect(markdown).not.toMatch(/undefined|\{\w+\}/);

      const entries = parseMarkdownToEntries(markdown, "a", 0);
      expect(entries).toHaveLength(t.sample.script.length);
      expect(entries.map((e) => e.kind)).toEqual(
        t.sample.script.map((l) => ("kind" in l ? l.kind : "roll")),
      );

      const answers = entries
        .filter((_, i) => "oracle" in t.sample.script[i])
        .map((e) => splitRollText(e.text).answer);
      expect(answers).toEqual(["si", "si", "contradiccion", "no"]);
      expect(entries.some((e) => e.text.includes("\n"))).toBe(true);
    });
  }
});
