/**
 * Tables from One Page Solo Engine v1.6, by Karl Hendricks (Inflatable
 * Studios), licensed under CC BY-SA 4.0
 * (https://creativecommons.org/licenses/by-sa/4.0/):
 * https://inflatablestudios.itch.io/one-page-solo-engine. Its yes/no
 * oracle is one of the app's oracles (oracleEngines.ts); this is its
 * "How much?", for questions of amount or degree. The Spanish
 * translation is Solo Compass's own and, as an adaptation, is shared
 * under the same CC BY-SA 4.0 licence.
 *
 * Loaded on its own (see tableGames.ts).
 */

import type { TableData } from "../tableGames";

export const TABLES: TableData[] = [
  {
    id: "opse-how-much",
    dice: "d6",
    theme: "inspiration",
    name: { en: "Oracle: How much?", es: "Oráculo: ¿cuánto?" },
    description: {
      en: "For a question of amount or degree, not yes or no: how many guards, how badly hurt.",
      es: "Para una pregunta de cantidad o intensidad, no de sí o no: cuántos guardias, cómo de grave.",
    },
    rows: [
      [1, 1, "Surprisingly lacking", "Sorprendentemente poco"],
      [2, 2, "Less than expected", "Menos de lo esperado"],
      [3, 4, "About average", "Lo normal"],
      [5, 5, "More than expected", "Más de lo esperado"],
      [6, 6, "Extraordinary", "Extraordinario"],
    ],
  },
];
