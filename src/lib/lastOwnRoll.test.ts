import { describe, expect, it } from "vitest";
import { lastOwnRoll } from "./journalUi";
import type { JournalEntry } from "./lonelog";

describe("the last own roll", () => {
  const roll = (timestamp: number, text: string, adventureId = "a"): JournalEntry => ({
    id: String(timestamp),
    adventureId,
    timestamp,
    kind: "roll",
    text,
  });

  it("is the latest with dice in that adventure, not a card, a table or the oracle", () => {
    const entries = [
      roll(5, "draw=Qs -> Queen of Spades"),
      roll(3, "Attack d20+5 -> 19 (14 + 5), Damage 2d6 -> 7 (3+4)"),
      roll(1, "d6 -> 4"),
      roll(6, "tbl: Theme d66=25 -> Fire"),
      roll(7, "Recluse: white 3 / black 5 -> No"),
      roll(9, "d8 -> 1", "b"),
    ];
    expect(lastOwnRoll(entries, "a")).toMatchObject({
      label: "Attack",
      rolls: [
        { label: "", die: "d20+5" },
        { label: "Damage", die: "2d6" },
      ],
    });
    expect(lastOwnRoll(entries, "c")).toBeNull();
  });
});
