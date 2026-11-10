import { useContext } from "react";
import { SavedRollsContext, type SavedRollsContextValue } from "./savedRollsContextInstance";

export function useSavedRollsContext(): SavedRollsContextValue {
  const ctx = useContext(SavedRollsContext);
  if (!ctx) {
    throw new Error("useSavedRollsContext must be used inside SavedRollsProvider");
  }
  return ctx;
}
