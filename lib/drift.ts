import { FALLBACK_PRICES } from "./assets";
import { fetchSpotPrices } from "./sodex";
import type { Position } from "./types";

export interface DriftResult {
  /** Current value weight per symbol, normalised to 1. */
  weights: Record<string, number>;
  /** Prices used for the valuation (live or deterministic demo prices). */
  prices: Record<string, number>;
  navUsd: number;
  /** "live" when SoDEX tickers answered, "simulated" when demo prices were used. */
  source: "live" | "simulated";
  livePrices: boolean;
  maxDrift: number;
}

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Sums every fill in the position so rebalances are included in holdings. */
export function holdingsOf(position: Position): Map<string, number> {
  const qty = new Map<string, number>();
  for (const order of position.orders) {
    const sign = order.side === "buy" ? 1 : -1;
    qty.set(order.symbol, (qty.get(order.symbol) ?? 0) + sign * order.quantity);
  }
  for (const [symbol, value] of qty) {
    if (value <= 1e-9) qty.delete(symbol);
  }
  return qty;
}

/**
 * Current weights are holdings priced at real SoDEX tickers. When the public
 * tickers are unreachable we fall back to deterministic demo prices (seeded by
 * position id), so the rebalance loop is demonstrable and repeatable — and the
 * source is always labelled in the UI.
 */
export async function computeDrift(position: Position, targetWeights?: Record<string, number>): Promise<DriftResult> {
  const { prices: livePrices, live } = await fetchSpotPrices();
  const targets = targetWeights ?? position.weights;

  const holdings = holdingsOf(position);
  const orderedSymbols = [...new Set<string>([...holdings.keys(), ...Object.keys(targets)])].sort();

  // A rebalance is priced against a fixed market snapshot so that, once the
  // delta orders land, drift converges to zero. A new priceSeed is a new
  // snapshot: the demo equivalent of "a day passes".
  const simulate = !live || typeof position.priceSeed === "number";
  const rng = seededRandom(position.priceSeed ?? hashString(position.id));

  const prices: Record<string, number> = {};
  for (const symbol of orderedSymbols) {
    const base = livePrices[symbol] ?? FALLBACK_PRICES[symbol] ?? 0;
    // A stress move wide enough to breach the 3% drift band on a realistic basket.
    prices[symbol] = simulate ? base * (1 + (rng() - 0.5) * 0.7) : base;
  }

  let total = 0;
  const values = new Map<string, number>();
  for (const symbol of orderedSymbols) {
    const qty = holdings.get(symbol) ?? 0;
    const value = qty > 0 ? qty * (prices[symbol] ?? 0) : 0;
    values.set(symbol, value);
    total += value;
  }

  if (total <= 0) {
    return {
      weights: { ...targets },
      prices,
      navUsd: position.navUsd,
      source: "simulated",
      livePrices: live,
      maxDrift: 0
    };
  }

  const weights: Record<string, number> = {};
  for (const [symbol, value] of values) weights[symbol] = value / total;

  let maxDrift = 0;
  for (const symbol of orderedSymbols) {
    maxDrift = Math.max(maxDrift, Math.abs((weights[symbol] ?? 0) - (targets[symbol] ?? 0)));
  }

  return { weights, prices, navUsd: total, source: simulate ? "simulated" : "live", livePrices: live, maxDrift };
}
