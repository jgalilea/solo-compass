import { useCallback, useEffect, useState, type ReactNode } from "react";
import { initialOracleId, loadFavoriteOracleId, saveFavoriteOracleId, saveOracleId } from "../lib/oracles";
import type { Likelihood } from "../lib/oracle";
import type { OracleId } from "../lib/oracleEngines";
import { OracleContext } from "./oracleContextInstance";

export function OracleProvider({ children }: { children: ReactNode }) {
  const [oracleId, setOracleId] = useState<OracleId>(() => initialOracleId());
  const [favoriteOracleId, setFavorite] = useState<OracleId | null>(() => loadFavoriteOracleId());
  const [likelihood, setLikelihood] = useState<Likelihood>("equilibrado");

  useEffect(() => {
    saveOracleId(oracleId);
  }, [oracleId]);

  const setFavoriteOracleId = useCallback((id: OracleId | null) => {
    setFavorite(id);
    saveFavoriteOracleId(id);
  }, []);

  return (
    <OracleContext.Provider
      value={{ oracleId, setOracleId, favoriteOracleId, setFavoriteOracleId, likelihood, setLikelihood }}
    >
      {children}
    </OracleContext.Provider>
  );
}
