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
npm run deploy    # manual publish to gh-pages branch (normally unnecessary, see Deploy)
```

Tests are Vitest unit tests next to the module they cover
(`src/lib/*.test.ts`): oracle mechanics, Lonelog export/import, journal
grouping and table data integrity. No component/DOM tests. The deploy
workflow runs `npm test` before building, so a failing test blocks the
publish.

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
  History auto-migrates once from a legacy `localStorage` version if found.
- **localStorage**, for small settings read synchronously before first
  paint (theme/mode need this to avoid a flash): theme, light/dark mode,
  language, selected oracle, favorite tables, active-adventure id
  (`activeAdventure.ts`, `theme.ts`, `mode.ts`, `tableFavorites.ts`).
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
  everything above into one `.json`, and can restore it (overwriting
  current data, then reloading the app so every context picks up the
  restored state).

### Lonelog (`src/lib/lonelog.ts`)

The journal's storage/interchange format is [Lonelog](https://lonelog.itch.io/lonelog),
an open plain-text notation (`@` action, `?` question, `d:` roll, `=>`
consequence, `=== Title ===` for sessions). This module does both
directions:

- `exportAdventureToMarkdown` — produces a `.md` valid for any
  Lonelog-compatible tool, not just this app.
- `parseMarkdownToEntries` — deliberately permissive: any line that doesn't
  match a recognized Lonelog symbol (free prose, `[N:...]` NPC/place/clock
  tags this app doesn't interpret yet) is kept as a note instead of failing
  the import.

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
is a new line and the send button sends. The composer's entry type and the roll a consequence links
to live in `AdventureDetailView`, because both places change them (after
any roll the composer switches to "Consecuencia").

### Sample adventure (`src/lib/sampleAdventure.ts`)

Offered only as a discreet link in the empty-journal state (never
created on its own, and opened without making it active). The script
lives in the dictionaries (`t.sample.script`); rolls are given as dice
and written with the same format as `usePlayActions` (oracle verdict via
`judgeDice` in `oracle.ts`, table results from the real tables), then
imported as Lonelog. A test keeps both languages' scripts in step.

### Journal rendering (`src/components/journalShared.tsx`)

Lonelog is the export format, not the on-screen view: entries render with
an icon per kind, and `buildEntryBlocks` (`src/lib/journalUi.ts`) groups
a question + its roll + the following consequences into one card.
Oracle answers are colored using the linked history entry, falling back to
parsing the roll text (`splitRollText`) for imported journals.

### Oracles (`src/lib/oracles.ts`)

Oracle selection is already a registry (id, name, author, license, link)
even though only one oracle (**Recluse**, by Graven Utterance, CC BY 4.0) is
implemented today. Its roll mechanic (white vs. black die, "pero"/"y"
qualifiers on low/high ties, contradiction on an exact tie, extra dice for
skewed likelihood) lives in `src/lib/oracle.ts` and is called directly
(via `usePlayActions`) rather than dispatched by oracle id — when a second
oracle is added, that dispatch is the thing to introduce.

### Tables (`src/lib/tables.ts`, `src/lib/customTables.ts`)

`DiceType` is `"d66"` (two d6 as tens/units) or any `dN`. Tables have an
optional `game` attribution/link, favorites, and search. Built-in tables
are original, generic tables written for the app (no content copied from
licensed games); their texts live in the locale dictionaries
(`tables.entries`, one string per die value in order). Adding a built-in
table is a data change, not a structural one.

The player's own tables (`customTables.ts`, state in the
`CustomTables` context) are converted to the same `MeaningTable`
shape (`custom: true`); `useMeaningTables` returns built-in + custom,
so screens never read either list on their own. Their text format
(editor, import, export) is deliberately permissive: one result per
line, optional leading ranges, list markers, Markdown tables; the .md
export is read back by the same parser (tested). "Quick inspiration"
(`rollInspiration` in `usePlayActions`) rolls Acción + Tema together:
two history rolls, one journal entry.

### Journal search and stats

`journalSearch.ts` (every query word, accent-insensitive, in journal
order) is used inside an adventure (header magnifier; jumping unfolds
the session and highlights the entry via `entry-<id>` ids) and across
all journals from the list view (navigates with `state.entryId`).
`journalStats.ts` derives the adventure statistics from entries plus
the linked history, falling back to parsing roll text for imports.
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
theme display fonts draw "+" as a cross — use the icon. Every
dialog uses `Modal` (portal to `<body>`, closes on Esc and backdrop click):
the sticky desktop header would otherwise clip or cover dialogs rendered
inside it (`backdrop-filter`/z-index stacking).

### Responsive

Mobile-first; `md` widens content, `lg` (desktop) moves the nav into a
sticky header (exactly `h-14`; sticky columns below it use `top-14`; a
`1fr auto 1fr` grid so the tabs never shift when the adventure chip
appears),
hides the bottom bar and uses two columns where it helps (oracle
form/result, tables list/result panel). An adventure becomes a workspace:
journal + game table panel at `lg`, plus a session index on the left at
`xl` (below `xl` the same index is a dropdown in the adventure header).
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

Desktop keyboard shortcuts (`src/hooks/useHotkeys.ts`, legend in Settings,
`?` opens it): registered in `Layout` (screens, `/`, O/T/D) and
`SettingsDialog` (`?`). Screens don't pass refs up: they mark targets with
`data-hotkey="write"` / `"oracle"` / `"table"` / `"dice"` (space-separated
list) and, where the tool is folded away (composer sheet),
`data-hotkey-open="…"` on the button that opens it. When adding a shortcut,
add it to `ShortcutsLegend` too.

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
