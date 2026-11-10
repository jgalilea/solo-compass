import { createContext } from "react";
import type { useSavedRolls } from "./useSavedRolls";

export type SavedRollsContextValue = ReturnType<typeof useSavedRolls>;

export const SavedRollsContext = createContext<SavedRollsContextValue | null>(null);
