# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Solo Compass: a solo-RPG tabletop companion (yes/no oracle, meaning tables,
and a session journal). Browser-only, installable PWA, no backend — all data
lives on the device (IndexedDB + localStorage). Español is the primary
language of the UI, code comments, and commit messages; see "Idioma" below
for the i18n mechanism.

## Commands

```bash
npm install
npm run dev      # dev server (vite)
npm run build    # tsc -b && vite build -> dist/
npm run preview  # serve the production build
npm run lint      # oxlint
npm run deploy    # manual publish to gh-pages branch (normally unnecessary, see Deploy)
```

There is no test suite/framework configured in this repo.

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
live in one header button (`SettingsDialog`).
Context providers are nested in a fixed order in `App.tsx`; `LocaleProvider`
wraps `AppErrorBoundary` (not the other way round) so the error boundary can
render its fallback in the right language even if something below it throws.

### State: context-per-feature, four-file split

Each piece of global state (`Journal`, `History`, `Theme`, `Mode`, `Locale`,
`Oracle`) follows the same four-file pattern in `src/hooks/`:

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
  journal (`journal.ts`) and oracle/table roll history (`history.ts`).
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
  the in-app explanation (`StorageProtection.tsx`: a one-time prompt once
  the first adventure exists, plus a status/retry block in Settings).
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
the Tables screen and the journal's bottom composer (`JournalComposer`, the
"game table" of an adventure). All three go through `usePlayActions`, which
always records to history and, if there's a target adventure (the active
one by default; the composer passes its own adventure id), logs the
Lonelog entries. Don't duplicate that logic in a view.

### Journal rendering (`src/components/journalShared.tsx`)

Lonelog is the export format, not the on-screen view: entries render with
a Heroicon per kind, and `buildEntryBlocks` (`src/lib/journalUi.ts`) groups
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

### Tables (`src/lib/tables.ts`)

Structure supports d6/d66/d20 tables with an optional `game`
attribution/link, favorites, and search. Seeded with original, generic
tables written for the app (no content copied from licensed games); their
texts live in the locale dictionaries (`tables.entries`, one string per die
value in order). Adding a table is a data change, not a structural one.

### Icons and dialogs

Icons are Heroicons (`@heroicons/react`, outline 24), wrapped in
`src/components/icons/Icons.tsx` with a `size` prop; pick the closest
Heroicon instead of drawing SVG (only the compass logo is custom). Every
dialog uses `Modal` (portal to `<body>`, closes on Esc and backdrop click):
the sticky desktop header would otherwise clip or cover dialogs rendered
inside it (`backdrop-filter`/z-index stacking).

### Responsive

Mobile-first; `md` widens content, `lg` (desktop) moves the nav into a
sticky header, hides the bottom bar and uses two columns where it helps
(oracle form/result, tables list/result panel). Check changes at phone,
tablet and desktop widths.

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

## Changelog

`src/lib/changelog.ts` is shown in-app (Settings → About → "Crónica de
cambios"). It's written for curious players, not developers: role-playing
flavor ("Capítulo V · …"), no technical jargon, both languages per entry.
When shipping a user-visible change, add or extend the top entry.
