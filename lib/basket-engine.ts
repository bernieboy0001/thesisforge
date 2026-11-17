import { ASSET_MAP } from "./assets";
import type { AssetWeight, Citation, RiskCheck, RiskReport, SignalBreakdown } from "./types";

export const WEIGHTS = {
  thesisAlignment: 0.4,
  flowSignal: 0.25,
  momentum: 0.2,
  liquidity: 0.15
} as const;

export const METHODOLOGY =
  "membership requires evidence (a thesis term, a retrieved source, or the closest published index) — the liquid softmax tail is excluded; " +
  "score = (0.40·thesisAlignment + 0.25·flow + 0.20·momentum + 0.15·liquidity) × (1 − riskPenalty), " +
  "then softmax (T=5), at most 10 names, dust pruned below 2%, and a 28% per-asset cap with the excess redistributed.";

export const MAX_WEIGHT = 0.28;
const TEMPERATURE = 5;
const DUST = 0.02;
const MAX_ASSETS = 10;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface RawSignal {
  symbol: string;
  signals: SignalBreakdown;
}

export function compositeScore(s: SignalBreakdown): number {
  const base =
    s.thesisAlignment * WEIGHTS.thesisAlignment +
    s.flowSignal * WEIGHTS.flowSignal +
    s.momentum * WEIGHTS.momentum +
    s.liquidity * WEIGHTS.liquidity;
  return clamp01(base * (1 - clamp01(s.riskPenalty)));
}

export interface WeightedAsset {
  symbol: string;
  targetWeight: number;
  score: number;
  signals: SignalBreakdown;
}

export function allocate(signals: RawSignal[]): WeightedAsset[] {
  const scored = signals.map((s) => ({ ...s, score: compositeScore(s.signals) }));
  if (!scored.length) return [];

  const exps = scored.map((s) => Math.exp(s.score * TEMPERATURE));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  let weighted: WeightedAsset[] = scored.map((s, i) => ({
    symbol: s.symbol,
    targetWeight: exps[i] / sum,
    score: s.score,
    signals: s.signals
  }));

  const normalise = (list: WeightedAsset[]) => {
    const total = list.reduce((a, w) => a + w.targetWeight, 0) || 1;
    return list.map((w) => ({ ...w, targetWeight: w.targetWeight / total }));
  };

  // Fixed the basket membership first, then normalise, then cap. Capping before
  // dust-pruning/truncation shrank the denominator afterwards and pushed a
  // capped name back above 28% (BTC reached 34.9% on a 23-asset universe).
  weighted = normalise(
    weighted.sort((a, b) => b.targetWeight - a.targetWeight).slice(0, MAX_ASSETS)
  );
  weighted = normalise(weighted.filter((w) => w.targetWeight >= DUST));
  if (!weighted.length) return [];

  // Cap, then redistribute the excess across the uncapped names. Redistribution
  // can lift another name over the cap, so iterate until the basket is compliant.
  for (let pass = 0; pass < 8; pass += 1) {
    const over = weighted.filter((w) => w.targetWeight > MAX_WEIGHT + 1e-9);
    if (!over.length) break;
    let excess = 0;
    weighted = weighted.map((w) => {
      if (w.targetWeight > MAX_WEIGHT) {
        excess += w.targetWeight - MAX_WEIGHT;
        return { ...w, targetWeight: MAX_WEIGHT };
      }
      return w;
    });
    const uncapped = weighted.filter((w) => w.targetWeight < MAX_WEIGHT - 1e-9);
    const room = uncapped.reduce((a, w) => a + (MAX_WEIGHT - w.targetWeight), 0);
    if (!uncapped.length || room <= 1e-9) break;
    weighted = weighted.map((w) =>
      w.targetWeight < MAX_WEIGHT
        ? { ...w, targetWeight: w.targetWeight + (excess * (MAX_WEIGHT - w.targetWeight)) / room }
        : w
    );
  }

  return normalise(weighted);
}

export function assessRisk(assets: AssetWeight[]): RiskReport {
  const checks: RiskCheck[] = [];
  const penalties: Record<string, number> = {};
  const total = assets.reduce((a, w) => a + w.targetWeight, 0) || 1;

  const maxWeight = assets.reduce((m, a) => Math.max(m, a.targetWeight), 0);
  const concentration = Math.max(0, maxWeight - 0.25) / 0.05;
  penalties.concentration = concentration * 8;
  checks.push({
    id: "concentration",
    label: "Single-asset concentration",
    status: maxWeight > MAX_WEIGHT + 1e-9 ? "fail" : maxWeight > 0.24 ? "warn" : "pass",
    detail: `Largest position ${(maxWeight * 100).toFixed(1)}% (cap ${(MAX_WEIGHT * 100).toFixed(0)}%).`
  });

  const breadthOk = assets.length >= 4;
  penalties.breadth = breadthOk ? 0 : 22;
  checks.push({
    id: "breadth",
    label: "Basket breadth",
    status: breadthOk ? "pass" : "fail",
    detail: `${assets.length} assets. Fewer than 4 means single-name risk dominates the thesis.`
  });

  const memeWeight = assets
    .filter((a) => ASSET_MAP.get(a.symbol)?.sector === "Meme")
    .reduce((s, a) => s + a.targetWeight, 0);
  penalties.meme = memeWeight > 0.15 ? (memeWeight - 0.15) * 220 : 0;
  checks.push({
    id: "meme",
    label: "Speculative (meme) exposure",
    status: memeWeight > 0.15 ? "fail" : memeWeight > 0.08 ? "warn" : "pass",
    detail: `${(memeWeight * 100).toFixed(1)}% in meme-sector assets (limit 15%).`
  });

  const bySector = new Map<string, number>();
  for (const a of assets) {
    const sector = ASSET_MAP.get(a.symbol)?.sector ?? "Other";
    bySector.set(sector, (bySector.get(sector) ?? 0) + a.targetWeight / total);
  }
  const [topSector, topSectorWeight] = [...bySector.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["n/a", 0];
  penalties.sector = topSectorWeight > 0.55 ? (topSectorWeight - 0.55) * 90 : 0;
  checks.push({
    id: "sector",
    label: "Sector concentration",
    status: topSectorWeight > 0.6 ? "fail" : topSectorWeight > 0.5 ? "warn" : "pass",
    detail: `Largest sector ${topSector} at ${(topSectorWeight * 100).toFixed(0)}%.`
  });

  // Tokenised equity is a different risk asset class from onchain crypto: it
  // carries issuer, custody and market-hours risk that a spot-crypto basket
  // does not. Without this check a 43%-semis basket scored as zero risk.
  const equityWeight = assets
    .filter((a) => {
      const sector = ASSET_MAP.get(a.symbol)?.sector;
      return sector === "AI semis" || sector === "Equity ETF";
    })
    .reduce((s, a) => s + a.targetWeight, 0);
  penalties.equity = equityWeight > 0.25 ? (equityWeight - 0.25) * 60 : 0;
  checks.push({
    id: "asset-class",
    label: "Tokenised-equity exposure",
    status: equityWeight > 0.5 ? "fail" : equityWeight > 0.25 ? "warn" : "pass",
    detail: `${(equityWeight * 100).toFixed(0)}% in tokenised equity — issuer and custody risk (limit 25%).`
  });

  // "Evidence" is either a retrieved source or an explicit thesis term. A name
  // the user wrote into the prompt (NVDA via "GPU/accelerators") is supported
  // even when the demo news set has no headline for it; silently treating that
  // as unsupported provenance would punish exactly the thematic bets this tool
  // exists to compile.
  const unsupported = assets
    .filter((a) => a.citationIds.length === 0 && a.signals.thesisAlignment < 0.25)
    .reduce((s, a) => s + a.targetWeight, 0);
  penalties.unsupported = unsupported > 0.15 ? (unsupported - 0.15) * 120 : 0;
  checks.push({
    id: "provenance",
    label: "Evidence coverage",
    status: unsupported > 0.35 ? "fail" : unsupported > 0.15 ? "warn" : "pass",
    detail: `${((1 - unsupported) * 100).toFixed(0)}% of weight carries a source citation or an explicit thesis term.`
  });

  const unverified = assets.filter((a) => !a.symbolVerified);
  penalties.unverified = unverified.length ? 15 : 0;
  checks.push({
    id: "executable",
    label: "Executable on SoDEX",
    status: unverified.length ? "fail" : "pass",
    detail: unverified.length
      ? `Unconfirmed pair for ${unverified.map((a) => a.symbol).join(", ")} — will not be routed.`
      : "Every leg maps to a confirmed SoDEX pair."
  });

  const score = Math.round(Math.min(100, Math.max(0, Object.values(penalties).reduce((a, b) => a + b, 0))));
  const level: RiskReport["level"] = checks.some((c) => c.status === "fail") ? "high" : score >= 30 ? "medium" : "low";

  return { score, level, checks };
}

export function citationIdsFor(symbol: string, citations: Citation[]): string[] {
  // News feeds emit upper-case tickers while the curated universe keeps display
  // casing (XAUt, MAG7ssi), so link citations case-insensitively.
  const target = symbol.toUpperCase();
  return citations.filter((c) => c.symbols.some((s) => s.toUpperCase() === target)).map((c) => c.id);
}
