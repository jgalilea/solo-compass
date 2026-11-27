import { useMemo, type ReactNode } from "react";
import type { OracleId } from "../lib/oracleEngines";
import { OracleContext, type OracleContextValue } from "./oracleContextInstance";
import { useJournalContext } from "./useJournalContext";
import { useOracleContext } from "./useOracleContext";

/**
 * Everything below asks the given adventure's oracle (an adventure's
 * screen, and the Oracle screen while one is active): the one last
 * picked in it or asked from it, or, before that, the favourite, else
 * the device's last used. Picking another one in the switcher changes
 * that adventure's alone. With no adventure, the device's, as it was.
 */
export function AdventureOracleScope({
  adventureId,
  children,
}: {
  adventureId: string | null | undefined;
  children: ReactNode;
}) {
  const parent = useOracleContext();
  const { adventures, setAdventureOracle } = useJournalContext();
  const adventure = adventureId ? adventures.find((a) => a.id === adventureId) : undefined;
  const id = adventure?.id;
  const name = adventure?.name;
  const oracleId: OracleId = adventure?.oracle ?? parent.favoriteOracleId ?? parent.oracleId;
  const oracleSource: OracleContextValue["oracleSource"] = adventure?.oracle
    ? "adventure"
    : parent.favoriteOracleId
      ? "favorite"
      : "last";

  const value = useMemo(
    () =>
      id === undefined
        ? parent
        : {
            ...parent,
            oracleId,
            setOracleId: (next: OracleId) => setAdventureOracle(id, next),
            adventureName: name,
            oracleSource,
          },
    [parent, id, name, oracleId, oracleSource, setAdventureOracle],
  );
  return <OracleContext.Provider value={value}>{children}</OracleContext.Provider>;
}
