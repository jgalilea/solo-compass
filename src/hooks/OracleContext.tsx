import { useEffect, useState, type ReactNode } from "react";
import { loadOracleId, saveOracleId } from "../lib/oracles";
import { OracleContext } from "./oracleContextInstance";

export function OracleProvider({ children }: { children: ReactNode }) {
  const [oracleId, setOracleId] = useState<string>(() => loadOracleId());

  useEffect(() => {
    saveOracleId(oracleId);
  }, [oracleId]);

  return (
    <OracleContext.Provider value={{ oracleId, setOracleId }}>
      {children}
    </OracleContext.Provider>
  );
}
