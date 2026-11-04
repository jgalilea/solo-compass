import { useContext } from "react";
import { CustomTablesContext, type CustomTablesContextValue } from "./customTablesContextInstance";

export function useCustomTablesContext(): CustomTablesContextValue {
  const ctx = useContext(CustomTablesContext);
  if (!ctx) {
    throw new Error("useCustomTablesContext must be used inside CustomTablesProvider");
  }
  return ctx;
}
