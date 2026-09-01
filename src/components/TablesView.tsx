import { useState } from "react";
import {
  diceMax,
  lookupEntry,
  MEANING_TABLES,
  rollForTable,
  type MeaningTable,
} from "../lib/tables";
import type { TableRollEntry } from "../lib/history";
import { useHistoryContext } from "../hooks/useHistoryContext";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildTableRollEntry(table: MeaningTable): TableRollEntry {
  const { rolls, total } = rollForTable(table.dice);
  const entry = lookupEntry(table, total);
  return {
    kind: "tabla",
    id: makeId(),
    timestamp: Date.now(),
    tableId: table.id,
    tableName: table.name,
    rolls,
    total,
    resultText: entry?.text ?? "Sin entrada definida para este valor.",
    favorite: false,
  };
}

export function TablesView() {
  const { addEntry } = useHistoryContext();
  const [results, setResults] = useState<Record<string, TableRollEntry>>({});
  const [rollingId, setRollingId] = useState<string | null>(null);

  function handleRoll(table: MeaningTable) {
    setRollingId(table.id);
    window.setTimeout(() => {
      const historyEntry = buildTableRollEntry(table);
      setResults((prev) => ({ ...prev, [table.id]: historyEntry }));
      addEntry(historyEntry);
      setRollingId(null);
    }, 220);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="text-center">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">
          Tablas de significado
        </h1>
        <p className="mt-2 text-sm text-parchment-dim">
          Contenido de ejemplo — sustituye las entradas por tus propias
          tablas cuando quieras.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {MEANING_TABLES.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            result={results[table.id]}
            rolling={rollingId === table.id}
            onRoll={() => handleRoll(table)}
          />
        ))}
      </div>
    </div>
  );
}

function TableCard({
  table,
  result,
  rolling,
  onRoll,
}: {
  table: MeaningTable;
  result?: TableRollEntry;
  rolling: boolean;
  onRoll: () => void;
}) {
  return (
    <div className="rounded-3xl border border-ink-border bg-ink-800/50 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-parchment">{table.name}</h2>
          <p className="mt-1 text-sm text-parchment-dim">{table.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-ink-border px-2.5 py-1 text-xs uppercase tracking-wide text-parchment-dim">
          {table.dice} · 1–{diceMax(table.dice)}
        </span>
      </div>

      <button
        type="button"
        onClick={onRoll}
        disabled={rolling}
        className="mt-4 w-full rounded-2xl border border-gold/50 bg-gold/10 py-2.5 font-medium text-gold transition hover:bg-gold/20 disabled:opacity-60"
      >
        {rolling ? "Lanzando…" : `Tirar ${table.dice}`}
      </button>

      {result && (
        <div className="animate-fade-up mt-4 rounded-2xl border border-ink-border bg-ink-900/60 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-parchment-dim">
            <span>Resultado {result.total}</span>
            <span>{result.rolls.join(" · ")}</span>
          </div>
          <p className="mt-2 text-parchment">{result.resultText}</p>
        </div>
      )}
    </div>
  );
}
