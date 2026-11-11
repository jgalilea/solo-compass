import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "./i18n/allDictionaries";
import type { SampleLine } from "./i18n/types";
import { loadMeaningTables } from "./tableGames";
import { buildSampleAdventure } from "./sampleAdventure";
import { parseDescriptionsFromMarkdown, parseMarkdownToEntries, parseNotesFromMarkdown } from "./lonelog";
import { splitRollText } from "./journalUi";
import { buildCast, foeIsOut, threadStatus } from "./lonelogTags";
import { noteForm, parseScene, splitActor, splitRollSymbol } from "./lonelogLines";
import { rollFormula } from "./diceNotation";
import { cardName, isCardDraw } from "./cards";

const shapeOf = (l: SampleLine) =>
  "oracle" in l
    ? `oracle:${l.oracle}`
    : "table" in l
      ? `table:${l.table}:${l.roll}`
      : "inspiration" in l
        ? `inspiration:${l.inspiration}`
        : `${l.kind}${"date" in l ? `:${l.date}` : ""}`;

async function build(lang: "es" | "en") {
  const t = DICTIONARIES[lang];
  const { markdown } = buildSampleAdventure(t, await loadMeaningTables("solo-compass", t, lang));
  return { t, markdown, entries: parseMarkdownToEntries(markdown, "a", 0) };
}

describe("sample adventure", () => {
  it("has the same script (kinds, dice and dates) in every language", () => {
    expect(DICTIONARIES.en.sample.script.map(shapeOf)).toEqual(DICTIONARIES.es.sample.script.map(shapeOf));
  });

  for (const lang of ["es", "en"] as const) {
    it(`imports in full with the oracle answers recognised (${lang})`, async () => {
      const { t, markdown, entries } = await build(lang);
      expect(markdown).not.toMatch(/undefined|\{\w+\}/);
      expect(entries).toHaveLength(t.sample.script.length);
      expect(entries.map((e) => e.kind)).toEqual(
        t.sample.script.map((l) => ("kind" in l ? l.kind : "roll")),
      );

      const answers = entries
        .filter((_, i) => "oracle" in t.sample.script[i])
        .map((e) => splitRollText(e.text).answer);
      expect(answers).toEqual(["si", "si", "no", "contradiccion", "no", "si"]);
      expect(entries.some((e) => e.text.includes("\n"))).toBe(true);
    });

    it(`shows off what a journal can hold (${lang})`, async () => {
      const { t, entries } = await build(lang);
      // Sessions keep their day of play.
      expect(entries.filter((e) => e.kind === "session").map((e) => e.date)).toEqual(["2026-10-03", "2026-10-10", "2026-10-17"]);
      // Scenes, one of them a fight, and a scene tested with the oracle.
      expect(entries.filter((e) => e.kind === "scene").map((e) => parseScene(e.text).id)).toEqual(["S1", "S2", "S3", "S4"]);
      expect(entries.some((e) => e.kind === "scene" && parseScene(e.text).combat)).toBe(true);
      expect(entries.some((e) => e.kind === "question" && e.text === t.journal.sceneCheckQuestion)).toBe(true);
      // Every kind of roll: tables, quick inspiration and dice formulas.
      const rolls = entries.filter((e) => e.kind === "roll").map((e) => splitRollSymbol(e.text).symbol);
      expect(new Set(rolls)).toEqual(new Set(["d", "tbl", "gen"]));
      expect(entries.some((e) => e.text.includes("kh1"))).toBe(true);
      expect(entries.some((e) => e.kind === "roll" && /, \S+ 1d6\+1 ->/.test(e.text))).toBe(true);
      // A card drawn, as the cards tool writes it.
      expect(entries.some((e) => e.kind === "roll" && isCardDraw(e.text))).toBe(true);
      // Someone else's action and every special note.
      expect(entries.some((e) => e.kind === "action" && splitActor(e.text).actor)).toBe(true);
      const forms = entries.filter((e) => e.kind === "note").map((e) => noteForm(e.text).form);
      for (const form of ["plain", "dialogue", "meta", "excerpt", "block", "round"]) expect(forms).toContain(form);
    });

    it(`writes its dice rolls exactly as the dice tool would (${lang})`, async () => {
      const { entries } = await build(lang);
      for (const entry of entries) {
        if (entry.kind !== "roll" || splitRollSymbol(entry.text).symbol !== "d" || entry.text.includes(" — ")) continue;
        if (isCardDraw(entry.text)) {
          const [, card, name] = entry.text.match(/draw=(\S+) -> (.+)$/)!;
          expect(name).toBe(cardName(card, lang));
          continue;
        }
        for (const roll of entry.text.split(/, (?=\p{L})/u)) {
          const [, label, formula] = roll.match(/^(\p{L}+) (\S+) ->/u)!;
          // Same formula, same faces: only the numbers can differ.
          const shape = (s: string) => s.replace(/\d+/g, "#");
          expect(shape(rollFormula(`${formula} // ${label}`)!)).toBe(shape(roll));
        }
      }
    });
  }
});

describe("sample adventure notebook", () => {
  for (const lang of ["es", "en"] as const) {
    it(`fills every section of the notebook (${lang})`, async () => {
      const { t, markdown, entries } = await build(lang);
      const cast = buildCast(entries);
      expect(new Set(cast.map((c) => c.kind))).toEqual(
        new Set(["pc", "npc", "place", "thread", "clock", "track", "timer", "room", "foe", "item", "wealth"]),
      );
      const one = (kind: string) => cast.find((c) => c.kind === kind)!;
      expect(one("pc").tags).toContain(lang === "es" ? "herida" : "wounded");
      expect(foeIsOut(one("foe"))).toBe(true);
      expect(cast.filter((c) => c.kind === "place")[1].tags).toEqual(lang === "es" ? ["habitado"] : ["inhabited"]);
      // Money and supplies spent along the way; the trail followed to the end.
      expect(one("wealth").progress?.value).toBe(3);
      expect(cast.filter((c) => c.kind === "item").map((c) => c.progress?.value)).toEqual([1, 2]);
      expect(one("track").progress).toEqual({ value: 4, max: 4 });
      expect(cast.filter((c) => c.kind === "thread").map((c) => threadStatus(c))).toEqual(["closed", "open"]);

      expect(parseNotesFromMarkdown(markdown)).toBe(t.sample.notes);
      const descriptions = parseDescriptionsFromMarkdown(markdown);
      expect(Object.keys(descriptions)).toHaveLength(4);
      // Each description belongs to someone in the journal.
      for (const key of Object.keys(descriptions)) expect(cast.map((c) => c.key)).toContain(key);
    });
  }
});
