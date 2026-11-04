import type { ReactNode } from "react";
import { useCustomTables } from "./useCustomTables";
import { CustomTablesContext } from "./customTablesContextInstance";

export function CustomTablesProvider({ children }: { children: ReactNode }) {
  const value = useCustomTables();
  return (
    <CustomTablesContext.Provider value={value}>{children}</CustomTablesContext.Provider>
  );
}
