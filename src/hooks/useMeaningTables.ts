import { useMemo } from "react";
import { toMeaningTable } from "../lib/customTables";
import { getMeaningTables, type MeaningTable } from "../lib/tables";
import { useCustomTablesContext } from "./useCustomTablesContext";
import { useLocaleContext } from "./useLocaleContext";

/** Built-in tables (in the app's language) and the player's own, as MeaningTables. */
export function useMeaningTables(): { builtIn: MeaningTable[]; custom: MeaningTable[]; all: MeaningTable[] } {
  const { t } = useLocaleContext();
  const { tables } = useCustomTablesContext();
  return useMemo(() => {
    const builtIn = getMeaningTables(t);
    const custom = tables.map((x) => toMeaningTable(x, t));
    return { builtIn, custom, all: [...custom, ...builtIn] };
  }, [t, tables]);
}
