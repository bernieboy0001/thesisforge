import { ASSET_MAP } from "./assets";
import type { AssetWeight, Engine, RebalanceDelta } from "./types";

/**
 * Drift → delta orders. Only emits a leg when |drift| clears the threshold, so a
 * rebalance is a small, auditable set of trades rather than a full rebuild.
 */
export function computeRebalanceDeltas(
  targets: AssetWeight[],
  currentWeights: Record<string, number>,
  navUsd: number,
  threshold = 0.03,
  builderFeeTenthsBp = 0,
  engine: Engine = "spot"
): RebalanceDelta[] {
  const targetMap = new Map(targets.map((a) => [a.symbol, a.targetWeight]));
  const symbols = new Set([...targetMap.keys(), ...Object.keys(currentWeights)]);
  const deltas: RebalanceDelta[] = [];

  for (const symbol of symbols) {
    const targetWeight = targetMap.get(symbol) ?? 0;
    const currentWeight = currentWeights[symbol] ?? 0;
    const deltaWeight = targetWeight - currentWeight;
    if (Math.abs(deltaWeight) < threshold) continue;

    const notionalUsd = Math.abs(deltaWeight) * navUsd;
    // Spot charges on sells only; perps charge both sides.
    const charged = engine === "perps" || deltaWeight < 0;
    deltas.push({
      symbol,
      currentWeight,
      targetWeight,
      deltaWeight,
      action: deltaWeight > 0 ? "buy" : "sell",
      notionalUsd,
      builderFeeUsd: charged ? (notionalUsd * builderFeeTenthsBp) / 100_000 : 0
    });
  }

  return deltas.sort((a, b) => Math.abs(b.deltaWeight) - Math.abs(a.deltaWeight));
}

export function driftOf(targets: AssetWeight[], currentWeights: Record<string, number>) {
  const rows = targets.map((a) => ({
    symbol: a.symbol,
    name: a.name,
    target: a.targetWeight,
    current: currentWeights[a.symbol] ?? 0,
    drift: (currentWeights[a.symbol] ?? 0) - a.targetWeight
  }));
  const totalDrift = rows.reduce((sum, r) => sum + Math.abs(r.drift), 0) / 2;
  return { rows, totalDrift };
}

export function sectorMix(assets: AssetWeight[]) {
  const map = new Map<string, number>();
  for (const a of assets) {
    const sector = ASSET_MAP.get(a.symbol)?.sector ?? "Other";
    map.set(sector, (map.get(sector) ?? 0) + a.targetWeight);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
