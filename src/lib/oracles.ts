/**
 * Registry of available oracles: each one carries its own credit
 * (author, license, link). Name/author/license are data, not UI text,
 * so they don't go in the language dictionary — just as "Recluse" was
 * never translated. Their mechanics are in oracleEngines.ts, by the
 * same id; Recluse stays first (and the default).
 */

import type { OracleId } from "./oracleEngines";

export interface OracleInfo {
  id: OracleId;
  name: string;
  author: string;
  license: string;
  licenseUrl: string;
  url: string;
  /** The attribution its licence asks for, word for word (Settings → About). */
  attribution: string;
}

const CC_BY = "https://creativecommons.org/licenses/by/4.0/";
const CC_BY_SA = "https://creativecommons.org/licenses/by-sa/4.0/";

export const ORACLES: OracleInfo[] = [
  {
    id: "recluse",
    name: "Recluse",
    author: "Graven Utterance (Oliver N)",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: "https://gravenutterance.itch.io/recluse",
    attribution: "Recluse by Graven Utterance (Oliver N), licensed under CC BY 4.0.",
  },
  {
    id: "loner",
    name: "Loner",
    author: "Roberto Bisceglie",
    license: "CC BY-SA 4.0",
    licenseUrl: CC_BY_SA,
    url: "https://zeruhur.itch.io/loner-2nd-edition",
    attribution:
      "Loner v2.3 (CC) 2023 Roberto Bisceglie, licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.",
  },
  {
    id: "ironsworn",
    name: "Ironsworn",
    author: "Shawn Tomkin",
    license: "CC BY 4.0",
    licenseUrl: CC_BY,
    url: "https://www.ironswornrpg.com",
    attribution:
      "This work is based on Ironsworn (found at www.ironswornrpg.com), created by Shawn Tomkin, and licensed for our use under the Creative Commons Attribution 4.0 International license.",
  },
  {
    id: "opse",
    name: "One Page Solo Engine",
    author: "Karl Hendricks (Inflatable Studios)",
    license: "CC BY-SA 4.0",
    licenseUrl: CC_BY_SA,
    url: "https://inflatablestudios.itch.io/one-page-solo-engine",
    attribution: "One Page Solo Engine v1.6 by Karl Hendricks (Inflatable Studios), licensed under CC BY-SA 4.0.",
  },
];

const STORAGE_KEY = "solo-compass:oracle";
export const DEFAULT_ORACLE_ID: OracleId = ORACLES[0].id;

export function isOracleId(value: string): value is OracleId {
  return ORACLES.some((o) => o.id === value);
}

export function getOracle(id: string): OracleInfo {
  return ORACLES.find((o) => o.id === id) ?? ORACLES[0];
}

const FAVORITE_KEY = "solo-compass:oracle-favorite";

/** The favourite oracle, if one is marked: the one the app opens with. */
export function loadFavoriteOracleId(): OracleId | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(FAVORITE_KEY);
    return saved && isOracleId(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveFavoriteOracleId(id: OracleId | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(FAVORITE_KEY, id);
    else window.localStorage.removeItem(FAVORITE_KEY);
  } catch {
    // Not critical: the app opens with the last oracle used instead.
  }
}

/**
 * The oracle to open the app with: the favourite if there is one
 * (switching to another for a while doesn't change it), else the last
 * one used.
 */
export function initialOracleId(): OracleId {
  return loadFavoriteOracleId() ?? loadOracleId();
}

export function loadOracleId(): OracleId {
  if (typeof window === "undefined") return DEFAULT_ORACLE_ID;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isOracleId(saved)) return saved;
  } catch {
    // No localStorage available: silently use the default oracle, it's
    // not a critical failure for the rest of the app.
  }
  return DEFAULT_ORACLE_ID;
}

export function saveOracleId(id: OracleId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Same as in loadOracleId: if it fails, the choice doesn't persist
    // between sessions but the app keeps working normally.
  }
}
