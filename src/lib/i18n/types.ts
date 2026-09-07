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
    viewOriginal: string;
    save: string;
    delete: string;
  };
  nav: {
    oracle: string;
    tables: string;
    journal: string;
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
  modeSwitcher: {
    groupLabel: string;
    light: string;
    dark: string;
    auto: string;
  };
  about: {
    triggerLabel: string;
    dialogLabel: string;
    description: string;
    oracleUsedBy: string;
    journalUsedBy: string;
    creditBy: string;
    legendTitle: string;
    legendAction: string;
    legendQuestion: string;
    legendRoll: string;
    legendConsequence: string;
    legendNote: string;
    dataSectionTitle: string;
    dataSectionDescription: string;
    exportAllButton: string;
    exportedAllConfirmation: string;
    importAllButton: string;
    importAllConfirmTitle: string;
    importAllConfirmDescription: string;
    importAllConfirmButton: string;
    importAllError: string;
    importAllSuccessReloading: string;
  };
  oracleSwitcher: {
    triggerLabel: string;
    dialogTitle: string;
    moreComingSoon: string;
  };
  oracle: {
    title: string;
    questionLabel: string;
    questionPlaceholder: string;
    rollButton: string;
    emptyTitle: string;
    emptyDescription: string;
    vs: string;
    contradictionExplanation: string;
    consequencePlaceholder: string;
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
    storageUnavailableError: string;
    storageCorruptedError: string;
    storageSaveError: string;
    storageClearError: string;
    genericLoadError: string;
    genericSaveError: string;
    genericClearError: string;
  };
  journal: {
    title: string;
    subtitle: string;
    adventuresHeading: string;
    newAdventure: string;
    newAdventurePlaceholder: string;
    createButton: string;
    renameAdventure: string;
    renameAdventurePlaceholder: string;
    deleteAdventure: string;
    deleteAdventureConfirmTitle: string;
    deleteAdventureConfirmDescription: string;
    deleteAdventureConfirmButton: string;
    setActive: string;
    unsetActive: string;
    activeLabel: string;
    activeAdventureNote: string;
    noActiveAdventureNote: string;
    activateHint: string;
    activateNudge: string;
    goToActiveAdventure: string;
    favoriteAdd: string;
    favoriteRemove: string;
    dragHandle: string;
    toggleSession: string;
    currentSessionBadge: string;
    previousSessionsHeading: string;
    togglePreviousSessions: string;
    composerShow: string;
    composerHide: string;
    composerCollapsedLabel: string;
    diceRollerLabel: string;
    searchPlaceholder: string;
    searchLabel: string;
    noSearchResultsTitle: string;
    noSearchResultsDescription: string;
    backToList: string;
    statusPaused: string;
    statusArchived: string;
    archiveAdventure: string;
    unarchiveAdventure: string;
    archivedHeading: string;
    noAdventuresTitle: string;
    noAdventuresDescription: string;
    noEntriesTitle: string;
    noEntriesDescription: string;
    kindAction: string;
    kindQuestion: string;
    kindRoll: string;
    kindConsequence: string;
    kindNote: string;
    composerHintAction: string;
    composerHintRoll: string;
    composerHintConsequence: string;
    composerHintNote: string;
    addPlaceholder: string;
    addButton: string;
    newSessionButton: string;
    newSessionPlaceholder: string;
    deleteEntry: string;
    editEntry: string;
    exportButton: string;
    exportedToastTitle: string;
    exportedToastDescription: string;
    importButton: string;
    importNamePrompt: string;
    importError: string;
    loading: string;
    loadErrorTitle: string;
    lonelogCreditLine: string;
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
