import type { ReactNode } from "react";
import { useGenerators } from "./useGenerators";
import { GeneratorsContext } from "./generatorsContextInstance";

export function GeneratorsProvider({ children }: { children: ReactNode }) {
  const value = useGenerators();
  return <GeneratorsContext.Provider value={value}>{children}</GeneratorsContext.Provider>;
}
