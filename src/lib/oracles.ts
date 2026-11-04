/**
 * Registry of available oracles. Only Recluse for now, but the
 * structure already supports adding more: each one carries its own
 * credit (author, license, link). Name/author/license are data, not
 * UI text, so they don't go in the language dictionary — just as
 * "Recluse" was never translated.
 *
 * The roll mechanic itself (src/lib/oracle.ts) is still specific to
 * Recluse for now: when a second oracle with its own rules arrives,
 * that's the time to turn OracleView into a dispatcher based on the id
 * selected here.
 */

export interface OracleInfo {
  id: string;
  name: string;
  author: string;
  license: string;
  licenseUrl: string;
  url: string;
}

export const ORACLES: OracleInfo[] = [
  {
    id: "recluse",
    name: "Recluse",
    author: "Graven Utterance (Oliver N)",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    url: "https://gravenutterance.itch.io/recluse",
  },
];

const STORAGE_KEY = "solo-compass:oracle";
export const DEFAULT_ORACLE_ID: string = ORACLES[0].id;

export function isOracleId(value: string): boolean {
  return ORACLES.some((o) => o.id === value);
}

export function getOracle(id: string): OracleInfo {
  return ORACLES.find((o) => o.id === id) ?? ORACLES[0];
}

export function loadOracleId(): string {
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

export function saveOracleId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Same as in loadOracleId: if it fails, the choice doesn't persist
    // between sessions but the app keeps working normally.
  }
}
