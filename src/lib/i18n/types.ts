import type { Answer, Likelihood, Qualifier } from "../oracle";
import type { SoloCompassTableId } from "../tableGames";
import type { TableTheme } from "../tables";
import type { ThemeId } from "../theme";

// Duplicated on purpose instead of importing it from components/Die.tsx,
// so this module doesn't depend on the component layer.
type DieColor = "blanco" | "negro";

export type Locale = "es" | "en";

export const LOCALES: Locale[] = ["es", "en"];

/**
 * Full dictionary of UI strings. Both locales
 * (src/lib/i18n/locales/{es,en}.ts) must implement exactly this
 * shape — if a key is missing from either, TypeScript complains.
 */
/**
 * One line of the sample adventure's script. Rolls are given as dice,
 * not text: `sampleAdventure.ts` writes them like a real game (oracle
 * name, answer, table result), in the app's language.
 */
export type SampleLine =
  | { kind: "note" | "action" | "question" | "consequence" | "session" | "roll"; text: string }
  | { oracle: [white: number, black: number] }
  | { table: SoloCompassTableId; roll: number[] };

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
    /** Settings button title when it shows the backup-due dot. */
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
  install: {
    sectionTitle: string;
    statusStandalone: string;
    statusInstalled: string;
    openIt: string;
    statusNotInstalled: string;
    benefit: string;
    button: string;
    installing: string;
    manualIos: string;
    manual: string;
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
    /** Ironsworn credit card: its tables, the "not official" notice and who translated them. */
    tablesUsedBy: string;
    notOfficial: string;
    translationNote: string;
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
    /** "Last backup: {when}" ({when} = "3 days ago"). */
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
    toolTableHint: string;
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
    /** Quick inspiration: action + theme rolled together. */
    inspirationTitle: string;
    inspirationDescription: string;
    inspirationButton: string;
    /** Name the combined roll gets in the journal and history panel. */
    inspirationName: string;
    builtInHeading: string;
    /** Credit under the Ironsworn block's title. */
    ironswornNote: string;
    /** Credit under a third-party game's block: "By {author}, licensed under {license}." */
    creditNote: string;
    /** Number of tables in a folded block. */
    sectionCount: string;
    /** Names of the table themes (filter chips, sub-headings in a block). */
    themes: Record<TableTheme, string>;
    themeFilterLabel: string;
    allThemes: string;
    /** A game's tables couldn't be loaded (e.g. offline before the app was cached). */
    loadError: string;
    customHeading: string;
    customEmpty: string;
    /** Badge of a custom table with no source. */
    customGame: string;
    newTable: string;
    importTable: string;
    importTableTitle: string;
    importError: string;
    importedCount: string;
    editTable: string;
    exportTable: string;
    shareTable: string;
    deleteTable: string;
    tableActions: string;
    tableDeleted: string;
    exportedTable: string;
    /** Column header in an exported table. */
    resultColumn: string;
    authorLabel: string;
    licenseLabel: string;
    editor: {
      newTitle: string;
      editTitle: string;
      nameLabel: string;
      namePlaceholder: string;
      descriptionLabel: string;
      descriptionPlaceholder: string;
      diceLabel: string;
      diceAuto: string;
      entriesLabel: string;
      entriesHint: string;
      entriesPlaceholder: string;
      themeLabel: string;
      themeNone: string;
      attributionToggle: string;
      sourceLabel: string;
      authorLabel: string;
      licenseLabel: string;
      urlLabel: string;
      ownershipNote: string;
      save: string;
      summary: string;
      errorName: string;
      errorTooFew: string;
      errorCount: string;
      errorRanges: string;
      errorMixed: string;
      errorD66Lines: string;
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
    searchInJournal: string;
    searchInJournalPlaceholder: string;
    searchNoMatches: string;
    searchMatchCount: string;
    searchMatchCountOne: string;
    searchMoreResults: string;
    searchEntriesHeading: string;
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
    composerHintConsequence: string;
    composerHintNote: string;
    addPlaceholder: string;
    addButton: string;
    sendButton: string;
    kindMenuLabel: string;
    composerHintSession: string;
    consequenceJoins: string;
    consequenceAlone: string;
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
    statsButton: string;
    shareButton: string;
    stats: {
      title: string;
      sessions: string;
      entries: string;
      words: string;
      daysPlayed: string;
      oracleHeading: string;
      questions: string;
      yes: string;
      no: string;
      contradiction: string;
      qualifiers: string;
      moodKind: string;
      moodFair: string;
      moodStubborn: string;
      noOracle: string;
      rollsHeading: string;
      tableRolls: string;
      diceRolls: string;
      topTable: string;
      dateRange: string;
      singleDate: string;
      empty: string;
    };
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
  /** Code for Intl.DateTimeFormat (date/time formatting). */
  sample: {
    /** Discreet link under "You don't have any adventures yet". */
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
