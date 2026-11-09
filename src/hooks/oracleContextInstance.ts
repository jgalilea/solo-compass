import { createContext } from "react";
import type { OracleId } from "../lib/oracleEngines";

export interface OracleContextValue {
  oracleId: OracleId;
  setOracleId: (id: OracleId) => void;
  /** The one the app opens with (Settings-free: a star in the switcher). */
  favoriteOracleId: OracleId | null;
  setFavoriteOracleId: (id: OracleId | null) => void;
}

export const OracleContext = createContext<OracleContextValue | null>(null);
