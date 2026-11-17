# ThesisForge — design world

## The world

**The index desk's reference document, printed at night.** Warm off-white ink on a
graphite-navy paper ramp. Everything is a document: the artifact is a handed, cited
dossier slip, not a dashboard tile. Green means pass or fill — nothing else. Brass is
reserved for exactly one job: the signature artifact — the composed basket, its
footnote markers, and the primary compile action.

## Tokens (app/globals.css)

| Role | Value |
|---|---|
| `--color-bg` | `#13151b` page paper |
| `--color-surface` | `#181a21` raised sheet |
| `--color-surface-2` | `#1e2028` sheet on sheet |
| `--color-surface-3` | `#252833` hover step |
| `--color-line` / `--color-line-2` | `rgba(236,232,220,0.09)` / `0.17` hairlines |
| `--color-ink` / `--color-muted` / `--color-faint` | `#ece8dc` / `#b0ab9c` / `#8f8b7f` |
| `--color-accent` (brass) | `#cea45d` — signature artifact only |
| `--color-ok` / `--color-warn` / `--color-danger` / `--color-info` | pass / caution / refuse / neutral info |

## Type

- **IBM Plex Sans** — UI text. 400/500/600 weights, 14px base, sentence case only.
- **IBM Plex Serif** — display only: page theses and headlines (the printed-document
  voice). Never use it for controls or body copy.
- **IBM Plex Mono** — data only: prices, weights, times, IDs, tickers, counters with
  `tabular-nums`. Never for labels or prose.

## Signature

The brass-outlined **[n]** footnote chip (`.fn`). Every weight carries the number of
its evidence; the source trail is numbered to match. The index is a document with
footnotes — that is the whole product in one glyph.

## Components & rules

- `.card` = a raised sheet (soft 10px radius, hairline border, offset+blur shadow).
- `SectionLabel` = sentence-case semibold label with a hairline rule below — never a
  tracked all-caps kicker.
- `.fn` chips in brass for citations; `[done]`/`[ ]` mono markers for stepped flows.
- Stacked **CompositionBar** on cards/baskets: top holding in brass, the rest in
  descending ink opacity steps. Ranked reading, no legend box.
- **RiskPanel** renders the verdict as a rotated committee stamp (CLEAR / CAUTION /
  REFUSE), double-ring inset, before any approve button.
- No glow, no gradient text, no kickers, no emoji icons, no pill buttons. Icons are
  single-stroke 1.3–1.6 drawn SVG in currentColor.
- Focus rings are brass outlines (`2px rgba(206,164,93,0.6)`, offset 2px); caret is
  brass; selection is brass 32%.
- Motion: one fade/rise on main content, `prefers-reduced-motion` respected, no other
  entrance choreography.
- Depth from surface steps and hairlines; shadows are soft with an offset. The 1–2px
  black lip was deliberately retired.

## What changed from the incumbent

Was: near-black + green + glow grid + pill chrome + uppercase tracked micro labels +
all-mono UI. Now: warm paper, brass signature, printed-document grammar, sentence
case, mono confined to data.
