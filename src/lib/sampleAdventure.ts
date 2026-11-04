/**
 * Sample adventure: a short game already played, for whoever opens
 * the journal for the first time. Only offered with an empty journal
 * and never created on its own (see JournalListView).
 *
 * The script lives in the dictionaries (`t.sample.script`), but rolls
 * are given as dice and written here in the same format as
 * `usePlayActions` (oracle with its answer, table with its result), so
 * the sample looks exactly like a real game. It's returned as Lonelog
 * and goes in through the normal import.
 */

import type { Dictionary } from "./i18n";
import { formatAnswer } from "./i18n/answerText";
import { judgeDice } from "./oracle";
import { DEFAULT_ORACLE_ID, getOracle } from "./oracles";
import { getMeaningTables, lookupEntry } from "./tables";
import { formatLine } from "./lonelog";

export function buildSampleAdventure(t: Dictionary): { name: string; markdown: string } {
  const oracleName = getOracle(DEFAULT_ORACLE_ID).name;
  const tables = getMeaningTables(t);

  const lines = t.sample.script.map((line) => {
    if ("oracle" in line) {
      const [white, black] = line.oracle;
      const answer = formatAnswer(t, judgeDice(white, black));
      const text = `${oracleName} — ${t.die.color.blanco} ${white} / ${t.die.color.negro} ${black} -> ${answer}`;
      return formatLine({ kind: "roll", text });
    }
    if ("table" in line) {
      const table = tables.find((x) => x.id === TABLE_IDS[line.table])!;
      const total = line.roll.length === 2 ? line.roll[0] * 10 + line.roll[1] : line.roll[0];
      const result = lookupEntry(table, total)?.text ?? t.tables.noEntryFallback;
      return formatLine({ kind: "roll", text: `${table.name} ${line.roll.join("/")} -> ${result}` });
    }
    return formatLine(line);
  });

  return { name: t.sample.name, markdown: lines.join("\n\n") + "\n" };
}

const TABLE_IDS = {
  eventoAleatorio: "evento-aleatorio",
  accionPnj: "accion-pnj",
  descriptorEscena: "descriptor-escena",
} as const;
