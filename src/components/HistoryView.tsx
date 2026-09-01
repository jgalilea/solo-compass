import { useMemo, useState } from "react";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { HistoryEntryCard } from "./HistoryEntryCard";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";

type Filter = "todo" | "oraculo" | "tabla";

export function HistoryView() {
  const { status, entries, error, removeEntry, clear, retry } = useHistoryContext();
  const [filter, setFilter] = useState<Filter>("todo");
  const [confirmingClear, setConfirmingClear] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "todo") return entries;
    return entries.filter((e) => e.kind === filter);
  }, [entries, filter]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-parchment sm:text-4xl">
            Historial
          </h1>
          <p className="mt-1 text-sm text-parchment-dim">
            Tiradas guardadas en este dispositivo.
          </p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="shrink-0 rounded-full border border-ink-border px-3 py-1.5 text-xs text-parchment-dim transition hover:border-no/50 hover:text-no"
          >
            Borrar todo
          </button>
        )}
      </header>

      {status === "ready" && entries.length > 0 && (
        <div className="flex gap-1 rounded-full border border-ink-border bg-ink-900/60 p-1 text-sm">
          {(
            [
              ["todo", "Todo"],
              ["oraculo", "Oráculo"],
              ["tabla", "Tablas"],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={[
                "flex-1 rounded-full py-1.5 transition",
                filter === key
                  ? "bg-gold text-ink-950 font-medium"
                  : "text-parchment-dim hover:text-parchment",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {status === "loading" && <LoadingState label="Cargando historial…" />}

      {status === "error" && (
        <ErrorState
          title="No se pudo cargar el historial"
          description={error ?? undefined}
          onRetry={retry}
        />
      )}

      {status === "ready" && entries.length === 0 && (
        <EmptyState
          icon="📜"
          title="Todavía no hay tiradas"
          description="Consulta el oráculo o tira en una tabla y aparecerá aquí, guardado en este dispositivo."
        />
      )}

      {status === "ready" && entries.length > 0 && filtered.length === 0 && (
        <EmptyState title="Sin resultados para este filtro" />
      )}

      {status === "ready" && filtered.length > 0 && (
        <ul className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <HistoryEntryCard entry={entry} onDelete={removeEntry} />
            </li>
          ))}
        </ul>
      )}

      {confirmingClear && (
        <ConfirmDialog
          title="¿Borrar todo el historial?"
          description="Esta acción no se puede deshacer."
          confirmLabel="Borrar todo"
          onConfirm={() => {
            clear();
            setConfirmingClear(false);
          }}
          onCancel={() => setConfirmingClear(false)}
        />
      )}
    </div>
  );
}
