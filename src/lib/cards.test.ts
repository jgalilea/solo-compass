import { describe, expect, it } from "vitest";
import { cardFace, cardIdentity, cardName, deckCards, drawCard, formatCardDraw, isCardDraw, showDraws } from "./cards";
import { DEFAULT_CARD_SETTINGS, mergeCardSettings, normalizeCardSettings, shuffleKey, withShuffle } from "./cardSettings";
import { cardsDrawn, createDiceRollEntries, createDiceRollEntry, normalizeHistoryEntry } from "./history";
import { splitRollSeries, splitRollText } from "./journalUi";
import { exportAdventureToMarkdown, parseMarkdownToEntries } from "./lonelog";
import { es } from "./i18n/locales/es";

const plain = { jokers: false, reversed: false };

describe("decks", () => {
  it("has the add-on's cards: 52 (+2 jokers) and a 78-card tarot", () => {
    expect(deckCards("poker", plain)).toHaveLength(52);
    expect(deckCards("poker", { ...plain, jokers: true })).toEqual(expect.arrayContaining(["RJkr", "BJkr", "10h", "Qs", "Ac"]));
    const tarot = deckCards("tarot", plain);
    expect(tarot).toHaveLength(78);
    expect(tarot).toEqual(expect.arrayContaining(["M0", "M21", "KnCu", "PgSw", "10Pe", "AWa"]));
  });

  it("names every card in both languages", () => {
    for (const deck of ["poker", "tarot"] as const) {
      for (const card of deckCards(deck, { jokers: true, reversed: false })) {
        expect(cardName(card, "es")).toBeTruthy();
        expect(cardName(card, "en")).toBeTruthy();
      }
    }
    expect(cardName("Qs", "es")).toBe("Reina de picas");
    expect(cardName("Qs", "en")).toBe("Queen of Spades");
    expect(cardName("M16r", "es")).toBe("La Torre, invertida");
    expect(cardName("KnCu", "en")).toBe("Knight of Cups");
    expect(cardName("M8", "en")).toBe("Strength");
    expect(cardName("nope", "es")).toBeNull();
  });

  it("knows a card whichever way up", () => {
    expect(cardIdentity("M16r")).toBe("M16");
    expect(cardIdentity("7War")).toBe("7Wa");
    expect(cardIdentity("Qs")).toBe("Qs");
  });
});

describe("drawCard", () => {
  it("leaves out the cards drawn, and runs out", () => {
    const all = deckCards("poker", plain);
    const drawn = all.slice(0, 51);
    expect(drawCard("poker", plain, drawn)).toBe(all[51]);
    expect(drawCard("poker", plain, all)).toBeNull();
    // Cards that repeat: any card, even with all of them drawn.
    expect(drawCard("poker", plain, null, () => 0)).toBe(all[0]);
  });

  it("turns a tarot card over half the time, only if asked", () => {
    expect(drawCard("tarot", { ...plain, reversed: true }, null, () => 0)).toBe("M0r");
    expect(drawCard("tarot", { ...plain, reversed: true }, null, () => 0.9)).toMatch(/^[^r]+$/);
    expect(drawCard("tarot", plain, null, () => 0)).toBe("M0");
    expect(drawCard("poker", { ...plain, reversed: true }, null, () => 0)).toBe("Ah");
  });
});

describe("a draw in the journal", () => {
  it("is written as Lonelog's Cards add-on and shown with its face", () => {
    expect(formatCardDraw("Qs", "es")).toBe("draw=Qs -> Reina de picas");
    expect(cardFace("10h")).toBe("10♥");
    expect(cardFace("M16r")).toBe("M16r");
    expect(showDraws("Omen draw=Qs -> Queen of Spades")).toBe("Omen Q♠ -> Queen of Spades");
    expect(isCardDraw("Presagio draw=4d -> Cuatro de diamantes, draw=Ks -> Rey de picas")).toBe(true);
    expect(isCardDraw("draw=Qs -> Reina de picas, d6 -> 4")).toBe(false);
    expect(isCardDraw("d6 -> 4")).toBe(false);
  });

  it("reads as a roll, alone or with others", () => {
    expect(splitRollText("draw=Qs -> Reina de picas")).toMatchObject({ detail: "draw=Qs", result: "Reina de picas" });
    expect(splitRollSeries("Presagio draw=Qs -> Reina de picas, draw=M16r -> La Torre, invertida, d6 -> 4")).toEqual({
      label: "Presagio",
      rolls: [
        { label: "", die: "draw=Qs", result: "Reina de picas" },
        { label: "", die: "draw=M16r", result: "La Torre, invertida" },
        { label: "", die: "d6", result: "4" },
      ],
    });
  });

  it("goes out and back in a .md as a roll", () => {
    const entry = { id: "e1", adventureId: "a", timestamp: 1, kind: "roll" as const, text: "draw=Qs -> Reina de picas" };
    const md = exportAdventureToMarkdown(es, "A", [entry]);
    expect(md).toContain("d: draw=Qs -> Reina de picas");
    expect(parseMarkdownToEntries(md, "a", 1).map((e) => [e.kind, e.text])).toContainEqual(["roll", "draw=Qs -> Reina de picas"]);
  });
});

describe("the deck of an adventure", () => {
  const draw = (id: string, adventureId: string | undefined, at: number) =>
    createDiceRollEntry(`draw=${id} -> x`, adventureId, { deck: id.startsWith("M") ? "tarot" : "poker", id }, at);

  it("is the cards of that adventure drawn since its last shuffle", () => {
    const history = [draw("Qs", "a", 10), draw("3h", "a", 30), draw("Kd", "b", 30), draw("2c", undefined, 30), draw("M16r", "a", 30)];
    expect(cardsDrawn(history, "a", "poker", 0)).toEqual(["Qs", "3h"]);
    expect(cardsDrawn(history, "a", "poker", 20)).toEqual(["3h"]);
    expect(cardsDrawn(history, undefined, "poker", 0)).toEqual(["2c"]);
    expect(cardsDrawn(history, "a", "tarot", 0)).toEqual(["M16"]);
  });

  it("keeps a tray's rolls in their order, a millisecond apart", () => {
    const [a, b] = createDiceRollEntries([{ text: "d6 -> 4" }, { text: "draw=Qs -> x", card: { deck: "poker", id: "Qs" } }], "a", 100);
    expect([a.timestamp, b.timestamp]).toEqual([100, 101]);
    expect(b).toMatchObject({ adventureId: "a", card: { deck: "poker", id: "Qs" } });
    expect(a).not.toHaveProperty("card");
  });

  it("keeps a draw's card in the history", () => {
    const entry = draw("M16r", "a", 5);
    expect(normalizeHistoryEntry(entry)).toEqual(entry);
    expect(normalizeHistoryEntry({ ...entry, card: { deck: "uno", id: "x" } })).not.toHaveProperty("card");
  });

  it("settings read leniently, and a backup's shuffles merge by the latest", () => {
    expect(normalizeCardSettings({ tool: "cards", deck: "tarot", unique: false, shuffles: { k: 5, bad: "x" } })).toEqual({
      ...DEFAULT_CARD_SETTINGS,
      tool: "cards",
      deck: "tarot",
      unique: false,
      shuffles: { k: 5 },
    });
    expect(normalizeCardSettings(null)).toEqual(DEFAULT_CARD_SETTINGS);
    const key = shuffleKey("a", "poker");
    const local = withShuffle(DEFAULT_CARD_SETTINGS, key, 50);
    const restored = withShuffle(withShuffle(DEFAULT_CARD_SETTINGS, key, 20), shuffleKey(undefined, "tarot"), 7);
    expect(mergeCardSettings(local, restored).shuffles).toEqual({ [key]: 50, "|tarot": 7 });
  });
});
