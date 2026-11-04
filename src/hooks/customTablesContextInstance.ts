import { createContext } from "react";
import type { useCustomTables } from "./useCustomTables";

export type CustomTablesContextValue = ReturnType<typeof useCustomTables>;

export const CustomTablesContext = createContext<CustomTablesContextValue | null>(null);
