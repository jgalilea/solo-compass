import type { EntryType } from "../journalSearch";
import type { SceneVerdict } from "../sceneCheck";
import type { Answer, Likelihood, Qualifier } from "../oracle";
import type { OracleDiceGroup, OracleId } from "../oracleEngines";
import type { CastKind, CategoryWords } from "../lonelogTags";
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
  /**
   * Recluse's dice: one of each colour, or every die of a colour the
   * question's likelihood throws ("Likely": two white); the highest counts.
   */
  | { oracle: [white: number | number[], black: number | number[]] }
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
    /** Switch for the Screen Wake Lock (only where the browser has it). */
    keepScreenOnLabel: string;
    keepScreenOnHint: string;
  };
  /** Picking the dice and tables on an adventure's game table (GameTablePickers). */
  gameTable: {
    pickDice: string;
    pickTables: string;
    diceTitle: string;
    tablesTitle: string;
    /**
     * Where what's on a game table comes from, said beside each tool and
     * on top of its dialog: the favourites, the device's last oracle
     * (no favourite oracle yet), or the adventure's own pick.
     */
    fromFavoriteDice: string;
    fromFavoriteTables: string;
    fromFavoriteOracle: string;
    fromLastOracle: string;
    fromAdventure: string;
    /** The Oracle screen, while an adventure is active and has its own. */
    fromActiveAdventure: string;
    /** The same rule for the three: what's picked here is the adventure's alone. */
    diceRule: string;
    tablesRule: string;
    oracleRule: string;
    /** The Oracle screen while an adventure is active: it asks with that one's. */
    oracleScreenRule: string;
    /** Still the favourites: when that changes. */
    diceFollowing: string;
    tablesFollowing: string;
    oracleFollowing: string;
    oracleFollowingLast: string;
    /** Its own: the stars no longer change it, and how to undo it. */
    diceOwn: string;
    tablesOwn: string;
    oracleOwn: string;
    builtin: string;
    own: string;
    noOwn: string;
    onTable: string;
    noneOnTable: string;
    searchLabel: string;
    searchPlaceholder: string;
    add: string;
    remove: string;
    more: string;
    resetDice: string;
    resetTables: string;
    done: string;
  };
  dice: {
    title: string;
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
    repeat: string;
    trayHint: string;
    saveToHistory: string;
    builtinTitle: string;
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
    majorOnly: string;
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
    settingsText: string;
    settingsButton: string;
  };
  shortcuts: {
    ctrlKey: string;
    altKey: string;
    journalHeading: string;
    entryType: string;
    askOracle: string;
    undoDelete: string;
    zen: string;
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
  /** Journal list: the adventures are only in this browser. */
  backupNote: { title: string; text: string; button: string; failed: string };
  safariNote: {
    text: string;
    moveData: string;
  };
  install: {
    sectionTitle: string;
    statusStandalone: string;
    statusInstalled: string;
    openIt: string;
    /** Some browsers don't notice the app was removed from the home screen. */
    removed: string;
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
    /** "Versión {version}", under the app's description. */
    version: string;
    /** The privacy note: everything stays in the browser. */
    privacyTitle: string;
    privacyItems: string[];
    /** The feedback card: ideas and bugs, through a form. */
    feedbackTitle: string;
    feedbackDescription: string;
    feedbackButton: string;
    /** The open-source card: the code on GitHub. */
    sourceTitle: string;
    sourceDescription: string;
    sourceButton: string;
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
    /** "Replace everything" asks again: it can't be undone. */
    restoreReplaceConfirm: string;
    restoreReplaceConfirmButton: string;
    restoreReplaceBack: string;
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
  };
  diceHelp: {
    button: string;
    title: string;
  };
  /** A file dropped on the window, opened with the installed app or shared to it (fileImport.ts). */
  files: {
    dialogTitle: string;
    dropHere: string;
    dropHint: string;
    reading: string;
    nextFilesOne: string;
    nextFiles: string;
    journalKind: string;
    entriesLabel: string;
    journalAction: string;
    journalNote: string;
    asTables: string;
    asJournal: string;
    tablesKind: string;
    tablesActionOne: string;
    tablesAction: string;
    tablesNote: string;
    backupKind: string;
    backupMadeOn: string;
    adventuresLabel: string;
    rollsLabel: string;
    tablesLabel: string;
    problemTitle: string;
    /** A file shared to the app: it may not have been the player who shared it. */
    sharedNote: string;
    problems: {
      unsupported: string;
      tooBig: string;
      notText: string;
      empty: string;
      damaged: string;
      newerBackup: string;
      notOurs: string;
      noJournal: string;
      noTables: string;
    };
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
    /** The switch under the search: look in the results too, not only the names. */
    searchResults: string;
    /** How many more results have the words, beyond those shown. */
    moreMatches: string;
    noResultsTitle: string;
    noResultsDescription: string;
    favoritesHeading: string;
    toolTableHint: string;
    allHeading: string;
    favoriteAdd: string;
    favoriteRemove: string;
    /** What a starred table is for. */
    favoriteAddHint: string;
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
    ownHeading: string;
    gamesHeading: string;
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
      errorTooBig: string;
    };
  };
  history: {
    title: string;
    subtitle: string;
    /** With an adventure picked, or the free rolls. */
    subtitleAdventure: string;
    subtitleFree: string;
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
    importedNote: string;
    emptyFilterTitle: string;
    kindOracle: string;
    kindDice: string;
    kindCards: string;
    freeRoll: string;
    log: string;
    logTitle: string;
    searchLabel: string;
    searchPlaceholder: string;
    searchClear: string;
    searchNoResults: string;
    deletedAdventure: string;
    favoriteAdd: string;
    favoriteRemove: string;
    /** What a starred roll is for. */
    favoriteAddHint: string;
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
    /** The header chip's tooltip: where it goes, and why it matters. */
    activeChipTitle: string;
    noActiveAdventureNote: string;
    activateHint: string;
    /** The notice once an adventure is made the active one. */
    activatedTitle: string;
    activatedDescription: string;
    goToActiveAdventure: string;
    favoriteAdd: string;
    favoriteRemove: string;
    /** What a starred adventure is for. */
    favoriteAddHint: string;
    dragHandle: string;
    /** After a session's entry count, for screen readers ("12" alone says nothing). */
    sessionEntryCount: string;
    showEarlierEntries: string;
    showLaterEntries: string;
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
    searchNoMatchesOfType: string;
    searchTypeLabel: string;
    searchTypeAll: string;
    searchTypes: Record<EntryType, string>;
    searchMatchCount: string;
    searchMatchCountOne: string;
    searchMoreResults: string;
    searchEntriesHeading: string;
    backToList: string;
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
    /** A roll's kind when it isn't plain dice: a table, several at once, a table written out. */
    rollSymbol: { tbl: string; gen: string; definition: string };
    /** A table written out in the journal, to the player's own. {name} */
    saveTable: string;
    tableSaved: string;
    /** An answer code's "x" ("Yx"): {answer}. */
    exceptionalAnswer: string;
    /** Phones: the one button that opens the game table. */
    rollMenu: string;
    rollMenuLabel: string;
    /** Its tooltip: says it opens where it was left. */
    rollMenuTitle: string;
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
    /** Zen mode: the journal as a story, without the dice (zenMode.ts). */
    zenOn: string;
    zenOff: string;
    zenBar: string;
    zenHint: string;
    zenExport: string;
    zenExportTitle: string;
    /** Under the exported story's title. */
    htmlStoryNote: string;
    /** Added to the exported story's file name ("La torre - relato.html"). */
    storyFileSuffix: string;
    zenLeave: string;
    zenEmpty: string;
    /** Carrying on in a new adventure with this one's notebook (continueAdventure.ts). */
    continueAdventure: string;
    continueDescription: string;
    continueNameLabel: string;
    continueNameDefault: string;
    continueButton: string;
    /** The new adventure's first note, above its notebook's tags. */
    continuedFrom: string;
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
    entryEdited: string;
    sessionsHeading: string;
    /** The sessions menu button's tooltip. */
    sessionsMenuTitle: string;
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
      diceHeading: string;
      diceHigh: string;
      diceLow: string;
      diceNormal: string;
      diceFew: string;
      diceHint: string;
      featHighRun: string;
      featHighRunNote: string;
      featLowRun: string;
      featLowRunNote: string;
      featTop: string;
      featTopNote: string;
      featBottom: string;
      featBottomNote: string;
      featFavourite: string;
      featFavouriteNote: string;
      sessionBest: string;
      sessionWorst: string;
      /** Across adventures (the journal list's statistics). */
      adventureBest: string;
      adventureWorst: string;
      allDiceButton: string;
      allDiceSubtitle: string;
      allDiceEmpty: string;
      chanceGenerous: string;
      chanceStubborn: string;
      chanceFair: string;
      chanceNote: string;
      sessionsHeading: string;
      sessionsAverage: string;
      sessionsLongest: string;
      sessionsChart: string;
      sessionsBar: string;
      namedHeading: string;
      namedCharacters: string;
      namedPlaces: string;
      namedHint: string;
      diceChartY: string;
      diceChartX: string;
      diceChartXRuns: string;
      sessionsChartLast: string;
      sessionsChartX: string;
      namedTop: string;
      diceCharts: string;
      diceLine: string;
      diceLineRuns: string;
      diceWaiting: string;
      diceWaitingItem: string;
      diceAverage: string;
      diceFace: string;
      diceFaces: string;
      chartHint: string;
      entryOne: string;
      activityHintTap: string;
      dateRange: string;
      singleDate: string;
      /** Roughly how long it was played (journalStats.ts, playMinutes): only here, in the statistics. */
      playTime: string;
      playTimeNote: string;
      sessionsTime: string;
      sessionsBarTime: string;
      hoursMinutes: string;
      hours: string;
      minutes: string;
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
    kindHints: Record<"clock" | "track" | "timer" | "event" | "room" | "foe" | "item" | "wealth" | "deck", string>;
    statuses: Record<"open" | "closed" | "abandoned", string>;
    threadsTitle: string;
    threadsEmpty: string;
    groupThreads: string;
    groupProgress: string;
    groupEvents: string;
    closeThread: string;
    reopenThread: string;
    increase: string;
    decrease: string;
    segmentsLabel: string;
    timerStartLabel: string;
    /** The notebook lists' die: what each one picks from (NPCs only, open threads only). */
    rollListNpcs: string;
    rollListPlaces: string;
    rollListThreads: string;
    /** The name such a roll is logged with, saying what it picked from. */
    rollNameNpcs: string;
    rollNameThreads: string;
    groupCharacters: string;
    groupPlaces: string;
    groupRooms: string;
    groupFoes: string;
    groupItems: string;
    groupWealth: string;
    /** Resource tracking add-on: items and money. */
    inventoryTitle: string;
    inventoryEmpty: string;
    quantityLabel: string;
    /** Whose purse the money is in. */
    ownerLabel: string;
    /** The add-ons' categories, as the app writes and shows them (read in either language). */
    categories: CategoryWords;
    /** "Use one {name}" / "One more {name}". */
    useOne: string;
    addOne: string;
    /** A deck's −/+ count its cards. */
    cardOut: string;
    cardBack: string;
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
    /** Before the kinds an element can be added of ("Add:"). */
    addHeading: string;
    /** {kind} */
    addOfKind: string;
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
    /** Someone not in the notebook as who acts or speaks: only the name is written. */
    suggestOtherName: string;
  };
  error: {
    boundaryTitle: string;
    boundaryDescription: string;
    reload: string;
    /** Copies errorReport (version, screen, browser, the error), never the journal. */
    copyDetails: string;
    copied: string;
    copyFailed: string;
    reportHint: string;
    /** The ideas-and-bugs form (Tally): the report's main way. */
    reportForm: string;
    /** The secondary way, for whoever has a GitHub account. */
    reportOnGithub: string;
    /** The page for an address that isn't one of the app's screens. */
    notFoundTitle: string;
    notFoundDescription: string;
    notFoundHome: string;
    notFoundReport: string;
  };
  /** Code for Intl.DateTimeFormat (date/time formatting). */
  sample: {
    /** Discreet link under "You don't have any adventures yet". */
    offer: string;
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

/**
 * The long texts: help, the quick guide and the sample adventure's script.
 * Their own chunk per language, loaded when they're opened (loadLongTexts),
 * not with the dictionary every screen waits for before its first paint.
 * What shows before opening them (a help's title and button) stays in
 * the Dictionary.
 */
export interface LongTexts {
  sample: {
    name: string;
    /** Its pinned notes (in the .md's front matter). */
    notes: string;
    /** Notebook descriptions, one "[N:Name] text" line each (front matter too). */
    descriptions: string;
    script: SampleLine[];
  };
  diceHelp: {
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
  guide: {
    intro: string;
    writingHeading: string;
    writing: string[];
    /** Each adventure's oracle, dice and tables, and the favourites. */
    gameTableHeading: string;
    gameTableIntro: string;
    gameTable: string[];
    notationHeading: string;
    notationIntro: string;
    notation: GuideRow[];
    tagsHeading: string;
    tagsIntro: string;
    tags: GuideRow[];
    updatesHeading: string;
    updatesIntro: string;
    updates: GuideRow[];
    /** Which of Lonelog's documents the app reads, and which it leaves apart. */
    scopeHeading: string;
    scopeIntro: string;
    scopeUsedLabel: string;
    scopeUsed: GuideRow[];
    scopeApartLabel: string;
    scopeApart: GuideRow[];
    scopeNote: string;
  };
  oracleHelp: {
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
}
