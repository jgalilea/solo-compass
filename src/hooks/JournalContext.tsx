import type { ReactNode } from "react";
import { useJournal } from "./useJournal";
import { JournalContext } from "./journalContextInstance";

export function JournalProvider({ children }: { children: ReactNode }) {
  const value = useJournal();
  return (
    <JournalContext.Provider value={value}>{children}</JournalContext.Provider>
  );
}
