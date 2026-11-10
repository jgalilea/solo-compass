import { createContext } from "react";
import type { useGenerators } from "./useGenerators";

export type GeneratorsContextValue = ReturnType<typeof useGenerators>;

export const GeneratorsContext = createContext<GeneratorsContextValue | null>(null);
