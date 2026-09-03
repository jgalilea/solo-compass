import type { Answer, Likelihood, Qualifier } from "../oracle";
import type { ThemeId } from "../theme";

// Duplicado a propósito en vez de importarlo de components/Die.tsx,
// para que este módulo no dependa de la capa de componentes.
type DieColor = "blanco" | "negro";

export type Locale = "es" | "en";

export const LOCALES: Locale[] = ["es", "en"];

/**
 * Diccionario completo de textos de la interfaz. Ambos locales
 * (src/lib/i18n/locales/{es,en}.ts) deben implementar exactamente
 * esta forma — si falta una clave en alguno, TypeScript avisa.
 */
export interface Dictionary {
  common: {
    close: string;
    cancel: string;
    loading: string;
    retry: string;
    somethingWrong: string;
  };
  nav: {
    oracle: string;
    tables: string;
    history: string;
  };
  header: {
    appName: string;
  };
  language: {
    triggerLabel: string;
    dialogTitle: string;
    names: Record<Locale, string>;
  };
  themeSwitcher: {
    triggerLabel: string;
    dialogTitle: string;
  };
  theme: Record<ThemeId, { name: string; tagline: string }>;
  about: {
    triggerLabel: string;
    dialogLabel: string;
    description: string;
    recluseUsedBy: string;
    recluseAuthor: string;
    recluseLicense: string;
    recluseViewOriginal: string;
  };
  oracle: {
    title: string;
    recluseLinkTitle: string;
    questionLabel: string;
    questionPlaceholder: string;
    rollButton: string;
    emptyTitle: string;
    emptyDescription: string;
    vs: string;
    contradictionExplanation: string;
  };
  likelihood: Record<Likelihood, string>;
  likelihoodGroupLabel: string;
  answer: Record<Answer, string>;
  qualifier: Record<Exclude<Qualifier, null>, string>;
  die: {
    ariaLabel: string;
    color: Record<DieColor, string>;
  };
  tables: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchLabel: string;
    noResultsTitle: string;
    noResultsDescription: string;
    favoritesHeading: string;
    allHeading: string;
    favoriteAdd: string;
    favoriteRemove: string;
    rolling: string;
    rollButton: string;
    resultLabel: string;
    viewResultsTitle: string;
    viewResultsHint: string;
    resultsCountLabel: string;
    allResultsDialogLabel: string;
    genericGame: string;
    noEntryFallback: string;
    placeholderEntry: string;
    names: {
      eventoAleatorio: string;
      accionPnj: string;
      descriptorEscena: string;
    };
    descriptions: {
      eventoAleatorio: string;
      accionPnj: string;
      descriptorEscena: string;
    };
  };
  history: {
    title: string;
    subtitle: string;
    clearAll: string;
    filterAll: string;
    filterOracle: string;
    filterTables: string;
    filterFavorites: string;
    loading: string;
    loadErrorTitle: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyFavoritesTitle: string;
    emptyFavoritesDescription: string;
    emptyFilterTitle: string;
    kindOracle: string;
    favoriteAdd: string;
    favoriteRemove: string;
    deleteEntry: string;
    rollLabel: string;
    clearConfirmTitle: string;
    clearConfirmDescription: string;
    clearConfirmButton: string;
    deleteConfirmTitle: string;
    deleteConfirmSuffix: string;
    deleteConfirmButton: string;
    describeOracleFallback: string;
  };
  error: {
    boundaryTitle: string;
    boundaryDescription: string;
    reload: string;
  };
  /** Código para Intl.DateTimeFormat (formateo de fecha/hora). */
  dateLocale: string;
}

export function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{${key}}`,
  );
}
