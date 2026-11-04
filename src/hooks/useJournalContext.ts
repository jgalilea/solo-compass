import { useContext } from "react";
import { JournalContext, type JournalContextValue } from "./journalContextInstance";

export function useJournalContext(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) {
    throw new Error("useJournalContext must be used inside JournalProvider");
  }
  return ctx;
}
