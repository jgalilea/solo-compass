import { createContext } from "react";
import type { useJournal } from "./useJournal";

export type JournalContextValue = ReturnType<typeof useJournal>;

export const JournalContext = createContext<JournalContextValue | null>(null);
