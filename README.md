# ThesisForge

**Describe a thesis. Get a cited, executable index.**

ThesisForge compiles a plain-English market view into a weighted basket, attaches the SoSoValue evidence behind
every weight, gates the result on risk, and builds a SoDEX order plan where each leg carries the platform
[Builder Code](https://docs.sodex.com/for-developers/developers/trading/builder-codes-in-trading).

It is an **index compiler**, not another single-portfolio agent: a thesis can be published, followed and copied, and
every copy still executes through the platform's Builder Code.

```
thesis ──► SoSoValue feeds ──► citations ──► signals ──► weights ──► risk gate ──► SoDEX plan
                                                                                    │
                                                                publish ◄───────────┘
                                                                   │
                                                          gallery → copy → rebalance
```

## Run it

```bash
npm install
npm run dev
```

No keys required. Without `SOSO_API_KEY` the app serves `lib/fixtures.ts` (shaped exactly like SoSoValue v1 responses)
and badges itself **Demo dataset** in the UI. SoDEX public tickers are keyless, so pricing is live even in demo mode.

To go live:

```bash
cp .env.example .env.local
# SOSO_API_KEY=...            free tier: sosovalue.com/developer
# SODEX_BUILDER_ID=...        builder account id (needs >= 100 vUSDC in Spot and Perps)
# SODEX_ACCOUNT_ID=...        trading account id
```

With a key in place, `npm run check:soso` probes every endpoint the compiler depends on (`news/search`, `news/hot`,
`news/pick`, `sector-spotlight`, `etfs/summary-history` for BTC and ETH, `indices`, one `constituents` lookup,
`macro/events`) and prints the envelope code, latency and first record of each, so a response-shape mismatch surfaces
as a failed probe instead of as silently empty citations. Currently green (9/9).

Contract quirks the compiler handles, so live behaviour matches the fixtures:

- `news/search` ANDs its terms — a six-word thesis returns `total=0`. `lib/sosovalue.ts` therefore probes the first
  few distinctive terms in **parallel** and unions the results, deduplicated by id.
- News items often have `title: null` (they're tagged tweets). Their `matched_currencies` tags are used, with
  separators stripped (`MAG7.SSI` → `MAG7SSI`), and the title falls back to the first words of the body.
- Items without tags get their symbols **detected** from title/body via the same alias table the scorer uses
  (`lib/citations.ts#detectSymbols`), so citations attach to assets with or without feed tags.
- `/indices` returns a bare string array (`["ssiDeFi", …]`); constituents carry lowercase name slugs
  (`bitcoin`, `binance-coin`, `fetch-ai`) mapped onto universe tickers (`lib/assets.ts#nameToTicker`).
- `sector-spotlight` reports `change_pct_24h` as a fraction (×100 to display), publishes no 7d figure (the spot
  momentum term reuses 24h), and carries no symbols — membership comes from a static slug→ticker map.
- `etfs/summary-history` reports `total_net_inflow` in USD.
- `macro/events` is grouped by date (`{date, events[]}`) and gets flattened.
- Bearish headlines ("underperform", "unwind", "sell-off", "wipeout" …) never count as evidence — they stay in the
  source trail and grant zero alignment credit or membership.

Live mode does not flatter every thesis: the AI-semis example fails its own risk gate at 77% tokenised equity and
says so, and "core beta" shrinks to ~4–5 legs when the tape has nothing bullish for it. The compile is honest either
way; `SOSO_API_KEY` only changes the data, not the rules.

## Network-aware universe

SoDEX defaults to **mainnet**. The compiler fetches `GET /api/v1/spot/markets/symbols` and intersects the curated
universe with the pairs that network actually lists, so it never weights an asset it cannot route.

Anything the thesis asked for but the venue does not list is reported rather than silently dropped: it lands in
`Basket.excluded` and is rendered as a notice on the proposal screen. On today's mainnet that means:

- Tradable: majors, `MAG7ssi` / `DEFIssi` / `MEMEssi` / `USSI` index tokens, `XAUt` gold, and tokenised AI/semiconductor
  equity (`NVDA`, `AMD`, `TSM`, `MU`, `SMH`).
- Not listed on either network: `RENDER`, `TAO`, `FET`, `AR`, `ONDO`. An "AI infrastructure" thesis therefore routes
  into tokenised semis instead of inventing a pair.

Set `SODEX_NETWORK=testnet` to switch; testnet only lists a handful of pairs, so expect a shorter basket.

A pair can be listed without a live ticker (`vAMD_vUSDC` is one). Those legs are priced from a reference snapshot and
the order plan names them explicitly — `8/9 legs live-priced · fallback: AMD` — rather than claiming a live quote.

## The five-step pipeline

| Step | What happens | Where |
| --- | --- | --- |
| 1. Retrieve | `news/search`, `news/hot`, `currencies/sector-spotlight`, `etfs/summary-history` (BTC + ETH), `indices`, `indices/{ticker}/constituents`, `macro/events`, `sodex/spot/markets/symbols` | `lib/sosovalue.ts`, `lib/sodex.ts` |
| 2. Cite | Every item is normalised into a numbered `Citation` with title, publisher, link, timestamp and the symbols it actually mentions | `lib/citations.ts` |
| 3. Score | `(0.40·alignment + 0.25·flow + 0.20·momentum + 0.15·liquidity) × (1 − riskPenalty)` | `lib/basket-engine.ts` |
| 4. Risk | Concentration, breadth, meme exposure, sector concentration, tokenised-equity exposure, evidence coverage, executable pairs | `lib/basket-engine.ts` |
| 5. Execute | Price legs from SoDEX tickers, resolve numeric `symbolID`s, attach `{ id, fee }`, emit the batch payload and the `ApproveBuilderFeeAction` typed data | `lib/sodex.ts` |

Weights are then softmaxed (T=5), capped at 28% per asset, pruned below 2% dust and renormalised. The formula and the
inputs for every asset are stored with the thesis, so a rebuild against the same data reproduces the same weights —
there is no hidden language-model step in the weight path.

Membership requires evidence. The softmax tail used to buy whatever was liquid, which is how a "treasuries + gold" thesis
ended up holding NVDA. A name may now only enter the basket if the thesis names it (a thesis term hits its aliases,
matched longest-first so `solana` does not also count as `sol`), a retrieved non-bearish source covers it, or it sits in
the published index closest to the thesis. Anything else is skipped and the summary says so — `17 liquid names skipped:
no thesis evidence.`

Exclusion runs in both directions. A clause that rules out a theme ("avoids meme risk") is stripped before keyword
matching *and* removes the matching assets from the universe entirely, listed in `Basket.excluded` as ruled out by the
thesis — a bearish meme-basket headline can never become silent evidence for buying DOGE. Positive evidence likewise
ignores bearish headlines: a story saying the theme failed ("underperform", "unwind", "sell-off", "wipeout") stays in
the source trail but grants no alignment credit and no membership. Case-insensitive symbol resolution keeps mixed-case
venue tickers (`XAUt`, `MAG7ssi`) in the universe, and citations are linked to assets case-insensitively.

## Fee reality (important)

SoDEX collects builder fees in the **quote or collateral asset**, applies them to **both sides of perp trades**, and
**does not charge them on the buying side of spot trades** (max 2% spot, 0.2% perps, `fee` is in tenths of a basis point).

Consequences, stated in the product rather than glossed over:

- A fresh **spot** basket earns `$0` on entry.
- The **rebalance loop and exits** are where spot fees accrue.
- Perps would earn on both entry and exit, but this build ships **spot-only**: the public perp market endpoints are not
  documented (`/api/v1/perp/markets/*` 404s), so no perp leg is ever proposed.

That is why the product ships with drift tracking and a 3%-band rebalance engine instead of stopping at the first fill:
the band is the trigger, then the batch is solved back to target so drift converges instead of lingering just under the
threshold.

## Demoing drift

Real markets move slowly, so the portfolio has a **Simulate move** action (`POST /api/positions/:id/simulate`). It
applies a fresh deterministic price snapshot (seeded, ±35%) and searches seeds until at least one leg clears the 3%
band, so a live demo never stalls at 2.4% drift. Every affected screen labels the valuation as `live` or `simulated`,
and a rebalance prices against a fixed snapshot so drift converges to ~0 once the delta legs land.

## Attribution rule

The platform always receives the Builder fee, on every order routed through ThesisForge — including copied theses.
Authors keep followers, copy counts and social proof. No multi-approval friction for users: one
`ApproveBuilderFeeAction` signature with the master wallet covers the builder id.

## Routes

| Route | Purpose |
| --- | --- |
| `POST /api/thesis` | Compile a prompt into a thesis (spot) |
| `GET /api/thesis/:id` | Fetch a thesis |
| `POST /api/thesis/:id/publish` | Publish to the gallery |
| `GET /api/gallery` | Published theses, ranked by follows + copies |
| `POST /api/gallery/:id/follow` · `/copy` | Social counters; copy routes back to the proposal |
| `POST /api/execute` | Build the order plan, record simulated orders + a position |
| `POST /api/rebalance` | Measure drift; a 3% band triggers a solve-to-target batch (0.5% dust floor) |
| `POST /api/positions/:id/simulate` | Apply a deterministic market move for demoing drift |
| `GET /api/stats` | Aggregate counters + live price status |

## Storage

`.data/db.json`, behind `lib/store.ts` (cached in `globalThis`, mutations serialised through a queue). It survives
dev restarts and is trivially inspectable. The interface is intentionally small so it can be swapped for Postgres or
Supabase without touching the routes.

## What is deliberately not wired

Live order submission. Building a correct batch payload and a correct EIP-712 approval object is verifiable;
guessing at master-wallet signing without a funded account is not. Orders are therefore recorded as `simulated`,
and `SODEX_LIVE` is documented as a gate rather than a switch that pretends to work.

## Stack

Next.js 16 (App Router, route handlers) · React 19 · Tailwind 4 · TypeScript. No database, no ORM, no auth.
