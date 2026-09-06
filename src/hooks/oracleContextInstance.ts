import { createContext } from "react";

export interface OracleContextValue {
  oracleId: string;
  setOracleId: (id: string) => void;
}

export const OracleContext = createContext<OracleContextValue | null>(null);
