import { createContext } from "react";
import type { Likelihood } from "../lib/oracle";
import type { OracleId } from "../lib/oracleEngines";

export interface OracleContextValue {
  /**
   * The oracle asked: the device's, or, inside an adventure (and on the
   * Oracle screen while one is active), that adventure's own
   * (AdventureOracleScope).
   */
  oracleId: OracleId;
  setOracleId: (id: OracleId) => void;
  /** The adventure whose oracle this is, if any: the switcher says so. */
  adventureName?: string;
  /** The one the app opens with (Settings-free: a star in the switcher). */
  favoriteOracleId: OracleId | null;
  setFavoriteOracleId: (id: OracleId | null) => void;
  /**
   * How likely the next question is, the same wherever it's asked (the
   * Oracle screen, the game table, a question typed in the composer).
   * Not saved: it's about the question at hand.
   */
  likelihood: Likelihood;
  setLikelihood: (likelihood: Likelihood) => void;
}

export const OracleContext = createContext<OracleContextValue | null>(null);
