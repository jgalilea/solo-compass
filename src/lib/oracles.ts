/**
 * Registro de oráculos disponibles. De momento solo Recluse, pero la
 * estructura ya soporta añadir más: cada uno lleva su propio crédito
 * (autor, licencia, enlace). El nombre/autor/licencia son datos, no
 * texto de interfaz, así que no van en el diccionario de idioma —
 * igual que "Recluse" nunca se tradujo.
 *
 * La mecánica de tirada en sí (src/lib/oracle.ts) sigue siendo
 * específica de Recluse por ahora: cuando llegue un segundo oráculo
 * con reglas propias, ese es el momento de convertir OracleView en un
 * despachador según el id seleccionado aquí.
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
    // Sin localStorage disponible: se usa el oráculo por defecto en
    // silencio, no es un fallo crítico para el resto de la app.
  }
  return DEFAULT_ORACLE_ID;
}

export function saveOracleId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Igual que en loadOracleId: si falla, la elección no persiste
    // entre sesiones pero la app sigue funcionando con normalidad.
  }
}
