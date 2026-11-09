/**
 * The built-in meaning tables, one game at a time.
 *
 * Each game's tables live in their own data file (src/lib/tableData/),
 * which the build turns into its own chunk: none of them is in the app's
 * main bundle, and a game is only downloaded when a screen needs it
 * (e.g. Ironsworn when its block on the Tables screen is unfolded). What
 * stays here is the small index: names, credits, how many tables each
 * game has and which table ids belong to it, enough to draw a folded
 * block or find a favourite's game without loading anything.
 *
 * Loaded games are kept for the whole session (the service worker
 * caches every chunk, so this works offline too). The player's own
 * tables are a separate source, loaded from IndexedDB (customTables.ts).
 */

import { interpolate, type Dictionary, type Locale } from "./i18n";
import type { DiceType, GameRef, MeaningTable, TableTheme } from "./tables";

/** A data file's row: the range and its text in each language. */
export type TableRow = [from: number, to: number, en: string, es?: string];

/**
 * A table as the data files ship it, with both languages side by side.
 * A row without Spanish (proper names) reads the same in both.
 */
export interface TableData {
  id: string;
  dice: DiceType;
  theme: TableTheme;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  rows: TableRow[];
}

export type GameId =
  | "solo-compass"
  | "ironsworn"
  | "delve"
  | "knave"
  | "loner"
  | "starforged"
  | "starsmith"
  | "lazy-gm"
  | "cairn";

export interface TableGame {
  id: GameId;
  /** Title of its block on the Tables screen. */
  title: (t: Dictionary) => string;
  /** Credit under the title. */
  note?: (t: Dictionary) => string;
  game: (t: Dictionary) => GameRef;
  /** How many tables it has, shown on its folded block (a test keeps it in step). */
  count: number;
  /** Whether a table id (a favourite, say) is one of this game's. */
  owns: (tableId: string) => boolean;
  load: () => Promise<TableData[]>;
}

/** Ids of Solo Compass's own tables (a test keeps them in step with the data). */
export const SOLO_COMPASS_TABLE_IDS = [
  "accion",
  "tema",
  "evento-aleatorio",
  "accion-pnj",
  "descriptor-escena",
  "modo",
  "aspecto",
  "rasgo-pnj",
  "motivacion",
  "complicacion",
  "lugar",
  "hallazgo",
  "clima",
] as const;

export type SoloCompassTableId = (typeof SOLO_COMPASS_TABLE_IDS)[number];

/** The two tables "Quick inspiration" rolls together (action + theme). */
export const INSPIRATION_TABLE_IDS: SoloCompassTableId[] = ["accion", "tema"];

const SOLO_COMPASS_IDS = new Set<string>(SOLO_COMPASS_TABLE_IDS);

export const IRONSWORN_URL = "https://www.ironswornrpg.com";

const IRONSWORN_GAME: GameRef = {
  name: "Ironsworn",
  url: IRONSWORN_URL,
  author: "Shawn Tomkin",
  license: "CC BY 4.0",
  tag: "Ironsworn",
};

const DELVE_GAME: GameRef = { ...IRONSWORN_GAME, name: "Ironsworn: Delve", tag: "Delve" };
const STARFORGED_GAME: GameRef = { ...IRONSWORN_GAME, name: "Ironsworn: Starforged", tag: "Starforged" };

export const KNAVE_URL = "https://questingbeast.itch.io/knave";

const KNAVE_GAME: GameRef = {
  name: "Knave",
  url: KNAVE_URL,
  author: "Ben Milton",
  license: "CC BY 4.0",
  tag: "Knave",
};

export const LONER_URL = "https://zeruhur.itch.io/loner";

const LONER_GAME: GameRef = {
  name: "Loner",
  url: LONER_URL,
  author: "Roberto Bisceglie",
  license: "CC BY-SA 4.0",
  tag: "Loner",
};

export const STARSMITH_URL = "https://www.lulu.com/shop/eric-bright/starsmith-expanded-oracles/paperback/product-d9yq44.html";

const STARSMITH_GAME: GameRef = {
  name: "Starsmith",
  url: STARSMITH_URL,
  author: "Eric Bright",
  license: "CC BY 4.0",
  tag: "Starsmith",
};

export const LAZY_GM_URL = "https://slyflourish.com/lazy_gm_resource_document.html";

const LAZY_GM_GAME: GameRef = {
  name: "Lazy GM's Resource Document",
  url: LAZY_GM_URL,
  author: "Michael E. Shea (Sly Flourish)",
  license: "CC BY 4.0",
  tag: "Lazy GM",
};

export const CAIRN_URL = "https://cairnrpg.com";

const CAIRN_GAME: GameRef = {
  name: "Cairn",
  url: CAIRN_URL,
  author: "Yochai Gal",
  license: "CC BY-SA 4.0",
  tag: "Cairn",
};

const CC_BY = "https://creativecommons.org/licenses/by/4.0/";
const CC_BY_SA = "https://creativecommons.org/licenses/by-sa/4.0/";

/**
 * Credits for the third-party tables (Settings → About). `attribution`
 * is the wording each source asks for, in English as published.
 */
export const TABLE_CREDITS: {
  name: string;
  author: string;
  license: string;
  licenseUrl: string;
  url: string;
  attribution: string[];
}[] = [
  {
    name: "Ironsworn · Delve · Starforged",
    author: "Shawn Tomkin",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: IRONSWORN_URL,
    attribution: [
      "This work is based on Ironsworn, Ironsworn: Delve and Ironsworn: Starforged, created by Shawn Tomkin, and licensed for our use under the Creative Commons Attribution 4.0 International License.",
    ],
  },
  {
    name: "Starsmith: Expanded Oracles",
    author: "Eric Bright",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: STARSMITH_URL,
    attribution: ["Starsmith: Expanded Oracles by Eric Bright, licensed under the Creative Commons Attribution 4.0 International License."],
  },
  {
    name: "Loner",
    author: "Roberto Bisceglie",
    license: "CC BY-SA 4.0",
    licenseUrl: CC_BY_SA,
    url: LONER_URL,
    attribution: ["Loner v2.3 (CC) 2023 Roberto Bisceglie, licensed under the Creative Commons Attribution-ShareAlike 4.0 International License."],
  },
  {
    name: "Knave",
    author: "Ben Milton",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: KNAVE_URL,
    attribution: ["Knave by Ben Milton, licensed under the Creative Commons Attribution 4.0 International License."],
  },
  {
    name: "Cairn",
    author: "Yochai Gal",
    license: "CC BY-SA 4.0",
    licenseUrl: CC_BY_SA,
    url: CAIRN_URL,
    attribution: ["Cairn by Yochai Gal, licensed under the Creative Commons Attribution-ShareAlike 4.0 International License."],
  },
  {
    name: "Lazy GM's Resource Document",
    author: "Michael E. Shea",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: LAZY_GM_URL,
    attribution: [
      "This work includes material taken from the Lazy GM's Resource Document by Michael E. Shea of SlyFlourish.com, available under the Creative Commons Attribution 4.0 International License.",
      "This work includes material taken from the System Reference Document 5.1 (\"SRD 5.1\") by Wizards of the Coast LLC. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License.",
    ],
  },
];

/** "By Ben Milton, licensed under CC BY 4.0.": a block's credit. */
function creditNote(t: Dictionary, game: GameRef): string {
  return interpolate(t.tables.creditNote, { author: game.author ?? "", license: game.license ?? "" });
}

export const TABLE_GAMES: TableGame[] = [
  {
    id: "solo-compass",
    title: (t) => t.tables.builtInHeading,
    game: (t) => ({ name: t.tables.genericGame }),
    count: SOLO_COMPASS_TABLE_IDS.length,
    owns: (id) => SOLO_COMPASS_IDS.has(id),
    load: () => import("./tableData/soloCompass").then((m) => m.TABLES),
  },
  {
    id: "ironsworn",
    title: () => IRONSWORN_GAME.name,
    note: (t) => t.tables.ironswornNote,
    game: () => IRONSWORN_GAME,
    count: 30,
    owns: (id) => id.startsWith("ironsworn-"),
    load: () => import("./tableData/ironsworn").then((m) => m.TABLES),
  },
  {
    id: "delve",
    title: () => DELVE_GAME.name,
    note: (t) => t.tables.ironswornNote,
    game: () => DELVE_GAME,
    count: 42,
    owns: (id) => id.startsWith("delve-"),
    load: () => import("./tableData/delve").then((m) => m.TABLES),
  },
  {
    id: "starforged",
    title: () => STARFORGED_GAME.name,
    note: (t) => t.tables.ironswornNote,
    game: () => STARFORGED_GAME,
    count: 249,
    owns: (id) => id.startsWith("starforged-"),
    load: () => import("./tableData/starforged").then((m) => m.TABLES),
  },
  {
    id: "starsmith",
    title: () => STARSMITH_GAME.name,
    note: (t) => creditNote(t, STARSMITH_GAME),
    game: () => STARSMITH_GAME,
    count: 194,
    owns: (id) => id.startsWith("starsmith-"),
    load: () => import("./tableData/starsmith").then((m) => m.TABLES),
  },
  {
    id: "loner",
    title: () => LONER_GAME.name,
    note: (t) => creditNote(t, LONER_GAME),
    game: () => LONER_GAME,
    count: 19,
    owns: (id) => id.startsWith("loner-"),
    load: () => import("./tableData/loner").then((m) => m.TABLES),
  },
  {
    id: "knave",
    title: () => KNAVE_GAME.name,
    note: (t) => creditNote(t, KNAVE_GAME),
    game: () => KNAVE_GAME,
    count: 11,
    owns: (id) => id.startsWith("knave-"),
    load: () => import("./tableData/knave").then((m) => m.TABLES),
  },
  {
    id: "lazy-gm",
    title: () => LAZY_GM_GAME.name,
    note: (t) => creditNote(t, LAZY_GM_GAME),
    game: () => LAZY_GM_GAME,
    count: 65,
    owns: (id) => id.startsWith("lazy-gm-"),
    load: () => import("./tableData/lazyGm").then((m) => m.TABLES),
  },
  {
    id: "cairn",
    title: () => CAIRN_GAME.name,
    note: (t) => creditNote(t, CAIRN_GAME),
    game: () => CAIRN_GAME,
    count: 82,
    owns: (id) => id.startsWith("cairn-"),
    load: () => import("./tableData/cairn").then((m) => m.TABLES),
  },
];

/** The game a built-in table belongs to; undefined for the player's own. */
export function gameOfTable(tableId: string): GameId | undefined {
  return TABLE_GAMES.find((g) => g.owns(tableId))?.id;
}

const ROW_TEXT: Record<Locale, (row: TableRow) => string> = {
  en: (row) => row[2],
  es: (row) => row[3] ?? row[2],
};

/** A game's data, as the MeaningTables every screen rolls on. */
export function toMeaningTables(
  game: TableGame,
  data: TableData[],
  t: Dictionary,
  locale: Locale,
): MeaningTable[] {
  const ref = game.game(t);
  return data.map((table) => ({
    id: table.id,
    name: table.name[locale],
    description: table.description[locale],
    dice: table.dice,
    theme: table.theme,
    game: ref,
    entries: table.rows.map((row) => ({ range: [row[0], row[1]], text: ROW_TEXT[locale](row) })),
  }));
}

/** Loads a game (if it isn't yet) and returns its tables in this language. */
export async function loadMeaningTables(id: GameId, t: Dictionary, locale: Locale): Promise<MeaningTable[]> {
  const data = await loadGame(id);
  return toMeaningTables(TABLE_GAMES.find((g) => g.id === id)!, data, t, locale);
}

// --- Loading ----------------------------------------------------------

export type GameStatus = "idle" | "loading" | "ready" | "error";

export interface GameState {
  status: GameStatus;
  data?: TableData[];
}

// Replaced (never changed in place) on every update, so it works as a
// useSyncExternalStore snapshot.
let states: ReadonlyMap<GameId, GameState> = new Map();
const listeners = new Set<() => void>();

function setState(id: GameId, state: GameState) {
  states = new Map(states).set(id, state);
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore: notified every time a game starts or ends loading. */
export function subscribeToGames(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function gamesSnapshot(): ReadonlyMap<GameId, GameState> {
  return states;
}

export function gameState(id: GameId, snapshot = states): GameState {
  return snapshot.get(id) ?? { status: "idle" };
}

/**
 * Starts loading a game's tables, unless they're already loaded or on
 * their way. A failed load can be asked for again (retry).
 */
export function loadGame(id: GameId): Promise<TableData[]> {
  const current = gameState(id);
  if (current.status === "ready") return Promise.resolve(current.data!);
  const game = TABLE_GAMES.find((g) => g.id === id)!;
  if (current.status !== "loading") setState(id, { status: "loading" });
  return game.load().then(
    (data) => {
      setState(id, { status: "ready", data });
      return data;
    },
    (err: unknown) => {
      setState(id, { status: "error" });
      throw err;
    },
  );
}
