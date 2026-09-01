import type { ReactNode } from "react";
import { useHistory } from "./useHistory";
import { HistoryContext } from "./historyContextInstance";

export function HistoryProvider({ children }: { children: ReactNode }) {
  const value = useHistory();
  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}
