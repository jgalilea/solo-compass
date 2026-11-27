import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  initialOracleId,
  loadFavoriteOracleId,
  saveFavoriteOracleId,
  saveOracleId,
} from "../lib/oracles";
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

  const value = useMemo(
    () => ({
      oracleId,
      setOracleId,
      favoriteOracleId,
      setFavoriteOracleId,
      likelihood,
      setLikelihood,
    }),
    [oracleId, favoriteOracleId, setFavoriteOracleId, likelihood],
  );
  return <OracleContext.Provider value={value}>{children}</OracleContext.Provider>;
}
