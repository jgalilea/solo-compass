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
/**
 * Una línea del guion de la aventura de ejemplo. Las tiradas se dan
 * como dados, no como texto: `sampleAdventure.ts` las escribe igual
 * que una partida real (nombre del oráculo, respuesta, resultado de la
 * tabla), en el idioma de la app.
 */
export type SampleLine =
  | { kind: "note" | "action" | "question" | "consequence" | "session" | "roll"; text: string }
  | { oracle: [white: number, black: number] }
  | { table: "eventoAleatorio" | "accionPnj" | "descriptorEscena"; roll: number[] };

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
    undo: string;
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
  settings: {
    triggerLabel: string;
    title: string;
    appearanceHeading: string;
    languageHeading: string;
    aboutHeading: string;
    /** Título del botón de Ajustes cuando tiene el punto de copia pendiente. */
    triggerLabelBackupDue: string;
  };
  shortcuts: {
    heading: string;
    intro: string;
    navigationHeading: string;
    goOracle: string;
    goTables: string;
    goJournal: string;
    goHistory: string;
    playHeading: string;
    write: string;
    oracle: string;
    table: string;
    dice: string;
    leaveField: string;
    send: string;
    newLine: string;
    help: string;
    shiftKey: string;
    enterKey: string;
  };
  storage: {
    sectionTitle: string;
    whatTitle: string;
    what: string;
    benefitTitle: string;
    benefit: string;
    howTitle: string;
    how: string;
    ownershipTitle: string;
    ownership: string;
    protectButton: string;
    protecting: string;
    howToRemoveTitle: string;
    howToRemove: string;
    deniedTitle: string;
    deniedInSettings: string;
    statusProtected: string;
    statusUnprotected: string;
    learnMore: string;
    backupStillMatters: string;
  };
  update: {
    title: string;
    description: string;
    button: string;
    updating: string;
    later: string;
  };
  changelog: {
    button: string;
    buttonHint: string;
    title: string;
    intro: string;
    latestBadge: string;
  };
  support: {
    title: string;
    description: string;
    button: string;
    headerLink: string;
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
    legendSession: string;
    legendIntro: string;
    dataSectionTitle: string;
    dataSectionDescription: string;
    exportAllButton: string;
    exportedAllConfirmation: string;
    /** "Última copia: {when}" ({when} = "hace 3 días"). */
    lastBackup: string;
    noBackupYet: string;
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
    consequenceSaved: string;
    consequenceSavedNoAdventure: string;
    enterHint: string;
    recentHeading: string;
    viewAllHistory: string;
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
    resultPanelHeading: string;
    resultPanelEmpty: string;
    entries: {
      eventoAleatorio: string[];
      accionPnj: string[];
      descriptorEscena: string[];
    };
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
    swipeHint: string;
    backToOracle: string;
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
    entryDeleted: string;
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
    goToActiveAdventure: string;
    favoriteAdd: string;
    favoriteRemove: string;
    dragHandle: string;
    toggleSession: string;
    previousSessionsHeading: string;
    togglePreviousSessions: string;
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
    kindSession: string;
    toolOracle: string;
    toolTable: string;
    toolOracleTitle: string;
    toolTableTitle: string;
    moreActions: string;
    composerHintAction: string;
    composerHintRoll: string;
    composerHintConsequence: string;
    composerHintNote: string;
    addPlaceholder: string;
    addButton: string;
    sendButton: string;
    kindMenuLabel: string;
    composerHintSession: string;
    toolDice: string;
    toolDiceTitle: string;
    diceLabelPlaceholder: string;
    diceHint: string;
    diceLog: string;
    diceClear: string;
    entryDeleted: string;
    sessionsHeading: string;
    prologueLabel: string;
    noActiveChip: string;
    noActiveChipTitle: string;
    playPanelLabel: string;
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
  sample: {
    /** Enlace discreto bajo "Todavía no tienes ninguna aventura". */
    offer: string;
    name: string;
    script: SampleLine[];
  };
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
