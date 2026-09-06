import { useContext } from "react";
import { OracleContext, type OracleContextValue } from "./oracleContextInstance";

export function useOracleContext(): OracleContextValue {
  const ctx = useContext(OracleContext);
  if (!ctx) {
    throw new Error("useOracleContext debe usarse dentro de OracleProvider");
  }
  return ctx;
}
