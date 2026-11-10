import type { ReactNode } from "react";
import { useSavedRolls } from "./useSavedRolls";
import { SavedRollsContext } from "./savedRollsContextInstance";

export function SavedRollsProvider({ children }: { children: ReactNode }) {
  const value = useSavedRolls();
  return <SavedRollsContext.Provider value={value}>{children}</SavedRollsContext.Provider>;
}
