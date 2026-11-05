import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { toMeaningTable } from "../lib/customTables";
import {
  gameState,
  gamesSnapshot,
  INSPIRATION_TABLE_IDS,
  loadGame,
  subscribeToGames,
  TABLE_GAMES,
  toMeaningTables,
  type GameId,
  type GameStatus,
} from "../lib/tableGames";
import type { MeaningTable } from "../lib/tables";
import type { CustomTablesStatus } from "./useCustomTables";
import { useCustomTablesContext } from "./useCustomTablesContext";
import { useLocaleContext } from "./useLocaleContext";

/** A game's block of built-in tables: empty until it's loaded. */
export interface TableBlock {
  id: GameId;
  title: string;
  note?: string;
  /** Known before loading, for the folded block. */
  count: number;
  status: GameStatus;
  tables: MeaningTable[];
}

/**
 * The tables a screen shows, in the app's language. Only the games in
 * `games` are loaded (each one on its own, see tableGames.ts; "all" when
 * searching), plus the player's own; the rest stay as folded blocks.
 */
export function useMeaningTables(games: GameId[] | "all"): {
  blocks: TableBlock[];
  custom: MeaningTable[];
  customStatus: CustomTablesStatus;
  /** Every loaded table: the player's own first. */
  all: MeaningTable[];
  /** Action + Theme, once Solo Compass's tables are in. */
  inspiration: MeaningTable[] | null;
  retry: (id: GameId) => void;
} {
  const { t, locale } = useLocaleContext();
  const { tables, status: customStatus, load: loadCustom } = useCustomTablesContext();
  const loaded = useSyncExternalStore(subscribeToGames, gamesSnapshot);
  const wanted = games === "all" ? TABLE_GAMES.map((g) => g.id) : games;
  // A string, so an array made on every render doesn't reload anything.
  const wantedKey = [...new Set(wanted)].sort().join(" ");

  useEffect(() => {
    loadCustom();
  }, [loadCustom]);

  useEffect(() => {
    if (!wantedKey) return;
    for (const id of wantedKey.split(" ") as GameId[]) {
      // A failure shows in the block (status "error"), with a retry.
      if (gameState(id).status === "idle") loadGame(id).catch(() => undefined);
    }
  }, [wantedKey]);

  const retry = useCallback((id: GameId) => {
    loadGame(id).catch(() => undefined);
  }, []);

  return useMemo(() => {
    const blocks = TABLE_GAMES.map((game): TableBlock => {
      const state = gameState(game.id, loaded);
      return {
        id: game.id,
        title: game.title(t),
        note: game.note?.(t),
        count: state.data?.length ?? game.count,
        status: state.status,
        tables: state.data ? toMeaningTables(game, state.data, t, locale) : [],
      };
    });
    const custom = tables.map((x) => toMeaningTable(x, t));
    const own = blocks.find((b) => b.id === "solo-compass")!.tables;
    const inspiration = INSPIRATION_TABLE_IDS.map((id) => own.find((x) => x.id === id));
    return {
      blocks,
      custom,
      customStatus,
      all: [...custom, ...blocks.flatMap((b) => b.tables)],
      inspiration: inspiration.every(Boolean) ? (inspiration as MeaningTable[]) : null,
      retry,
    };
  }, [loaded, t, locale, tables, customStatus, retry]);
}
