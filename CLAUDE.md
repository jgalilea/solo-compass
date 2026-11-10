# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Solo Compass: a solo-RPG tabletop companion (yes/no oracle, meaning tables,
and a session journal). Browser-only, installable PWA, no backend — all data
lives on the device (IndexedDB + localStorage). The UI is bilingual
(Spanish first, English); see "i18n" below.

**Code comments, test names and commit messages are written in English.**

## Commands

```bash
npm install
npm run dev      # dev server (vite)
npm run build    # tsc -b && vite build -> dist/
npm run preview  # serve the production build
npm run lint      # oxlint
npm test          # vitest (unit tests de src/lib)
npm run test:e2e  # playwright smoke test (builds, then plays the app on phone + desktop)
npm run test:perf # synthetic volume test (years of play, slowed-down phone CPU); not in the deploy
npm run deploy    # manual publish to gh-pages branch (normally unnecessary, see Deploy)
```

Tests are Vitest unit tests next to the module they cover
(`src/lib/*.test.ts`): oracle mechanics, Lonelog export/import, journal
grouping and table data integrity. No component/DOM tests; instead
one Playwright smoke test (`e2e/smoke.e2e.ts`, config in
`playwright.config.ts`) plays the main path (oracle, new adventure,
an entry, a table roll, reload) on a phone and a desktop viewport
against `vite preview`, failing on any console error. The deploy
workflow runs `npm test`, builds, then runs the smoke test, so a
failure in either blocks the publish. Keep its selectors on visible
text/roles in Spanish (the test runs with `locale: "es-ES"`).

`e2e/volume.perf.ts` (config `playwright.perf.config.ts`, run by hand
with `npm run test:perf`) restores a backup with ~11,000 entries and
10,000 rolls and times the main screens on a phone with the CPU 4x
slower, printing each timing. It's why the roll history is paged
(`HistoryView`, 60 at a time as you scroll) and a session's entries
are drawn from the end (`EntryList`, 80 blocks, "earlier entries"
button; whatever is highlighted, edited, selected or written below is
always drawn). Run it after changing how the journal or the history
load or render.

## Deploy

Push to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes `dist/` to GitHub Pages via `actions/deploy-pages`. There is no
staging/preview step — a push to `main` goes live. `base` in
`vite.config.ts` must match the GitHub Pages repo path (`/solo-compass/`).

## Architecture

### Routing and providers (`src/App.tsx`)

`HashRouter` (required for GitHub Pages — no server-side rewrite support).
Routes are flat under one `Layout`: `/` (oracle), `/tablas`, `/diario`
(journal list), `/diario/:adventureId` (adventure detail), `/historial`.
The nav has only three tabs (Oráculo, Tablas, Diario): `/historial` is
reached from "Últimas tiradas" (`RecentRolls`) on the oracle screen and
highlights the Oráculo tab. Theme, mode, language, backup and credits all
live in one header button (`SettingsDialog`). Which adventure rolls are
being logged to is shown in one place only: the header chip
(`ActiveAdventureChip`), the same on every screen.
Context providers are nested in a fixed order in `App.tsx`; `LocaleProvider`
wraps `AppErrorBoundary` (not the other way round) so the error boundary can
render its fallback in the right language even if something below it throws.

### State: context-per-feature, four-file split

Each piece of global state (`Journal`, `History`, `Theme`, `Mode`, `Locale`,
`Oracle`, `CustomTables`) follows the same four-file pattern in `src/hooks/`:

- `useX.ts` — the actual state/logic (the hook body).
- `xContextInstance.ts` — just `createContext(...)`, nothing else.
- `XContext.tsx` — the `<XProvider>` component, wires `useX()` into the
  context.
- `useXContext.ts` — the consumer hook (`useContext(XContext)`).

The context object lives in its own file (not inside the provider component
file) because of the `react/only-export-components` oxlint rule — a file
exporting a component can't also export a non-component value. Follow this
split when adding new global state instead of putting everything in one
file.

### Storage layer (`src/lib/`)

No backend; persistence is split by access pattern, not by feature:

- **IndexedDB** (via `idb-keyval`), for anything that can grow unbounded:
  journal (`journal.ts`), oracle/table roll history (`history.ts`) and
  the player's own tables (`customTables.ts`).
  `localStorage` is ~5 MiB per origin and shared with every other app on the
  same `github.io` subdomain, so it's unsuitable for this.
  Each kind of record (adventures, journal entries, rolls, tables,
  deletions) is a **collection** (`collectionStore.ts`): its own database,
  one record per id, every record read through a `normalize…` function
  that drops what can't be shown (also on restoring a backup). Saving
  writes only what changed (`diffById`), never the whole list: two tabs
  or windows open at once (an installed app and a browser tab) used to
  overwrite each other. The adventures' order is a separate key of ids.
  The first load moves the old layout (one key per whole array) over and
  deletes it; history also migrates once from a legacy `localStorage`
  version. The hooks keep each list with `useStoredList` (latest list in
  a ref, updater run once outside React, then save) and, after saving,
  tell the other tabs through `sync.ts` (BroadcastChannel), which read
  again. New stored data should follow the same pattern.
- **localStorage**, for small settings read synchronously before first
  paint (theme/mode need this to avoid a flash): theme, light/dark mode,
  language, selected oracle and favorite oracle (the app opens with the
  favorite, `initialOracleId`; the last used otherwise), favorite tables, unfolded table blocks,
  folded notebook lists and blocks (`notebookSections.ts`, also the
  session index), whether new scenes are tested, active-adventure
  id (`activeAdventure.ts`, `theme.ts`, `mode.ts`, `tableFavorites.ts`,
  `tableSections.ts`, `notebookSections.ts`, `sceneCheck.ts`).
- **Persistent storage** (`storagePersistence.ts`): the app asks the
  browser (`navigator.storage.persist()`) not to evict its data. Never call
  it silently — Firefox shows its own permission prompt — always behind
  the in-app explanation, and only from Settings (`StorageProtection.tsx`:
  status, button and explanation). The app never offers it on its own
  in the journal or elsewhere — it got in the way of playing.
- **Updates (service worker)**: `registerType: "prompt"` in
  `vite.config.ts`, registered from `UpdatePrompt.tsx`. It checks for a new
  version when the app returns to the foreground and hourly (an installed
  PWA rarely navigates, which is when browsers check on their own), then
  shows an "Actualizar" banner instead of reloading by itself (it could
  drop half-typed text).
- **Safari note** (`safariStorageNote.ts`, `SafariStorageNote.tsx`):
  iPhone/iPad Safari deletes a site's data after 7 days of use without
  visiting it. Only there (not installed, storage not persistent) the
  journal list shows a closable note to install the app, saying the
  installed app starts empty (iOS keeps its storage apart from
  Safari's) and how to carry the backup over.
- **Manifest**: one per language (`vite.config.ts` emits
  `manifest.en.webmanifest` next to the Spanish one, same `id`);
  `LocaleProvider` points `<link rel="manifest">` at the current one.
  The viewport blocks pinch zoom on purpose (native-app feel): keep
  text fields at 16px+ so iOS doesn't zoom into them.
- **Install** (`install.ts`, card in `InstallApp.tsx`): imported early
  from `main.tsx` to catch `beforeinstallprompt` (fires once at load);
  Settings shows the browser's install dialog, menu instructions where
  there's no prompt (Safari, Firefox), or "installed" (standalone mode,
  or a localStorage flag when seen from a browser tab).
- **Backup reminder** (`backupReminder.ts`): last backup time in
  `localStorage`; a gold dot on the Settings button only when there are
  10+ journal entries newer than the last backup and it's 14+ days old,
  snoozed 7 days once Settings is opened. Deliberately no toast or
  dialog.
- **Full backup/restore** (`backup.ts`, wired into `SettingsDialog`): exports
  everything above into one `.json` (download, or "Send" through the
  share sheet, as `.txt` on Chromium), and restores it either by
  **merging** with this device's data (`backupMerge.ts`: union by id,
  newer edit wins via `editedAt`/`updatedAt`/`notesUpdatedAt`) or by
  replacing it; then reloads so every context picks up the result.
  Deletions are recorded by id (`deletions.ts`, also in the backup) so a
  merge doesn't bring back what was deleted on either device: anything
  new that deletes data must call `recordDeletions` (and its undo
  `forgetDeletions`). They're kept for a year.

### Lonelog (`src/lib/lonelog.ts`)

The journal's storage/interchange format is [Lonelog](https://lonelog.itch.io/lonelog)
(spec 1.6.0, source in github.com/zeruhur/lonelog), an open plain-text
notation (`@` action, `?` question, `d:` roll, `=>` consequence,
`=== Title ===` for sessions, `S1 *context*` for scenes). A session
keeps its day of play (`date`, set when it's opened so moving it
doesn't change it; shown in its header by `SessionDate`), written as
a `[Date] 2025-09-03` line below it and read back from that or
Lonelog's other forms (`Date: … | Duration: …`); an imported session
without one has none (`""`), and older ones fall back to their
timestamp (`sessionDate`). Rolls that
carry their own symbol (`tbl:` table, `gen:` generator, a bare
`-> result`) keep it in the roll's text and are written back as is;
the app's own table rolls are `tbl: Name d66=42 -> …` (`formatTableRoll`)
and quick inspiration a `gen:`. Scenes are their own entry kind
(`scene`, text "S4 *Tavern*", numbered by `nextSceneId`, offered in the
composer beside "New session", listed under their session in the
index). A new scene can be tested, optionally (a switch in the
composer, off until turned on): the selected oracle answers "Does the
scene go as I expected?" at Likely, and `sceneVerdict` reads the
answer (expected / altered / interrupted) for the consequence's
placeholder. No rules of its own, so it works with any oracle.
Everything else stays a note and is only *drawn* differently
(`lonelogLines.ts`: `@(Name)` actors, dialogue, `(note: …)` asides,
`\---`…`---\` narrative blocks, the add-ons' `[COMBAT]`/
`[DUNGEON STATUS]`/`[RESOURCES]` markers and `Rd1` rounds; a
consequence never joins a scene or a block marker). The front matter
carries the campaign header (`title`, `start_date`, `last_update`) and
import names the adventure from it (`parseTitleFromMarkdown`). Not
read: Partylog/Lorelog/Maplog/Wargaming (separate systems) and the
Cards add-on (no deck in the app). This module does both directions:

- `exportAdventureToMarkdown` — produces a `.md` valid for any
  Lonelog-compatible tool, not just this app.
- `parseMarkdownToEntries` — deliberately permissive: any line that doesn't
  match a recognized Lonelog symbol (free prose, tags) is kept as a note
  instead of failing the import. Indentation is only visual in Lonelog
  (§2.3): an indented line continues the previous entry unless it starts
  with a symbol (`d:` under its `@` is its own entry); continuation lines
  that start with one are exported escaped with `\`. Code fences (how
  Lonelog wraps notation in digital logs) are skipped.

There's also a read-only **HTML export** (`htmlExport.ts`, theme read
by `htmlExportTheme.ts`): one self-contained page in the theme on
screen (colours as editable CSS variables at the top, display font
embedded), with the notebook beside the journal. Lonelog stays the
interchange format.

### Rolling from several screens (`src/hooks/usePlayActions.ts`)

Asking the oracle and rolling on a table can happen from the Oracle screen,
the Tables screen and an adventure's "game table" (`PlayTools.tsx`:
oracle, tables and dice). All of them go through `usePlayActions`, which
always records to history and, if there's a target adventure (the active
one by default; the game table passes its own adventure id), logs the
Lonelog entries. Don't duplicate that logic in a view.

The game table tools are the same components in two places: a bottom
sheet with tabs opened from the one-row composer (`JournalComposer`,
mobile and tablet; `Modal` with `sheet`, so it stays a bottom sheet on
tablet too) and a fixed right-hand panel (desktop, where the composer
has no tool buttons). The composer's text is an auto-growing textarea:
Enter sends with a fine pointer (Shift+Enter = new line); on touch Enter
is a new line and the send button sends. Its "Dialogue" mode picks who
speaks (the PC, the cast's NPCs or any name) and logs a note in
Lonelog's dialogue form (`formatDialogue`: `N (Odile): "…"`); "In-world
text" is typed as is and logged as a narrative block (`formatExcerpt`). The composer's entry type and the roll a consequence links
to live in `AdventureDetailView`, because both places change them (after
any roll the composer switches to "Consecuencia").

### Sample adventure (`src/lib/sampleAdventure.ts`)

Offered only as a discreet link in the empty-journal state (never
created on its own, and opened without making it active). The script
lives in the dictionaries (`t.sample.script`); rolls are given as dice
and written with the same format as `usePlayActions` (oracle verdict via
`judgeDice` in `oracle.ts`, table results from the real tables, loaded
first with `loadMeaningTables`; quick inspiration as the same `gen:`;
dice formulas written as `rollFormula` writes them), then imported as
Lonelog, with session dates, pinned notes and notebook descriptions
(`t.sample.descriptions`). It's the showcase: it uses every kind of
entry, note form, roll and notebook section, and a test checks it
still does (and keeps both languages' scripts in step). When adding a
visible journal or notebook feature, work it into the sample.

### Notebook: pinned notes, characters and places

Each adventure has a notebook (`AdventureNotebook.tsx`): in the left
column at `xl` (under the session index), a sheet from the adventure
header below that.

- **Pinned notes**: `notes` on `Adventure` (so they ride along in the
  backup). Edited in place, saved after a short pause; `- [ ]` lines
  are tickable checkboxes. Not entries: no date, editing them doesn't
  touch `updatedAt`. In the .md they're the YAML front matter's
  `notes` field (Lonelog §5.1), written and read back by `lonelog.ts`.
- **Descriptions**: free text per character/place/thread,
  `descriptions` on `Adventure` keyed by `castKey`, each with its own
  `updatedAt` (merged one by one). Like the notes, not entries and not
  tags (Lonelog has no description field); in the .md they're a
  `descriptions` front matter field, one `[N:Name] text` line each.
- **Characters and places** are Lonelog tags (`lonelogTags.ts`):
  `[N:…]` NPC, `[PC:…]` PC, `[L:…]` place, `[#N:…]` reference, with
  `+`/`-`/`→`, "HP 6"/"HP-2" stats and `category:` updates. They stay
  in the entry text as written (so they round-trip for free); the
  cast and each element's state are **derived** from the entries
  (`buildCast`), never stored. Tags inside roll entries are roll
  context and are skipped. Adding one or logging a change from the
  notebook writes a tag note in the journal; "Mention" inserts
  `[#N:Name]` into the composer (`insertRef`). Typing `[` in the
  composer or while editing an entry suggests the cast (every kind, no
  limit, in a scrolling list: the last three named first, then
  alphabetical) and offers a new one of any kind
  (`useTagAutocomplete` + `TagSuggestions`; the pure parts,
  `findTagQuery`/`tagOptions`, in `lonelogTags.ts`). The sample
  adventure uses tags and has pinned notes (`t.sample.notes`) and
descriptions (`t.sample.descriptions`).
- **The official add-ons' tags** (derived the same way): rooms
  `[R:4|status|description|exits N:R2]` (first field is the status,
  replaced; `+looted` adds; exits merge by direction), foes
  `[F:Thug A|HP 6|Close]` (range band and `×N` group size replace;
  `foeIsOut` for dead/fled), items `[Inv:Torch|3]`/`[Inv:Torch-1]`
  and money `[Wealth:Gold 45|Silver 12]` (one member per currency),
  both `QUANTITY_KINDS` with −/+ in the notebook's Inventory section.
  A "label value" change keeps the label (`Supply d8→d6`,
  `Supplies:abundant→low`).
- **Threads and progress** are tags too: `[Thread:…|Open]` (one state
  at a time, English or Spanish words, `threadStatus`), clocks
  `[Clock:Name 2/6]` (and the older `[E:…]`), tracks `[Track:…]` and
  timers `[Timer:Name 3]`; the number is read from the name
  (`progress`, also "+1"/"-1"). The notebook's −/+ log the new value as
  an entry (the journal is a record). "Roll on the list" (NPCs, places,
  open threads) logs a `roll` entry and closes the sheet like any roll.

### Journal rendering (`src/components/journalShared.tsx`)

Lonelog is the export format, not the on-screen view: entries render with
an icon per kind, and `buildEntryBlocks` (`src/lib/journalUi.ts`) groups
a question + its roll + the following consequences into one card.
The journal's order is the entries' `timestamp` alone: "Write below"
(an insertion point in `useJournal` that every `addEntry` honours,
tools included) and moving an entry up/down place it between its
neighbours (`journalOrder.ts`), nudging later ones when there's no room.
Oracle answers are colored using the linked history entry, falling back to
parsing the roll text (`splitRollText`) for imported journals. Character
and place tags render as chips (`TaggedText`); tapping one opens it in
the notebook.

### Oracles (`src/lib/oracles.ts`, `oracleEngines.ts`)

Four yes/no oracles, picked from the name next to the Oracle title
(`OracleSwitcher`, saved per device; a star marks the favorite, the
one the app opens with; the game table's `OracleTool` carries the same
switcher and help, so it changes from the journal too): **Recluse** (the default, the
author's favourite; mechanic in `oracle.ts`), **Loner**, **Ironsworn**'s
"Ask the Oracle" and **One Page Solo Engine** v1.6. `oracles.ts` holds
each one's credit and verbatim attribution (all listed in Settings →
About); `oracleEngines.ts` their mechanics, as engines that declare the
dice for a likelihood and how to read the kept ones. Rolling throws
those dice (`rollOracleWith`, called by `usePlayActions`); the help's
odds table (`OracleHelp`) comes from `oracleOdds`, which goes through
every possible throw, so the percentages always match (tested against
the books' numbers). Loner and OPSE offer three likelihoods
(`oracleLevels`; the picker shows only those, `fitLikelihood` maps the
rest to even). A roll keeps its `oracle` and every die (`dice`; old
Recluse rolls only have `white`/`black`, read through `oracleDice`).
Loner's Twist Counter is derived from the history
(`lonerTwistCounter`), never stored apart; the third double rolls its
two twist tables, preloaded while Loner is selected. In the journal an
oracle roll is "Name — dice -> answer" (`formatOracleDice`/
`formatOracleResult`): the "—" is how `splitRollText` tells it from a
table roll. Licences checked: never add an NC one (Mythic, Juice) or
one with no published licence (MUNE).

### Tables (`src/lib/tables.ts`, `tableGames.ts`, `customTables.ts`)

`DiceType` is `"d66"` (two d6 as tens/units) or any `dN`. Tables have an
optional `game` attribution/link, favorites, and search. Built-in tables
come one game at a time, one folding block per game on the Tables screen
(which blocks are open is a per-device localStorage setting,
`tableSections.ts`).

**Each game's data is loaded on its own, never in the main bundle.**
`src/lib/tableData/<game>.ts` holds its tables with both languages side
by side (rows `[from, to, en, es]`, no `es` for proper names); each file
is a separate chunk behind a dynamic `import()` in `TABLE_GAMES`
(`tableGames.ts`). The index there stays small: title, credit, table
count (for the folded block) and which ids are the game's (`owns`, to
find a favourite's game without loading). Loaded games are cached for
the session in a tiny external store (`loadGame`, read with
`useSyncExternalStore`); the service worker precaches every chunk, so it
works offline. Screens say which games they need through
`useMeaningTables(games)`: the Tables screen asks for Solo Compass's
(quick inspiration), unfolded blocks and the favourites' games, and
`"all"` while searching; the game table, the favourites' games until
you search. Never import a data file statically (that pulls it back into
the main bundle); outside React use `loadMeaningTables`. A test keeps
each game's `count` and ids in step with its data. Adding a game: a data
file plus its `TABLE_GAMES` entry.

- Solo Compass's own (`tableData/soloCompass.ts`): original, generic
  tables written for the app (no content copied from licensed games).
  Their ids are listed in `SOLO_COMPASS_TABLE_IDS` (the sample script
  refers to them).
- Third-party tables under an open licence (CC BY or CC BY-SA, never
  NC): Ironsworn, Delve, Starforged, Starsmith (Datasworn), Loner,
  Knave, Cairn (2nd ed., from its GitHub source) and the Lazy GM's
  Resource Document, with our own Spanish
  translation (a translation of a BY-SA text is BY-SA too). Each table
  carries its `game` credit; `TABLE_CREDITS` (Settings → About, and the
  README) holds each source's attribution wording verbatim. Never add
  text that is only CC BY-NC-SA (Starforged's full rulebook, Sundered
  Isles' tables): check each table's licence in Datasworn.
  A third-party game has a `game.tag`: rolls are logged as
  "Ironsworn: Action" (`tableRollName`), since names repeat across games.
  Personal names (given/family) are never translated. A table that is an
  exact copy of another game's is left out (the original game keeps it;
  a test checks it); expanded versions (Starsmith's d300) stay. Within a
  game, identical tables the book gives for different contexts stay too.

Every built-in table has a `theme` (`TABLE_THEMES` in `tables.ts`:
inspiration, plot, characters, names, places…), shared by all games and
named in the dictionary (`tables.themes`). The Tables screen filters by
theme (chips under the search; like searching, it loads every game),
the search matches theme names as well as game names (there and in the
game table), and an unfolded block groups its tables by theme. When
adding a game, give each table the closest existing theme; a test
checks they're all known. The player's own tables can have one too
(optional, picked in the editor; "Temática:"/"Theme:" line in the .md,
`theme` in JSON, read by id or by name in either language).

The player's own tables (`customTables.ts`, state in the
`CustomTables` context) are converted to the same `MeaningTable`
shape (`custom: true`); they're read from IndexedDB only when a table
screen asks (`load`, called by `useMeaningTables`), not at start-up.
`useMeaningTables` returns built-in + custom, so screens never read
either list on their own. Their text format
(editor, import, export) is deliberately permissive: one result per
line, optional leading ranges, list markers, Markdown tables; the .md
export is read back by the same parser (tested). "Quick inspiration"
(`rollInspiration` in `usePlayActions`, given the tables by
`useMeaningTables().inspiration`) rolls Acción + Tema together: two
history rolls, one journal entry.

A table result can ask for more rolls (`resolveResult` in `tables.ts`,
kept light on purpose): "Roll twice"/"Tira dos veces" (and three times,
and Ironsworn's "Roll twice more on this table…") rolls again on the
same table; `{Table name}` inside a result rolls on that table among
the ones currently loaded (mostly for the player's own tables). The
extra results are joined with "→" and "·", never "->" (the journal
splits a roll's text at its last "->").

The game table's dice (`DiceTool`) also take a formula (`rollFormula`
in `diceNotation.ts`): the whole of Lonelog's dice notation add-on, a
small parser over its grammar (arithmetic and parentheses, `{…}`
groups, min/max, exploding with a condition, compounding,
penetrating, rerolls, unique, keep/drop, success pools with failures,
criticals, sorting, every form of description). Modifiers act in the
spec's fixed order; a condition right after `!`/`r`/`u`/`cs`/`cf` is
theirs (`3d10!>=8` explodes on 8+, `3d10>=8!` counts 8+). It's
written so the journal shows each roll die by die like the buttons'
rolls (`✓`/`✗`, `1→4` rerolled, `2↑`/`3↓` min/max, `▲`/`▼`
criticals); in a list of rolls each one keeps its own description
(`splitRollSeries`), and `d66=25 ->` stays a table roll's value, not
a formula. Advantage/disadvantage is a switch for the next roll,
button or formula (`withEdge`: `d20` → `2d20kh1`, anything else
`{F,F}kh1`), then turns itself off. Its "?" (`DiceHelp`, on the shared
`HelpDialog` shell like `OracleHelp`) explains the buttons, how to
read a roll and each formula taken apart, with examples and the line
each leaves; a test rolls every example and checks the exact line, and
that the limits it states hold.

### Journal search and stats

`journalSearch.ts` (every query word, accent-insensitive, in journal
order) is used inside an adventure (header magnifier; jumping unfolds
the session and highlights the entry via `entry-<id>` ids) and across
all journals from the list view (navigates with `state.entryId`).
`journalStats.ts` derives the adventure statistics from entries plus
the linked history, falling back to parsing roll text for imports.
Their heat map (`ActivityHeatmap`) is the last year as one row per
month and one square per day (31 columns fit a phone), with the
longest streak of days in a row. Every date shown for an entry (stats,
heat map, search results, notebook mentions) is its day of play
(`playDay`): its session's date, since everything in a session happens
during it; before any session or in an undated one, the day it was
written, and none for an imported one (`isImportedEntry`: an import's
timestamps are the import's).
Sharing (`share.ts`, Web Share API) is only offered where
`navigator.share` exists and falls back to download on failure.

### Icons and dialogs

Icons are Tabler Icons (`@tabler/icons-react`, MIT, outline, stroke 1.75), wrapped in
`src/components/icons/Icons.tsx` with a `size` prop; pick the closest
Tabler icon instead of drawing SVG or adding another icon set (only the
compass logo is custom). Screens import only from `Icons.tsx`. The
logo (`IconCompass`, a four-point compass rose) is the same drawing as
`public/favicon.svg` and the PWA icons in `public/icons/`; change them
together. Don't write symbols like "+"/"−" as text in UI controls: some
theme display fonts draw "+" as a cross — use the icon. Number
fields use `NumberField` (−/+ icons; the browser's spinners are hidden
in `index.css`, they don't follow the themes). Every
dialog uses `Modal` (portal to `<body>`, closes on Esc and backdrop click):
the sticky desktop header would otherwise clip or cover dialogs rendered
inside it (`backdrop-filter`/z-index stacking). `Modal` owns the panel
frame and its width: every dialog is `size="lg"` (the same width on
desktop; its content goes into columns there rather than staying a
narrow strip), only a question to answer is `sm` (confirmations,
restoring a backup); inside go `DialogHeader` (title, icon, close; fixed) and
`DialogBody` (scrolls) from `Dialog.tsx`. Don't style a panel by hand.

### Responsive

Mobile-first; `md` widens content, `lg` (desktop) moves the nav into a
sticky header (exactly `h-14`; sticky columns below it use `top-14`; a
`1fr auto 1fr` grid so the tabs never shift when the adventure chip
appears),
hides the bottom bar and uses two columns where it helps (oracle
form/result, tables list/result panel). An adventure becomes a workspace:
journal + game table panel at `lg`, plus a session index on the left at
`xl` (below `xl` the same index is a dropdown in the adventure header).
Every block of that left column (sessions, pinned notes, cast, threads,
inventory) folds under its heading (`FoldingHeading`), and each
session's scenes show only for the current one until opened.
Every page uses the same content width as the header
(`max-w-xl md:max-w-3xl lg:max-w-7xl 2xl:max-w-[110rem]`), so switching
tabs doesn't make the content jump; `2xl` means more columns, not
longer lines. The mobile bottom nav has a fixed height
(`--spacing-nav` in `index.css`); anything resting on it (composer,
toasts) offsets by that same variable. Keep the journal free of fixed chrome on phones (one-row composer,
tools in sheets, entry buttons only on tap/hover). Components that live
both in a wide page and in the narrow desktop panel (e.g.
`LikelihoodPicker`) adapt with container queries (`@container`/`@md:`),
not viewport breakpoints. Check changes at phone, tablet and desktop
widths.

The pointer cursor on clickable elements and the keyboard focus ring
(`:focus-visible`, gold outline) come from base rules in `index.css`
(Tailwind v4 sets neither); text fields replace the ring with
`focus:border-gold`. Every button and link still needs its own `hover:`
state (on a selected item, the selection itself is enough). `Modal` moves
focus into the panel, traps Tab and gives focus back on close;
`useDismiss` adds arrow keys and Esc-returns-focus to dropdown menus.
Both keep the page behind from scrolling while open (`scrollLock.ts`,
a counter shared by dialogs and menus), so a menu must fit on screen:
`ActionMenu` opens towards the side with more room and scrolls inside
itself if it's still too long.

Desktop keyboard shortcuts (`src/hooks/useHotkeys.ts`): registered in
`Layout` (screens, `/`, O/T/D, `?`). Their legend (`ShortcutsLegend`)
is part of the quick guide (`GuideDialog`, drawn once by `Layout`,
opened with `openGuide` from `guide.ts`: `?`, Settings and the
adventure's ⋯ menu), which also explains writing in the journal, the
Lonelog notation and the tags; a test checks every example in it does
what it says. Screens don't pass refs up: they mark targets with
`data-hotkey="write"` / `"oracle"` / `"table"` / `"dice"` (space-separated
list) and, where the tool is folded away (composer sheet),
`data-hotkey-open="…"` on the button that opens it. When adding a shortcut,
add it to `ShortcutsLegend` too; new notation or tags go in the guide.

Deleting a journal entry or a history roll is immediate with a "Deshacer"
toast (`Toast` with `action`); `ConfirmDialog` is only for big,
irreversible actions (deleting an adventure, clearing history, restoring
a backup).

### Theming (`src/lib/theme.ts` + `src/index.css`)

Five themes (`fantasia`, `pulp`, `moderno`, `scifi`, `osr`), each a
`:root[data-theme="…"]` block in `src/index.css` redefining CSS custom
properties (`--color-gold`, `--color-parchment`, `--color-ink-*`, etc.) and
`--font-display`. Components never hardcode colors — they use Tailwind
classes (`bg-gold`, `text-parchment`, ...) that resolve to these variables,
so a theme is purely a CSS-variable swap, no component changes. Light mode
is a second, higher-specificity block per theme
(`:root[data-theme="x"][data-mode="light"]`) — mode is independent of theme.
`font-display` (the theme's display font) carries each theme's
character, so it's kept for short names that work as titles, at
`text-base` or larger: screen titles, the adventure title, the logo,
dialog titles, session and scene titles, game blocks and table names,
card headings, empty states, the big oracle button and answer, the
twist, big stat numbers, changelog chapters. Not for running text,
anything smaller than `text-base`, menu items, answer chips, tool
buttons or help headings: some display fonts are hard to read small
and the app gets visually crowded. The HTML export follows the same
rule.
`THEMES` in `theme.ts` must stay in sync with the color values actually
defined in `index.css` (used for the theme-picker swatches). Because some
themes (notably `osr`) map the "gold" accent to a near-white/near-monochrome
color, don't rely on hue alone to signal state (active tab, selection, etc.)
— pair color with a shape/contrast change (e.g. a filled pill), not text
color alone.

### i18n (`src/lib/i18n/`)

`Dictionary` type (`types.ts`) is shared by `locales/es.ts` and
`locales/en.ts` — TypeScript errors if a key is missing from either.
Default language follows the browser (`es` if it starts with "es", else
`en`); a manual pick from the language switcher is saved to `localStorage`
and takes priority. Add new UI strings to both locale files.

### Active vs. paused adventure

Only one adventure can be "active" at a time (tracked by id in
`localStorage`, `activeAdventure.ts`). "Paused" is **not** a stored state —
it's purely a derived display: any non-archived adventure that isn't the
current active one renders as paused. Don't add a `paused` field to the
adventure model; derive it the same way the existing views do.

## Roadmap

`docs/ROADMAP.md` is the internal roadmap (not shown in the app): planned
features, license research for new oracles/tables, known bugs and UI
review findings. Update it when an item ships or priorities change.

## Changelog

`src/lib/changelog.ts` is shown in-app (Settings → About → "Crónica de
cambios"). It's written for curious players, not developers: role-playing
flavor ("Capítulo V · …"), no technical jargon, both languages per entry.
When shipping a user-visible change, add or extend the top entry.
