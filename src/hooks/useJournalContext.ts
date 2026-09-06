import { useContext } from "react";
import { JournalContext, type JournalContextValue } from "./journalContextInstance";

export function useJournalContext(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) {
    throw new Error("useJournalContext debe usarse dentro de JournalProvider");
  }
  return ctx;
}
