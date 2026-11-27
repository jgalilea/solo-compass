# Solo Compass · sync relay

The small server behind **Settings → Sync your devices**: a Cloudflare
Worker with one Durable Object (its own SQLite database) per player's
set of devices, on Cloudflare's free plan. It keeps sealed bytes it
can't read: the app encrypts everything with a key derived from the
player's sync code, which never leaves their devices
(`src/lib/syncCrypto.ts`). It holds no secret of its own, so its code
is public like the rest.

- `src/box.ts`: everything a box does (changes, snapshot, limits), plain
  logic tested on its own (`box.test.ts`, run by the app's `npm test`)
  and used by the app's e2e as a fake relay.
- `src/sqlStore.ts`: a box in the Durable Object's SQLite.
- `src/index.ts`: the Worker (origin check, pass hashed, handed to the
  box) and the Durable Object (one box, its expiry alarm).
- The wire format is the app's `src/lib/syncWire.ts`, shared on purpose.

What it keeps of each box: the sealed data (each change with the time
it came in, for the per-minute limit), the pass's SHA-256, the
snapshot's generation and size, and when it expires (half a year
unused; a closed box's marker, a year). No IP addresses, browsers or request logs (`observability` is
off in `wrangler.jsonc`): the app's privacy note and its "How it works"
say so, so keep it that way or change them too.

## Free plan, and what happens past it

100,000 requests a day (Worker and Durable Objects each), 100,000 rows
written a day, 5 million rows read, 5 GB stored. The app sends one
request per exchange (no CORS preflight), gathers changes (3 minutes
after the last one, a quarter of an hour at most: two hours of steady
play are about eight requests), sends nothing when there's nothing to
send and asks again on coming back only after five minutes: about
10–20 requests a day per active player. A box writes one row per change
sent and none to say what's new (its counters are read from the
changes); its own record only when made, folded, closed or, once a
week, to move its expiry. Folding (past 50 changes) rewrites the
snapshot in parts of 1.8 MB, a row each. Past the daily allowance
Cloudflare answers for the Worker (error 1027) until midnight UTC: the
app pauses, says so in Settings, and tries again after the reset.
Nothing is billed on the free plan. `MIN_WAIT` (seconds, in
`wrangler.jsonc`) slows every device down without a new app version.

## Running it locally

```bash
cd relay
npm install
npm run dev        # http://localhost:8787, allowing the app's dev and preview origins
```

Then `VITE_SYNC_RELAY_URL=http://localhost:8787` in the app's
`.env.local` (not committed) and `npm run dev` at the root.

## Deploying (once)

1. A free Cloudflare account. Pick its `*.workers.dev` subdomain with
   care: it's part of the public URL.
2. The first time, by hand from here: `npx wrangler login`, then
   `npm run deploy`. It prints the URL.
3. That URL (`https://solo-compass-sync.<subdomain>.workers.dev`) goes in
   the app's `.env` as `VITE_SYNC_RELAY_URL`, committed: the next deploy
   of the app offers the sync, and the Content Security Policy allows
   that origin.
4. Once `relay/` is on `main`, Cloudflare deploys it on each push from
   then on, with no token in GitHub: **Workers & Pages →
   solo-compass-sync → Settings → Build → Connect** (or, for a Worker
   not made yet, **Create → Import a repository**), this repository:
   - **root directory** `relay`, build command empty (there's no build
     script), deploy command `npx wrangler deploy`;
   - the Worker's name must be `name` in `wrangler.jsonc`
     (`solo-compass-sync`), or the build fails;
   - preview builds off (a preview of the Durable Object would need a
     `previews` block here; none are needed);
   - API token: the one Cloudflare offers (it keeps it);
   - then, under **Settings → Build → Build watch paths**, `relay/*` and
     `src/lib/syncWire.ts`, so only changes to the relay deploy it.
5. Optional: uncomment `ratelimits` in `wrangler.jsonc` (new boxes per
   IP and minute) if the account allows it.

`ALLOWED_ORIGINS` is the app's origin (`https://jgalilea.github.io`): if
the app moves, change it here too.
