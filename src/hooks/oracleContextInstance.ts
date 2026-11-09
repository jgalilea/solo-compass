import { createContext } from "react";
import type { OracleId } from "../lib/oracleEngines";

export interface OracleContextValue {
  oracleId: OracleId;
  setOracleId: (id: OracleId) => void;
}

export const OracleContext = createContext<OracleContextValue | null>(null);
