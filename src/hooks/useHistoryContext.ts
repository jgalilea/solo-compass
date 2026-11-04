import { useContext } from "react";
import { HistoryContext, type HistoryContextValue } from "./historyContextInstance";

export function useHistoryContext(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    throw new Error("useHistoryContext must be used inside HistoryProvider");
  }
  return ctx;
}
