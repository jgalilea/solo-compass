import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "./i18n/allDictionaries";
import { classifyRoll } from "./journalStats";
import { parseMarkdownToEntries } from "./lonelog";
import { TABLE_GAMES } from "./tableGames";

/** What a line of a journal counts as, once imported. */
function kindOf(line: string) {
  const [entry] = parseMarkdownToEntries(line, "a", 1);
  expect(entry.kind, line).toBe("roll");
  return classifyRoll(entry, undefined);
}

// Every shape of roll in Lonelog's spec and add-ons.
const DICE = [
  "d20=15 vs DC 12 -> Success", "Stealth d6=5 vs TN 4 -> Success", "d20+Lockpicking=17 vs DC 15 -> S", "d20=15 -> S", "d6=3 -> F",
  "Strike 2d6+2=9 -> Hit", "Strike 2d6+2[4, 3]=9 -> Hit", "Strike +[flanking] -[wounded] 2d6+2[4, 3]=9 -> Hit", "2d6=7 -> Strong Hit",
  "15≥14 -> Success", "2<4 -> F", "Lockpicking 5≥4 -> Success", "Stealth 4 vs TN 5 -> Fail", "Goblin 1 save 12<14 -> Fail",
  "2d20=17,8 (take higher=17) vs AC 14 -> Hit", "3d6=5,4,2 (take highest=5) -> Partial Success (4-5)", "4d6=6,6,4,1 (two 6s) -> Critical",
  "4 Base + 2 Skill = 3,5,6,1,4,6 -> 2 successes (6s)", "4dF=+2 (++0-) +Deceive(3) = +5 vs passive +2 -> Success with Style",
  "Overcome 4dF+2=3 -> Success with Style", "Athletics d6+1 vs TN 4 -> Success", "Athletics (Kael d20+2=14, Mira d20+4=18, take highest) -> 18 vs DC 15 -> Success",
  "STR (Kael d20+1=14 vs Mira d20+3=17) -> Mira wins", "WS5 vs WS4 2d6=7 -> 1 hit", "Wound S3 vs T3 d6=4 vs 4+ -> Wound", "Wound 2d6=6,4 vs 4+ -> 2 wounds",
  "d20+6 (adv)=21 vs AC 16 -> Hit, 2d6+4=14 dmg", "End the Fight 6 vs 3,5 -> Strong Hit", "Fighting {d8!, d6!}kh1 =12 -> Hit", "Might 2d6 (take highest) vs TN 5 -> Success",
  "Supply d8=2 -> Step down!", "Torchlight d4=1 -> Depleted!", "d100=42 -> Partial Success", "Hack the terminal (spend 1 Gear) -> Success",
  "Sigilo d20=15 -> Éxito", "Atletismo d6=2 -> Fallo.", "Persuasión d20+3=17 -> Éxito con complicación", "Lucha d6=9 -> Nada", "Ataque d20 -> 14", "d66 -> 34", "1d8=6 damage",
  "Injury d6=2 -> Knocked down", "Secret door 1-in-6 d6=2 -> None found", "Kael: Stealth d20=15 -> Unseen", "Loot d66=70 -> Nothing",
];
// As this app wrote a table's rolls before "tbl:", or marked as one.
const TABLES: [string, string][] = [
  ["Theme d66=25 -> Honor", "Theme"],
  ["Theme 2/5 -> Honor", "Theme"],
  ["Ironsworn: Oracle d100=3 -> Failure to launch", "Ironsworn: Oracle"],
  ["Lazy GM: Trap d20=4 -> Nobody is home", "Lazy GM: Trap"],
  ["Ironsworn: Action d100=42 -> Hit the road", "Ironsworn: Action"],
  ["Inspiration (Action d66=34, Theme d66=25) -> Betray Honor", "Inspiration"],
];

describe("rolls of an imported journal", () => {
  it.each(DICE)("%s is a roll of one's own system", (text) => {
    expect(kindOf(`d: ${text}`).kind).toBe("dice");
  });

  it.each(TABLES)("%s is a table's", (text, name) => {
    expect(kindOf(`d: ${text}`)).toEqual({ kind: "table", name });
  });

  it("knows every game's tag", () => {
    for (const { game } of TABLE_GAMES) {
      const { tag } = game(DICTIONARIES.es);
      if (tag) expect(kindOf(`d: ${tag}: Name d6=2 -> Thing`).kind, tag).toBe("table");
    }
  });

  it("one made here is a table's even with the history cleared", () => {
    const [entry] = parseMarkdownToEntries("d: Forest d6=5 -> Traveler", "a", 1);
    expect(classifyRoll({ ...entry, linkedRollId: "gone" }, undefined)).toEqual({ kind: "table", name: "Forest" });
  });

  it("whatever a tbl: or gen: says is a table's", () => {
    for (const text of ["tbl: Rescue d6=3 vs x -> Success", "tbl: Serious Injury d66=22 -> Leg Wound", "gen: NPC (custom) -> Yes", "tbl: Weather d6=1 -> No"])
      expect(kindOf(text).kind, text).toBe("table");
  });

  it("a yes or a no is an oracle's, with its shade", () => {
    expect(kindOf("d: d100=60 vs 35 -> No")).toEqual({ kind: "oracle", answer: "no", qualifier: undefined });
    expect(kindOf("d: d6=4 -> Yes, but...")).toEqual({ kind: "oracle", answer: "si", qualifier: "but" });
    expect(kindOf("d: d6=6 -> No, and...")).toEqual({ kind: "oracle", answer: "no", qualifier: "and" });
    expect(kindOf("d: Oráculo d6=4 -> Sí, pero…")).toEqual({ kind: "oracle", answer: "si", qualifier: "but" });
    expect(kindOf("d: Wandering d6=5 -> No").kind).toBe("oracle");
  });
});
