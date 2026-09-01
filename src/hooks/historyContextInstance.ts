import { createContext } from "react";
import type { useHistory } from "./useHistory";

export type HistoryContextValue = ReturnType<typeof useHistory>;

export const HistoryContext = createContext<HistoryContextValue | null>(null);
