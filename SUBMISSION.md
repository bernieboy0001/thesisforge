# ThesisForge — Builder Race submission

**Project name:** ThesisForge
**One line:** Describe a crypto thesis in plain English — ThesisForge compiles it into a cited, executable index basket, holds it to a published risk methodology, and executes it on SoDEX with the platform Builder Code on every order.

---

## 1. Project overview

**Target users**
- Crypto-native investors and researchers who have a view but don't want to assemble an index leg by leg.
- SoDEX traders and copy-desk participants who want to follow an evidence, not a guru.
- The teams judging this race: SoSoValue (structured data/news), SoSoValueIndexes (index methodology), SoDEX (execution).

**What it does**
1. **Describe** — one plain-English sentence ("Long AI infrastructure: inference demand is outrunning GPU supply…"). No tickers, no weights.
2. **Compile** — a deterministic pipeline (no LLM in the weight path) fuses SoSoValue live feeds (`news/search`, `news/hot`, `etfs/summary-history`, `sector-spotlight`, published SSI indices with constituents, `macro/events`, intersected with SoDEX live symbol listings) into a scored allocation under a published formula: `(0.40·alignment + 0.25·flow + 0.20·momentum + 0.15·liquidity) × (1 − riskPenalty)`, softmax → 28%/asset cap → <2% dust pruned.
3. **Gate** — hard risk checks: concentration, breadth, meme exposure, sector concentration, tokenised-equity exposure, evidence coverage, SoDEX routability. A failed gate is visible *before* execution.
4. **Execute** — SoDEX spot legs with numeric symbolIDs, every order tagged with the platform Builder Code.
5. **Rebalance** — drift past 3% triggers a solve-to-target rebalance (0.5% dust floor), fees counted only on the sell side — exactly as SoDEX charges them.
6. **Publish & copy** — theses keep their full citation trail; copied theses route through the platform Builder Code too. Authors keep followers, copies, and credit.

**Core APIs and data sources**
| Source | Role |
|---|---|
| SoSoValue v1 (`news/search`, `news/hot`, `news/pick`, `currencies/sector-spotlight`, `etfs/summary-history`, `indices` + `/constituents`, `macro/events`) | Evidence for every weight; normalized into numbered citations. |
| SoDEX v1 spot (`/spot/markets/symbols`, `ticker`, orderbook) | Universe routing (only listed spot pairs enter a basket); live pricing; order plan build. |
| IBM Plex type system · dossier design system | UI: thesis ledger, citation chips, risk "REFUSE/CLEAR" stamps. |

**Brand assets** (submission form thumbnail, repo avatar, slides): `public/brand/` — `thesisforge-icon-1024.png` (square icon), `thesisforge-mark.svg` (transparent mark), `thesisforge-mark-ink.svg` (on light), `thesisforge-lockup-1920.png` (full wordmark card). Regenerate rasters with `node scripts/make-brand-assets.mjs`.

---

## 2. Public GitHub repository

https://github.com/bernieboy0001/thesisforge

README with setup: clone → `npm install` → `npm run dev`. No keys required; without `SOSO_API_KEY` the app runs on a bundled demo dataset and badges itself honestly. `npm run check:soso` probes the live SoSoValue endpoints.

---

## 3. Demo

**https://thesisforge-rerunjago.vercel.app**

Live SoSoValue feeds; gallery of published theses; compile → risk gate → order plan → portfolio drift tracking and rebalancing. Orders are recorded as `simulated` (no signing key configured in the public deployment), clearly labelled in the UI — the Builder Code attribution rule applies regardless.

---

## 4. Video introduction

Two clips in `videos/`:
- `thesisforge-explainer/renders/video.mp4` (45s) — the idea, the core workflow, the user value. Recorded with storyboard-first approval. This is the submission's video introduction.
- `thesisforge-demo/renders/video.mp4` (1:45) — the product doing the work: live compile, REFUSE gate, honest CLEAR compile, Builder Code execution ticket, publish → copy → rebalance ledger.

---

## 5. Team

Solo — Delight, founder/builder. Contact via the platform.

---

## 6. Wave progress update

**Since the last checkpoint, this wave shipped:**
- **Live SoSoValue wiring** — key provisioned in production; nine-endpoint contract (`news/search`, `news/hot`, `news/pick`, `sector-spotlight`, BTC/ETH `etfs/summary-history`, `indices`, `indices/{ticker}/constituents`, `macro/events`) verified and hardened: multi-keyword `news/search` goes In-Parallel then unions; ETF flows read the real `total_net_inflow` field; sector spotlight maps name-slugs onto universe tickers; live items without tagged currencies get alias-detected; bearish headlines never count as evidence.
- **Production deployment** — Vercel, SSO publicly off for production, GitHub-connected push-to-deploy; dual-mode store (file locally, Upstash/Vercel KV on Vercel) with file-backend fallback that never 500s the guest flow.
- **Honesty surface** — the compiler categorically refuses a thesis when the evidence fails (e.g. AI-semis at 66% tokenised equity gets REFUSE); the UI states it rather than hiding it; spot-buy fee exemption is in the product copy and docs.
- **Full UI redesign** — "index desk, printed at night" dossier world: Plex superfamily, warm-ink on paper-navy ramp, brass #CEA45D reserved for the signature artifact ([n] footnote chips), IBM Plex Mono chrome for data; finished by an end-to-end design review (impeccable/unslop style) that lifted contrast to ≥4.5:1, retired gradient chrome and glow, and passed the production recapture audit.
- **Two storyboard-first, rendered videos** — the 45s explainer (idea, workflow, value) and 1:45 product demo (live compile → REFUSE → CLEAR → execution ticket → gallery → ledger rebalance), captured from the live app; Kokoro `am_michael`, burned-in captions, dossier design tokens throughout.
- **Attribution** — every order in the demo carries `{id, fee}` with the spot-buy-exemption called out; caps respected (2% spot / 0.2% perps); formula values and evidence stored on every weight for audit.

**Demo of record / live URL:** https://thesisforge-rerunjago.vercel.app
