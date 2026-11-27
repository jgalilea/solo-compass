# Contributing to Solo Compass

Thanks for wanting to help. Solo Compass is a small project with one maintainer, so a little care up front saves everybody time. Issues and pull requests are welcome in **Spanish or English**.

## Ways to help

- **Report a bug** or **suggest an idea** with the [issue forms](https://github.com/jgalilea/solo-compass/issues/new/choose). No GitHub account? The app has a short form in Settings → About.
- **Suggest tables or an oracle** from a game with an open licence (see [Game content and licences](#game-content-and-licences)).
- **Improve a translation**: the Spanish and English texts are in `src/lib/i18n/locales/`.
- **Send code**: for anything bigger than a small fix, open an issue first so we can agree on the approach before you put time into it.

Found a security problem (in the device sync, say)? Don't open an issue: see [SECURITY.md](SECURITY.md).

## What the app is, and isn't

A few principles shape every decision. A change that goes against them won't be merged, however well made:

- **The player's data stays in their browser.** No accounts, no backend, no analytics. The app makes no request outside its own origin except the optional device sync, which only carries encrypted bytes. No new external requests, trackers, CDNs or web fonts.
- **Content under an open licence only**, credited the way its licence asks.
- **It works offline** and is installable; a new screen loads in its own chunk, not in the first screen's bundle.
- **Accessible**: keyboard, screen readers, 4.5:1 contrast in every theme and mode, reduced motion respected.
- **Bilingual**: Spanish first, English always alongside.

## Getting set up

You need **Node.js 24** and npm.

```bash
git clone https://github.com/<you>/solo-compass.git
cd solo-compass
npm install                  # also sets up git blame (scripts/git-setup.mjs)
npm install --prefix relay   # the sync relay's types, which lint needs
npx playwright install chromium
npm run dev                  # http://localhost:5173/solo-compass/
```

Device sync only appears in a build whose `.env` names a relay (`VITE_SYNC_RELAY_URL`). To work on it locally, run `npm run dev` in `relay/` and start the app with `VITE_SYNC_RELAY_URL=http://localhost:8787`.

## Before you open a pull request

CI runs all of these, and a pull request can't be merged until they pass:

```bash
npm run lint          # oxlint, type-aware
npm run format        # oxfmt; CI runs format:check
npm test              # unit tests (Vitest)
npm run build         # type-check and build
npm run test:e2e      # Playwright on a phone and a desktop viewport, plus axe
```

Your editor can do most of this as you go: the repository recommends the oxc extension for VS Code (format on save, lint as you type) and has an `.editorconfig`.

Check the change at **phone, tablet and desktop widths**, in **light and dark**, and in **both languages**.

## How the code is written

[`CLAUDE.md`](CLAUDE.md) is the full guide to the architecture: state, storage, routing, the journal's Lonelog format, theming and layout. It's written for AI coding assistants, but it's the best map of the code for people too. In short:

- **Code comments, test names and commit messages in English**; the UI in Spanish and English.
- **TypeScript is strict**, `noUncheckedIndexedAccess` included: use `!` only where a check or the pattern guarantees the value, and handle the missing case otherwise.
- **UI text** goes in both `locales/es.ts` and `locales/en.ts`. They share one `Dictionary` type, so a missing key won't compile.
- **Colours** come from the theme's tokens (`bg-gold`, `text-parchment`…), never hard-coded. Secondary text is `text-parchment-faint`.
- **Icons** are [Tabler Icons](https://tabler.io/icons) only, one module per icon in `src/components/icons/set/`.
- **Dialogs** use `Modal` and the pieces in `Dialog.tsx`; on/off options use `Switch`.
- **Stored data** goes in IndexedDB collections (`collectionStore.ts`), never whole arrays. Anything new that deletes data records its deletions, so a backup merge or a sync doesn't bring it back.
- **Tests** sit next to the module they cover (`src/lib/*.test.ts`). Browser tests in `e2e/` find elements by their visible Spanish text and roles.

## Game content and licences

Tables and oracles from other games can only be added under **CC BY or CC BY-SA** (never NC, "non-commercial"), or with the author's written permission. Each table carries its game's credit, and the attribution wording goes verbatim in `src/lib/tableCredits.ts` (or `oracles.ts`). A translation of a CC BY-SA text is CC BY-SA too. Personal names are never translated.

Each game's tables live in their own file, `src/lib/tableData/<game>.ts`, loaded only when needed. `CLAUDE.md` explains how to add one.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep each pull request to one change; small ones are reviewed sooner.
3. Fill in the template. Mention the issue it closes ("Closes #12").
4. GitHub Actions doesn't run on a pull request from someone outside the project until the maintainer approves it, so the checks may take a moment to start.
5. Every pull request needs the maintainer's review and approval to be merged. It's squash-merged into `main`, which goes live straight away.

You don't need to bump the version or write the in-app changelog: the maintainer does that when releasing.

## Licence

Solo Compass is [GPL-3.0](LICENSE). By contributing, you agree that your contribution is released under the same licence.

## Code of conduct

Be kind and assume good faith. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
