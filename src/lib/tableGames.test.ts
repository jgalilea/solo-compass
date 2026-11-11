import { describe, expect, it } from "vitest";
import { LOCALES } from "./i18n";
import { DICTIONARIES } from "./i18n/allDictionaries";
import {
  gameOfTable,
  gameState,
  INSPIRATION_TABLE_IDS,
  loadGame,
  SOLO_COMPASS_TABLE_IDS,
  TABLE_GAMES,
  toMeaningTables,
  type TableData,
} from "./tableGames";
import { diceMax, diceValues, TABLE_THEMES, tableRollName } from "./tables";

// Tables of proper names: the same in both languages, so no Spanish column.
const NAMES_ONLY = new Set([
  "ironsworn-settlement-name-old-world",
  "ironsworn-ironlander-names",
  "ironsworn-elf-names",
  "ironsworn-giant-names",
  "ironsworn-varou-names",
  "ironsworn-troll-names",
  "delve-site-name-namesake",
  "starforged-character-name-given-name",
  "starforged-character-name-family-name",
  "starsmith-character-name-given-name",
  "starsmith-character-name-family-name",
  "starsmith-additional-registry-number-model",
  "cairn-npc-name",
  "ironsmith-ironlander-names",
  "ironsmith-elf-names",
  "ironsmith-giant-names",
  "ironsmith-varou-names",
  "ironsmith-troll-names",
]);

const loaded = await Promise.all(TABLE_GAMES.map(async (game) => ({ game, data: await game.load() })));

describe.each(loaded)("built-in tables: $game.id", ({ game, data }) => {
  it("the index knows how many tables it has and which ids are its own", () => {
    expect(data).toHaveLength(game.count);
    for (const table of data) expect(gameOfTable(table.id), table.id).toBe(game.id);
  });

  it("every value of the die falls in exactly one row", () => {
    for (const table of data) {
      for (const value of diceValues(table.dice)) {
        const hits = table.rows.filter(([from, to]) => value >= from && value <= to);
        expect(hits, `${table.id} ${value}`).toHaveLength(1);
      }
      expect(table.rows.at(-1)![1], table.id).toBe(diceMax(table.dice));
    }
  });

  it("has a Spanish text for every row, except the tables of names", () => {
    for (const table of data) {
      const translated = table.rows.filter((row) => row[3] !== undefined).length;
      expect(translated, table.id).toBe(NAMES_ONLY.has(table.id) ? 0 : table.rows.length);
    }
  });

  it.each(LOCALES)("in «%s» names are unique and texts are clean", (locale) => {
    const tables = toMeaningTables(game, data, DICTIONARIES[locale], locale);
    expect(new Set(tables.map((t) => t.name)).size).toBe(tables.length);
    for (const table of tables) {
      expect(table.name && table.description, table.id).toBeTruthy();
      for (const entry of table.entries) {
        // Leftovers of a source's Markdown (links, bold) or blank rows.
        expect(entry.text, table.id).toMatch(/^[^[\]_]+$/);
        expect(entry.text.trim(), table.id).toBe(entry.text);
      }
    }
  });
});

describe("built-in tables, all games", () => {
  const all: TableData[] = loaded.flatMap((x) => x.data);
  const own = loaded.find((x) => x.game.id === "solo-compass")!;

  it("every table has a known theme, and every theme has tables", () => {
    for (const table of all) expect(TABLE_THEMES, table.id).toContain(table.theme);
    for (const theme of TABLE_THEMES) expect(all.some((t) => t.theme === theme), theme).toBe(true);
  });

  // A game that reprints another's table (Starsmith with Starforged's)
  // leaves it to the original game: it would only show up twice.
  it("no table is an exact copy of another game's", () => {
    const owners = new Map<string, string>();
    for (const { game, data } of loaded) {
      for (const table of data) {
        const key = JSON.stringify(table.rows.map((r) => r.slice(0, 3)));
        const other = owners.get(key);
        if (other && !other.startsWith(game.id + ":")) throw new Error(`${table.id} repeats ${other}`);
        owners.set(key, `${game.id}:${table.id}`);
      }
    }
  });

  it("ids are unique across games", () => {
    const ids = all.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("Solo Compass's ids in the index match its data, inspiration included", () => {
    expect(own.data.map((t) => t.id)).toEqual([...SOLO_COMPASS_TABLE_IDS]);
    for (const id of INSPIRATION_TABLE_IDS) expect(SOLO_COMPASS_TABLE_IDS).toContain(id);
    expect(gameOfTable("a-custom-table-uuid")).toBeUndefined();
  });

  it("rolls are logged with the game in front, Solo Compass's own without it", () => {
    const ironsworn = loaded.find((x) => x.game.id === "ironsworn")!;
    const [action] = toMeaningTables(ironsworn.game, ironsworn.data, DICTIONARIES.es, "es");
    expect(tableRollName(action)).toBe("Ironsworn: Acción");
    const [mine] = toMeaningTables(own.game, own.data, DICTIONARIES.es, "es");
    expect(tableRollName(mine)).toBe(mine.name);
  });

  it("loads a game once and keeps it", async () => {
    expect(gameState("ironsworn").status).toBe("idle");
    const pending = loadGame("ironsworn");
    expect(gameState("ironsworn").status).toBe("loading");
    const data = await pending;
    expect(gameState("ironsworn")).toEqual({ status: "ready", data });
    expect(await loadGame("ironsworn")).toBe(data);
  });
});
