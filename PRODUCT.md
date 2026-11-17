# ThesisForge

## What it is

ThesisForge compiles a plain-English market thesis into a weighted, cited basket of
SoDEX spot assets, gates the result on a published risk methodology, and emits an
executable SoDEX order plan whose orders carry the platform Builder Code. Published
theses live in a public gallery and can be followed or copied; copied theses still
route through the platform Builder Code.

## Who it serves

- Crypto-native investors who have a view but don't want to hand-build a portfolio.
- Judges/demo viewers evaluating the product for the SoSoValue / SoDEX Builder Race
  (User Value, Functionality/Demo, Logic/Workflow, Data/API Integration, UX).
- The individual hackathon builder operating it.

## Surface

Operate mode: an app with a compile-first page, a gallery, a portfolio ledger and a
per-thesis proposal screen. It must stay dense, legible and honest — a tool, not a
marketing page.

## Non-negotiable product truths

- Every weight carries a real citation; provenance outranks polish.
- The Builder fee attribution rule: the platform always receives the Builder fee, on
  every order including copied theses. There is no user-facing multi-approval friction.
- A human stays in the confirm loop on execution. Agent autonomy is limited to
  monitoring and proposing rebalances.
- Orders are simulated unless a signing key is configured; the UI must never imply
  otherwise.
- No hidden LLM step in the weight path. Scoring is deterministic and auditable.

## Constraint notes

- Next.js 16 App Router, React 19, Tailwind 4, TypeScript, IBM Plex superfamily.
- Data path: SoSoValue v1 (live with SOSO_API_KEY, fixture fallback without), SoDEX
  public spot tickers keyless.
- Deployment target: Node host with a persistent disk (Render/Railway/Fly) or Vercel
  with KV; the file store writes to `.data/db.json` (env override THESISFORGE_DATA_DIR).
