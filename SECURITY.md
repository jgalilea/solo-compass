# Security

Solo Compass keeps everything in the player's browser. The one part that leaves it is the optional **device sync**, which seals the data with AES-GCM before it reaches a relay that can't read it (`src/lib/syncCrypto.ts`, `relay/`). How it works is described in the README's [Device sync](README.md#device-sync) section.

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately through GitHub instead: **Security → Report a vulnerability** on this repository ([direct link](https://github.com/jgalilea/solo-compass/security/advisories/new)).

Say what you found, how to reproduce it and what it could expose. You'll get an answer within a week. Once it's fixed and released, you'll be credited in the advisory if you'd like to be.

## What's in scope

- The web app at <https://jgalilea.github.io/solo-compass/> and this repository's code.
- The sync relay: its encryption, the box's code, what it stores and what it could reveal.
- Files handed to the app (journals, tables, backups) that could run code, hang the tab or corrupt stored data.

Only the latest release is supported.
