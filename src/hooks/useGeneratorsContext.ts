import { useContext } from "react";
import { GeneratorsContext, type GeneratorsContextValue } from "./generatorsContextInstance";

export function useGeneratorsContext(): GeneratorsContextValue {
  const ctx = useContext(GeneratorsContext);
  if (!ctx) {
    throw new Error("useGeneratorsContext must be used inside GeneratorsProvider");
  }
  return ctx;
}
