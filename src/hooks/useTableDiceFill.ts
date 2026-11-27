import { useEffect, useRef } from "react";
import { useHistoryContext } from "./useHistoryContext";
import { useJournalContext } from "./useJournalContext";
import { useLocaleContext } from "./useLocaleContext";

/**
 * Gives the table rolls made before the history kept their die the one
 * they were made with (historyDice.ts). Once per roll and session; also
 * after restoring an old backup, which reloads the app.
 */
export function useTableDiceFill() {
  const { t } = useLocaleContext();
  const { status, entries, setTableDice } = useHistoryContext();
  const { status: journalStatus, entries: journal } = useJournalContext();
  const tried = useRef(new Set<string>());

  useEffect(() => {
    if (status !== "ready" || journalStatus !== "ready") return;
    const missing = entries.filter(
      (e) => e.kind === "tabla" && !e.dice && !tried.current.has(e.id),
    );
    if (missing.length === 0) return;
    for (const entry of missing) tried.current.add(entry.id);
    import("../lib/historyDice")
      .then(({ findTableDice, lacksDice }) => findTableDice(t, missing.filter(lacksDice), journal))
      .then((found) => {
        if (found.size > 0) setTableDice(found);
      })
      // They stay as they were, until next time.
      .catch(() => undefined);
  }, [status, entries, journalStatus, journal, setTableDice, t]);
}
