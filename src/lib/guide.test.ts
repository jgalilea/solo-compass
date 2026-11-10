import { describe, expect, it } from "vitest";
import { DICTIONARIES, LOCALES } from "./i18n";
import { closeGuide, isGuideOpen, openGuide, subscribeGuide } from "./guide";
import { isCardDraw } from "./cards";
import { parseMarkdownToEntries, type JournalEntry } from "./lonelog";
import { noteForm, splitActor, splitRollSymbol } from "./lonelogLines";
import { buildCast, foeIsOut, threadStatus } from "./lonelogTags";

const note = (text: string, i: number): JournalEntry => ({ id: `e${i}`, adventureId: "a", kind: "note", text, timestamp: i });

describe("guide store", () => {
  it("opens and closes, telling whoever listens", () => {
    let calls = 0;
    const unsubscribe = subscribeGuide(() => calls++);
    openGuide();
    openGuide();
    expect(isGuideOpen()).toBe(true);
    closeGuide();
    expect(isGuideOpen()).toBe(false);
    expect(calls).toBe(2);
    unsubscribe();
  });
});

// The guide's examples must do what it says they do.
for (const locale of LOCALES) {
  const g = DICTIONARIES[locale].guide;

  describe(`quick guide (${locale})`, () => {
    it("reads every notation example as it says", () => {
      const read = (code: string) => parseMarkdownToEntries(code, "a", 0)[0];
      const [action, question, roll, consequence, session, scene, actor, dialogue, meta, , table, card] = g.notation.map((r) => r.code);
      expect(read(action).kind).toBe("action");
      expect(read(question).kind).toBe("question");
      expect(read(roll).kind).toBe("roll");
      expect(read(consequence).kind).toBe("consequence");
      expect(read(session).kind).toBe("session");
      expect(read(scene).kind).toBe("scene");
      expect(splitActor(read(actor).text).actor).toBe("Odile");
      expect(noteForm(read(dialogue).text).form).toBe("dialogue");
      expect(noteForm(read(meta).text).form).toBe("meta");
      expect(splitRollSymbol(read(table).text).symbol).toBe("tbl");
      expect(read(card).kind).toBe("roll");
      expect(isCardDraw(read(card).text)).toBe(true);
      // The narrative block and the fight, written out in full.
      expect(noteForm("\\---\nA letter\n---\\").form).toBe("excerpt");
      expect(["[COMBAT]", "Rd1 Strike", "[/COMBAT]"].map((t) => noteForm(t).form)).toEqual(["block", "round", "block"]);
    });

    it("makes one notebook element of each tag", () => {
      const kinds = g.tags.map((r, i) => buildCast([note(r.code, i)]).map((c) => c.kind));
      expect(kinds).toEqual([["pc"], ["npc"], ["place"], ["npc"], ["thread"], ["clock"], ["timer"], ["room"], ["foe"], ["item"], ["wealth"]]);
    });

    it("changes their state as the updates say", () => {
      const cast = buildCast([...g.tags, ...g.updates].map((r, i) => note(r.code, i)));
      const one = (kind: string) => cast.find((c) => c.kind === kind)!;
      const [ally, , , hp] = g.updates.map((r) => r.code.match(/\|([^\]]+)\]/)?.[1] ?? "");
      // Odile: the trait added stays, the one removed and the one swapped don't.
      expect(one("npc").tags).toEqual([ally]);
      expect(one("pc").tags.join()).toMatch(new RegExp(hp.replace(/-\d+$/, "")));
      expect(one("clock").progress).toEqual({ value: 3, max: 4 });
      expect(one("item").progress?.value).toBe(2);
      expect(threadStatus(one("thread"))).toBe("open");
      expect(foeIsOut(one("foe"))).toBe(false);
    });

    it("has the same rows in both languages", () => {
      const other = DICTIONARIES[locale === "es" ? "en" : "es"].guide;
      expect(g.notation.length).toBe(other.notation.length);
      expect(g.tags.length).toBe(other.tags.length);
      expect(g.updates.length).toBe(other.updates.length);
    });
  });
}
