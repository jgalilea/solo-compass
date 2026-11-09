import { useEffect, useState, type ReactNode } from "react";
import { loadOracleId, saveOracleId } from "../lib/oracles";
import type { OracleId } from "../lib/oracleEngines";
import { OracleContext } from "./oracleContextInstance";

export function OracleProvider({ children }: { children: ReactNode }) {
  const [oracleId, setOracleId] = useState<OracleId>(() => loadOracleId());

  useEffect(() => {
    saveOracleId(oracleId);
  }, [oracleId]);

  return (
    <OracleContext.Provider value={{ oracleId, setOracleId }}>
      {children}
    </OracleContext.Provider>
  );
}
