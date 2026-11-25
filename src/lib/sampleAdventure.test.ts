import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "./i18n/allDictionaries";
import type { SampleLine } from "./i18n/types";
import { loadMeaningTables } from "./tableGames";
import { buildSampleAdventure } from "./sampleAdventure";
import { exportAdventureToMarkdown, parseDescriptionsFromMarkdown, parseMarkdownToEntries, parseNotesFromMarkdown } from "./lonelog";
import { splitOwnRolls, splitRollText } from "./journalUi";
import { buildCast, foeIsOut, threadStatus } from "./lonelogTags";
import { askedQuestion } from "./rollLog";
import { SCENE_CHECK_LIKELIHOOD } from "./sceneCheck";
import { isGenerator, isTableDefinition, noteForm, parseScene, splitActor, splitRollSymbol } from "./lonelogLines";
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
      // Word for word: nothing in it is split or read as something else.
      expect(entries.filter((_, i) => "kind" in t.sample.script[i]).map((e) => e.text)).toEqual(
        t.sample.script.flatMap((l) => ("kind" in l ? [l.text] : [])),
      );
      const again = parseMarkdownToEntries(exportAdventureToMarkdown(t, "A", entries), "a", 0);
      expect(again.map((e) => [e.kind, e.text, e.date])).toEqual(entries.map((e) => [e.kind, e.text, e.date]));
      expect(entries.some((e) => e.text.includes("\n"))).toBe(true);
    });

    it(`shows off what a journal can hold (${lang})`, async () => {
      const { t, entries } = await build(lang);
      // Sessions keep their day of play.
      expect(entries.filter((e) => e.kind === "session").map((e) => e.date)).toEqual(["2026-10-03", "2026-10-10", "2026-10-17"]);
      // Scenes, one of them a fight, and a scene tested with the oracle.
      expect(entries.filter((e) => e.kind === "scene").map((e) => parseScene(e.text).id)).toEqual(["S1", "S1a", "S2", "S2.1", "S2.2", "T1-S3", "T2-S1", "T1-S4", "S5"]);
      expect(entries.some((e) => e.kind === "scene" && parseScene(e.text).combat)).toBe(true);
      expect(entries.some((e) => e.kind === "question" && e.text === askedQuestion(t, t.journal.sceneCheckQuestion, SCENE_CHECK_LIKELIHOOD))).toBe(true);
      // Every kind of roll: tables, quick inspiration and dice formulas.
      const rolls = entries.filter((e) => e.kind === "roll");
      expect(new Set(rolls.map((e) => splitRollSymbol(e.text).symbol))).toEqual(new Set(["d", "tbl", "result"]));
      expect(rolls.some((e) => isGenerator(e.text))).toBe(true);
      // Lonelog 1.7's: a table written out, axes, an answer's code, a verdict, roll context, a storyline's view…
      expect(rolls.some((e) => isTableDefinition(e.text))).toBe(true);
      expect(rolls.some((e) => isGenerator(e.text) && e.text.includes("\n"))).toBe(true);
      expect(rolls.some((e) => splitRollSymbol(e.text).symbol === "result")).toBe(true);
      expect(rolls.some((e) => / vs \d+ -> /.test(e.text))).toBe(true);
      expect(rolls.some((e) => /^\+\[.+\] -\[.+\] d20/.test(e.text))).toBe(true);
      expect(entries.some((e) => e.kind === "scene" && parseScene(e.text).pov)).toBe(true);
      expect(entries.some((e) => e.kind === "question" && e.text.endsWith(")"))).toBe(true);
      expect(entries.filter((e) => e.kind === "action").map((e) => splitActor(e.text).actor ?? "").join()).toMatch(/\+.* > /);
      const all = entries.map((e) => e.text).join("\n");
      for (const form of [/\|[^|\]:]+>[^|\]]+[|\]]/, /:\+/, /\|×\d/, /\|×-\d/, /\|-\p{L}/u, /\[#/, /\[E:/, /\[Deck:/, /out:\+/, /\[Track:[^\]]+\+1\]/, /\[Timer:[^\]]+-1\]/, /owner:/, /where:/, /pos:/, /\(retcon:/, /\(todo:/, /\(interp:/])
        expect(all, String(form)).toMatch(form);
      expect(entries.some((e) => noteForm(e.text).form === "dialogue" && /^PC \(/.test(e.text))).toBe(true);
      expect(new Set(entries.map((e) => noteForm(e.text)).flatMap((f) => (f.form === "block" ? [f.name] : [])))).toEqual(new Set(["combat", "dungeon", "resources"]));
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
        if (entry.kind !== "roll" || entry.text.includes(" — ")) continue;
        if (isCardDraw(entry.text)) {
          const [, card, name] = entry.text.match(/draw=(\S+) -> (.+)$/)!;
          expect(name).toBe(cardName(card, lang));
          continue;
        }
        if (splitRollSymbol(entry.text).symbol !== "d") continue;
        // A roll with its verdict isn't the tool's; what helps or hinders goes before the dice.
        if (!splitOwnRolls(entry.text)) continue;
        for (const roll of entry.text.replace(/^(?:[+-]\[[^\]]*\] )+/, lang === "es" ? "Regatear " : "Haggle ").split(/, (?=\p{L})/u)) {
          const [, label, formula] = roll.match(/^(\p{L}+) (\S+) ->/u)!;
          // Same formula, same faces: only the numbers can differ.
          const shape = (s: string) => s.replace(/\d+✓?/g, "#");
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
        new Set(["pc", "npc", "place", "thread", "clock", "track", "timer", "event", "room", "foe", "item", "wealth", "deck"]),
      );
      const one = (kind: string) => cast.find((c) => c.kind === kind)!;
      expect(one("pc").tags).toContain(lang === "es" ? "herida" : "wounded");
      expect(cast.filter((c) => c.kind === "foe").map(foeIsOut)).toEqual([true, true]);
      expect(cast.filter((c) => c.kind === "place")[1].tags).toEqual(lang === "es" ? ["habitado"] : ["inhabited"]);
      // Money and supplies spent along the way; the trail followed to the end.
      expect(one("wealth").progress?.value).toBe(3);
      expect(one("wealth").owner).toBe("Mara");
      expect(cast.filter((c) => c.kind === "item").map((c) => c.progress?.value)).toEqual([1, 2, 1]);
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
