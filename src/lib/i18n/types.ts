import type { SceneVerdict } from "../sceneCheck";
import type { Answer, Likelihood, Qualifier } from "../oracle";
import type { OracleDiceGroup, OracleId } from "../oracleEngines";
import type { CastKind } from "../lonelogTags";
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
  | { kind: "note" | "action" | "question" | "consequence" | "scene" | "roll"; text: string }
  /** A session with its day of play ("2025-09-03"). */
  | { kind: "session"; text: string; date?: string }
  | { oracle: [white: number, black: number] }
  | { table: SoloCompassTableId; roll: number[] }
  /** Quick inspiration: the Action and Theme rolls, as d66 digits. */
  | { inspiration: [action: number[], theme: number[]] };

/** One line of the quick guide: what to write, and what it's for. */
export interface GuideRow {
  code: string;
  text: string;
}

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
    decrease: string;
    increase: string;
  };
  nav: {
    oracle: string;
    tables: string;
    dice: string;
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
  dice: {
    title: string;
    subtitle: string;
    loggingTo: string;
    noAdventure: string;
    loggedIn: string;
    savedTitle: string;
    savedEmpty: string;
    newRoll: string;
    nameLabel: string;
    namePlaceholder: string;
    favoriteAdd: string;
    favoriteRemove: string;
    favoriteAddHint: string;
    favoriteRemoveHint: string;
    edit: string;
    delete: string;
    deleted: string;
    saveFormula: string;
    saveFormulaHint: string;
    saved: string;
    trayHint: string;
    builtinTitle: string;
    customTitle: string;
    favoritesHint: string;
    noFavorites: string;
    toolLabel: string;
    toolDice: string;
    toolCards: string;
    deckLabel: string;
    deckPoker: string;
    deckTarot: string;
    jokers: string;
    reversed: string;
    unique: string;
    uniqueOn: string;
    uniqueOff: string;
    draw: string;
    left: string;
    empty: string;
    shuffle: string;
    shuffled: string;
    cardsHint: string;
    cardsTrayHint: string;
  };
  guide: {
    title: string;
    intro: string;
    settingsText: string;
    settingsButton: string;
    writingHeading: string;
    writing: string[];
    notationHeading: string;
    notationIntro: string;
    notation: GuideRow[];
    tagsHeading: string;
    tagsIntro: string;
    tags: GuideRow[];
    updatesHeading: string;
    updatesIntro: string;
    updates: GuideRow[];
  };
  shortcuts: {
    ctrlKey: string;
    altKey: string;
    journalHeading: string;
    entryType: string;
    askOracle: string;
    undoDelete: string;
    heading: string;
    intro: string;
    navigationHeading: string;
    goOracle: string;
    goTables: string;
    goDice: string;
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
  safariNote: {
    text: string;
    moveData: string;
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
    legendScene: string;
    legendTable: string;
    legendNarrative: string;
    legendAddons: string;
    /** Character and place tags ([N:…], [L:…]). */
    legendTags: string;
    legendIntro: string;
    dataSectionTitle: string;
    dataSectionDescription: string;
    /** Under the backup buttons: what the copy holds vs. exporting one adventure. */
    dataSectionHint: string;
    exportAllButton: string;
    exportedAllConfirmation: string;
    /** "Last backup: {when}" ({when} = "3 days ago"). */
    lastBackup: string;
    noBackupYet: string;
    importAllButton: string;
    importAllError: string;
    importAllSuccessReloading: string;
    shareAllButton: string;
    shareAllTitle: string;
    restoreChoiceTitle: string;
    restoreChoiceDescription: string;
    restoreMergeLabel: string;
    restoreMergeDescription: string;
    restoreReplaceLabel: string;
    restoreReplaceDescription: string;
  };
  oracleSwitcher: {
    triggerLabel: string;
    dialogTitle: string;
    /** One line under each oracle's name: what it's like to use. */
    blurb: Record<OracleId, string>;
    favorite: string;
    markFavorite: string;
    favoriteHint: string;
  };
  /** Short guide to the oracle (not its full rules: those are in the original). */
  oracleHelp: {
    button: string;
    title: string;
    intro: string;
    steps: string[];
    answersHeading: string;
    answers: { label: string; text: string }[];
    /** How the chosen oracle reads its dice, in our own words, and its special answer if it has one. */
    rules: Record<OracleId, { heading: string; text: string; special?: { label: string; text: string } }>;
    oddsHeading: string;
    oddsIntro: string;
    oddsColumns: { likelihood: string; yes: string; no: string; and: string; but: string };
    /** The column for each oracle's special outcome (none for OPSE). */
    oddsSpecial: Partial<Record<OracleId, string>>;
    stuck: string;
    /** {name}, {author}, {license}. */
    credit: string;
  };
  diceHelp: {
    button: string;
    title: string;
    intro: string;
    stepsHeading: string;
    steps: string[];
    buttonsHeading: string;
    buttons: { label: string; text: string }[];
    symbolsHeading: string;
    /** What each mark in a logged roll means. */
    symbols: { symbol: string; text: string }[];
    formulasHeading: string;
    formulasIntro: string;
    partsLabel: string;
    examplesLabel: string;
    usedInLabel: string;
    formulas: {
      name: string;
      formula: string;
      text: string;
      /** The formula taken apart, piece by piece. */
      parts: { token: string; text: string }[];
      /** `line` is what it leaves in the journal (a test rolls each one). */
      examples: { line: string; text: string }[];
      usedIn: string;
    }[];
    rulesHeading: string;
    rules: string[];
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
    /** Ironsworn: a match. */
    matchLabel: string;
    matchExplanation: string;
    /** Loner: a double; {count} is the Twist Counter now. */
    doubleExplanation: string;
    /** Loner's counter in the journal: {count}. */
    doubleShort: string;
    twistCounterHint: string;
    twistLabel: string;
    twistExplanation: string;
    rollTwist: string;
    /** "{die} {value} vs {target}+" detail pieces in the journal. */
    targetSuffix: string;
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
  /** Each oracle die by its role (oracleEngines.ts). */
  oracleDice: Record<OracleDiceGroup["role"], string>;
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
    sectionCountOne: string;
    generatorCount: string;
    generatorCountOne: string;
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
    generatorsHeading: string;
    generatorsIntro: string;
    generatorNew: string;
    generatorsEmpty: string;
    generatorRoll: string;
    generatorEdit: string;
    generatorDelete: string;
    generatorDeleted: string;
    generatorMissing: string;
    generatorNewTitle: string;
    generatorEditTitle: string;
    generatorNameLabel: string;
    generatorNamePlaceholder: string;
    generatorNameError: string;
    generatorTablesLabel: string;
    generatorTablesError: string;
    generatorSearchLabel: string;
    generatorSearchPlaceholder: string;
    generatorAddTable: string;
    generatorRemoveTable: string;
    generatorMoveUp: string;
    generatorMoveDown: string;
    generatorMore: string;
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
    showMore: string;
    backToOracle: string;
    backToDice: string;
    backToTables: string;
    adventureFilterLabel: string;
    adventureAll: string;
    adventureFree: string;
    backToAdventure: string;
    showRolls: string;
    clearAll: string;
    filterAll: string;
    filterOracle: string;
    filterTables: string;
    filterDice: string;
    filterFavorites: string;
    loading: string;
    loadErrorTitle: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyFavoritesTitle: string;
    emptyFavoritesDescription: string;
    emptyFilterTitle: string;
    kindOracle: string;
    kindDice: string;
    freeRoll: string;
    deletedAdventure: string;
    favoriteAdd: string;
    favoriteRemove: string;
    deleteEntry: string;
    rollLabel: string;
    clearConfirmTitle: string;
    clearConfirmDescription: string;
    clearConfirmButton: string;
    entryDeleted: string;
    storageUnavailableError: string;
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
    showEarlierEntries: string;
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
    kindScene: string;
    /** Combat add-on: a fight scene, and a round ("Rd1"). */
    sceneCombat: string;
    /** The add-ons' blocks ([COMBAT] … [/COMBAT] and the like): opening and closing. */
    blocks: Record<"combat" | "dungeon" | "resources", { open: string; close: string }>;
    /** Who speaks, when it's the player character ("PC: …"). */
    dialoguePc: string;
    /** A roll's kind when it isn't plain dice: tbl: and gen:. */
    rollSymbol: { tbl: string; gen: string };
    toolOracle: string;
    toolTable: string;
    toolOracleTitle: string;
    toolTableTitle: string;
    moreActions: string;
    composerHintAction: string;
    kindExcerpt: string;
    composerHintExcerpt: string;
    excerptPlaceholder: string;
    kindDialogue: string;
    composerHintDialogue: string;
    dialogueSpeaker: string;
    dialogueOther: string;
    dialogueOtherName: string;
    dialoguePlaceholder: string;
    dialoguePlaceholderPc: string;
    askFromComposer: string;
    copyLonelog: string;
    copiedSection: string;
    copiedAdventure: string;
    copyFailed: string;
    filterShowing: string;
    filterShowingOne: string;
    filterClear: string;
    filterEmpty: string;
    dialogueAddToNotebook: string;
    dialogueAddToNotebookTitle: string;
    composerHintConsequence: string;
    composerHintNote: string;
    addPlaceholder: string;
    addButton: string;
    sendButton: string;
    kindMenuLabel: string;
    composerHintSession: string;
    composerHintScene: string;
    consequenceJoins: string;
    consequenceAlone: string;
    toolDice: string;
    toolDiceTitle: string;
    diceLabelPlaceholder: string;
    diceHint: string;
    diceLog: string;
    diceLogMany: string;
    diceRemove: string;
    diceTrayLabel: string;
    diceClear: string;
    diceAdvantage: string;
    diceDisadvantage: string;
    diceAdvantageHint: string;
    diceDisadvantageHint: string;
    diceFormulaLabel: string;
    diceFormulaPlaceholder: string;
    diceFormulaRoll: string;
    diceFormulaClear: string;
    diceFormulaError: string;
    entryDeleted: string;
    sessionsHeading: string;
    showScenes: string;
    hideScenes: string;
    prologueLabel: string;
    noActiveChip: string;
    noActiveChipTitle: string;
    playPanelLabel: string;
    newSessionButton: string;
    newSessionPlaceholder: string;
    newSceneButton: string;
    /** {id}: the scene's number, "S4". */
    newScenePlaceholder: string;
    /** Testing a new scene with the oracle (optional). */
    sceneCheckLabel: string;
    sceneCheckOptional: string;
    /** Under the switch while it's on: how to read the answer. */
    sceneCheckHint: string;
    sceneCheckQuestion: string;
    /** The consequence's placeholder after the test: how the scene starts. */
    sceneVerdict: Record<SceneVerdict, string>;
    deleteEntry: string;
    editEntry: string;
    moreEntryActions: string;
    insertBelow: string;
    moveUp: string;
    moveDown: string;
    /** Composer line while writing below an entry, before «text». */
    insertingAfter: string;
    insertDone: string;
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
      activityHeading: string;
      activityHint: string;
      activityLess: string;
      activityMore: string;
      /** A day's square, on hover: "9 nov 2026: 3 entries". */
      activityDay: string;
      activityDays: string;
      activityDaysOne: string;
      streak: string;
      streakOne: string;
      empty: string;
    };
    exportButton: string;
    exportHtmlButton: string;
    htmlExportedOn: string;
    /** Comment over the colours in an exported HTML page. */
    htmlThemeComment: string;
    exportedToastTitle: string;
    exportedToastDescription: string;
    importButton: string;
    importNamePrompt: string;
    importError: string;
    loading: string;
    loadErrorTitle: string;
    lonelogCreditLine: string;
  };
  /** The adventure's notebook: pinned notes plus characters and places. */
  notebook: {
    title: string;
    openLabel: string;
    notesTitle: string;
    notesEmpty: string;
    notesPlaceholder: string;
    notesEdit: string;
    notesDone: string;
    /** A character's, place's or thread's free text (not logged). */
    descriptionAdd: string;
    descriptionPlaceholder: string;
    /** {name} */
    descriptionLabel: string;
    castTitle: string;
    castEmpty: string;
    /** Each kind of notebook element (Lonelog tag), by its id in lonelogTags.ts. */
    kinds: Record<CastKind, string>;
    /** What a clock, a track and a timer are for (the add form). */
    kindHints: Record<"clock" | "track" | "timer" | "room" | "foe" | "item" | "wealth", string>;
    statuses: Record<"open" | "closed" | "abandoned", string>;
    threadsTitle: string;
    threadsEmpty: string;
    groupThreads: string;
    groupProgress: string;
    closeThread: string;
    reopenThread: string;
    increase: string;
    decrease: string;
    segmentsLabel: string;
    timerStartLabel: string;
    rollList: string;
    addThreadButton: string;
    groupCharacters: string;
    groupPlaces: string;
    groupRooms: string;
    groupFoes: string;
    groupItems: string;
    groupWealth: string;
    /** Resource tracking add-on: items and money. */
    inventoryTitle: string;
    inventoryEmpty: string;
    addInventoryButton: string;
    quantityLabel: string;
    /** "Use one {name}" / "One more {name}". */
    useOne: string;
    addOne: string;
    quantityChangePlaceholder: string;
    quantityChangeHint: string;
    mentionCount: string;
    mentionCountOne: string;
    mentionButton: string;
    filterButton: string;
    filterHint: string;
    renameButton: string;
    renameLabel: string;
    renameHint: string;
    renamed: string;
    progressFull: string;
    timerDone: string;
    searchPlaceholder: string;
    searchEmpty: string;
    mentionHint: string;
    changeButton: string;
    changePlaceholder: string;
    changeHint: string;
    logButton: string;
    addButton: string;
    addKindLabel: string;
    addNameLabel: string;
    addDetailsLabel: string;
    addHint: string;
    tagChipLabel: string;
    suggestLabel: string;
    suggestHint: string;
    /** Headings of the "[" list: the last few named, then everything. */
    suggestRecent: string;
    suggestAll: string;
    suggestNew: string;
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
    /** Its pinned notes (in the .md's front matter). */
    notes: string;
    /** Notebook descriptions, one "[N:Name] text" line each (front matter too). */
    descriptions: string;
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
