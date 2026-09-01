import { useContext } from "react";
import { HistoryContext, type HistoryContextValue } from "./historyContextInstance";

export function useHistoryContext(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    throw new Error("useHistoryContext debe usarse dentro de HistoryProvider");
  }
  return ctx;
}
