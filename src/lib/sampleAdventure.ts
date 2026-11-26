/**
 * Sample adventure: a short game already played, for whoever opens
 * the journal for the first time. Only offered with an empty journal
 * and never created on its own (see JournalListView).
 *
 * The script lives in the long texts (`LongTexts.sample.script`, loaded
 * apart: loadLongTexts), but rolls
 * are given as dice and written here in the same format as
 * `usePlayActions` (oracle with its answer, table with its result), so
 * the sample looks exactly like a real game; quick inspiration too
 * (a `tbl:` with Action and Theme). It's returned as Lonelog (sessions
 * with their date, pinned notes and descriptions as front matter) and
 * goes in through the normal import. The caller passes Solo
 * Compass's own tables, already loaded (they aren't in the main bundle).
 */

import type { Dictionary, LongTexts } from "./i18n";
import { formatAnswer, formatOracleDice } from "./i18n/answerText";
import { judgeDice } from "./oracle";
import { DEFAULT_ORACLE_ID, getOracle } from "./oracles";
import { formatFrontMatter, formatLine } from "./lonelog";
import { formatTableRoll, lookupEntry, type MeaningTable } from "./tables";
import { INSPIRATION_TABLE_IDS } from "./tableGames";

export function buildSampleAdventure(
  t: Dictionary,
  sample: LongTexts["sample"],
  tables: MeaningTable[],
): { name: string; markdown: string } {
  const oracleName = getOracle(DEFAULT_ORACLE_ID).name;

  const lines = sample.script.map((line) => {
    if ("oracle" in line) {
      const [white, black] = line.oracle.map((dice) => (Array.isArray(dice) ? dice : [dice]));
      const verdict = judgeDice(Math.max(...white), Math.max(...black));
      // Written as usePlayActions writes a Recluse roll, every die thrown.
      const dice = formatOracleDice(t, {
        kind: "oraculo",
        id: "",
        timestamp: 0,
        question: "",
        likelihood: "equilibrado",
        white: { color: "blanco", rolls: white, kept: Math.max(...white) },
        black: { color: "negro", rolls: black, kept: Math.max(...black) },
        ...verdict,
        favorite: false,
      });
      return formatLine({ kind: "roll", text: `${oracleName}: ${dice} -> ${formatAnswer(t, verdict)}` });
    }
    if ("table" in line) {
      const { table, total, result } = roll(line.table, line.roll);
      return formatLine({ kind: "roll", text: formatTableRoll(table.name, table.dice, total, result) });
    }
    if ("inspiration" in line) {
      // Written like usePlayActions' rollInspiration.
      const rolls = INSPIRATION_TABLE_IDS.map((id, i) => roll(id, line.inspiration[i]));
      const detail = rolls.map((r) => `${r.table.name} ${r.table.dice}=${r.total}`).join(", ");
      const text = `tbl: ${t.tables.inspirationName} (${detail}) -> ${rolls.map((r) => r.result).join(" · ")}`;
      return formatLine({ kind: "roll", text });
    }
    // A session's date goes on the line below it, as in the export.
    if (line.kind === "session" && line.date) return `${formatLine(line)}\n\n[Date] ${line.date}`;
    return formatLine(line);
  });

  function roll(id: string, dice: number[]) {
    const table = tables.find((x) => x.id === id)!;
    const total = dice.length === 2 ? dice[0] * 10 + dice[1] : dice[0];
    return { table, total, result: lookupEntry(table, total)?.text ?? t.tables.noEntryFallback };
  }

  return {
    name: sample.name,
    markdown: formatFrontMatter(sample.notes, sample.descriptions) + lines.join("\n\n") + "\n",
  };
}
