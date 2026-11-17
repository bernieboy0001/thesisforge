import { ASSET_MAP, FALLBACK_PRICES, sodexPair } from "./assets";
import type { AssetWeight, Engine, ExecutionPlan, OrderIntent, Thesis } from "./types";

const TTL = 10 * 60 * 1000;

let priceCache:
  | { at: number; prices: Record<string, number>; priced: Record<string, boolean>; live: boolean }
  | null = null;
let symbolCache:
  | { at: number; ids: Map<string, number>; names: Map<string, string>; live: boolean }
  | null = null;

export function sodexConfig() {
  // Mainnet is the default because that is where the Builder Race settles and
  // where the full symbol list is live. Set SODEX_NETWORK=testnet to switch.
  const network = process.env.SODEX_NETWORK === "testnet" ? "testnet" : "mainnet";
  const base =
    process.env.SODEX_BASE_URL ||
    (network === "mainnet" ? "https://mainnet-gw.sodex.dev" : "https://testnet-gw.sodex.dev");
  const builderId = Number(process.env.SODEX_BUILDER_ID || 0);
  const fee = Number(process.env.SODEX_BUILDER_FEE || 50); // 50 = 5 bps
  const engineCap = 2000; // spot cap in tenths of a bp; perps is 200
  return {
    network,
    base,
    builderId,
    fee: Math.min(fee, engineCap),
    accountId: Number(process.env.SODEX_ACCOUNT_ID || 0),
    live: process.env.SODEX_LIVE === "1"
  };
}

async function timedFetch(url: string, init?: RequestInit, ms = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/** Public SoDEX spot tickers — no key required, so the demo shows real prices. */
export async function fetchSpotPrices(): Promise<{
  prices: Record<string, number>;
  priced: Record<string, boolean>;
  live: boolean;
}> {
  if (priceCache && Date.now() - priceCache.at < TTL)
    return { prices: priceCache.prices, priced: priceCache.priced, live: priceCache.live };

  const cfg = sodexConfig();
  try {
    const res = await timedFetch(`${cfg.base}/api/v1/spot/markets/tickers`, { headers: { accept: "application/json" } });
    const body = (await res.json()) as { data?: { symbol?: string; lastPx?: string }[] };
    const rows = Array.isArray(body?.data) ? body.data : [];
    const byPair = new Map<string, number>();
    for (const row of rows) {
      const px = Number(row.lastPx);
      if (row.symbol && Number.isFinite(px) && px > 0) byPair.set(row.symbol, px);
    }
    const prices: Record<string, number> = { ...FALLBACK_PRICES };
    const priced: Record<string, boolean> = {};
    for (const meta of ASSET_MAP.values()) {
      if (meta.sodexSpot && byPair.has(meta.sodexSpot)) {
        prices[meta.symbol] = byPair.get(meta.sodexSpot)!;
        priced[meta.symbol] = true;
      }
    }
    const live = rows.length > 0;
    priceCache = { at: Date.now(), prices, priced, live };
    return { prices, priced, live };
  } catch {
    priceCache = { at: Date.now(), prices: FALLBACK_PRICES, priced: {}, live: false };
    return { prices: FALLBACK_PRICES, priced: {}, live: false };
  }
}

/**
 * Spot symbol name (vBTC_vUSDC) → symbolID, plus the authoritative list of what
 * this network actually lists. One call backs both execution and compilation,
 * so the app never proposes a pair it cannot route.
 */
export async function fetchSpotSymbols(): Promise<{
  ids: Map<string, number>;
  /** Normalised pair → the market name exactly as SoDEX spells it. */
  names: Map<string, string>;
  live: boolean;
}> {
  if (symbolCache && Date.now() - symbolCache.at < TTL)
    return { ids: symbolCache.ids, names: symbolCache.names, live: symbolCache.live };
  const cfg = sodexConfig();
  const ids = new Map<string, number>();
  const names = new Map<string, string>();
  let live = false;
  try {
    const res = await timedFetch(`${cfg.base}/api/v1/spot/markets/symbols`, { headers: { accept: "application/json" } });
    const body = (await res.json()) as { data?: { id?: number | string; name?: string }[] };
    for (const row of body?.data ?? []) {
      const id = Number(row.id);
      // The symbol list names index pairs with a dot (vMAG7.ssi_vUSDC) while
      // tickers omit it (vMAG7ssi_vUSDC). Normalise so one curated pair string
      // resolves against both feeds, and keep the venue spelling for payloads.
      if (row.name && Number.isFinite(id)) {
        const key = row.name.replace(/\./g, "");
        ids.set(key, id);
        names.set(key, row.name);
      }
    }
    live = ids.size > 0;
  } catch {
    // unreachable — callers fall back to the curated pair map
  }
  symbolCache = { at: Date.now(), ids, names, live };
  return { ids, names, live };
}

/**
 * Builder fees are charged in the quote/collateral asset. SoDEX exempts the
 * buying side of spot trades; perps pay on both sides. Encoded, not assumed.
 */
export function builderFeeUsdFor(args: { engine: Engine; side: "buy" | "sell"; notionalUsd: number; rate: number }) {
  const exempt = args.engine === "spot" && args.side === "buy";
  if (exempt) return 0;
  return (args.notionalUsd * args.rate) / 100_000;
}

export function feeNoteFor(engine: Engine) {
  return engine === "spot"
    ? "Spot buys are exempt from builder fees on SoDEX (fees are collected in the quote asset). This batch earns $0 until it sells or rebalances — that is why the rebalance loop, not the initial buy, is the revenue engine."
    : "Perps charge builder fees on both sides, so this basket earns from entry and exit.";
}

export async function buildExecutionPlan(thesis: Thesis, notionalUsd: number): Promise<ExecutionPlan> {
  const cfg = sodexConfig();
  const engine = thesis.basket.engine;
  const [{ prices, priced }, symbols] = await Promise.all([fetchSpotPrices(), fetchSpotSymbols()]);
  const symbolIds = symbols.ids;

  const orders: OrderIntent[] = [];
  for (const asset of thesis.basket.assets) {
    if (!asset.symbolVerified) continue;
    const meta = ASSET_MAP.get(asset.symbol);
    if (!meta) continue;
    const pair = sodexPair(meta, engine);
    if (!pair) continue;
    const price = prices[asset.symbol] ?? 0;
    if (!(price > 0)) continue;
    const notional = notionalUsd * asset.targetWeight;
    const quantity = notional / price;
    orders.push({
      symbol: asset.symbol,
      sodexSymbol: pair,
      side: "buy",
      quantity: Number(quantity.toFixed(8)),
      notionalUsd: Number(notional.toFixed(2)),
      price,
      clOrdID: `tf${Date.now().toString(36)}${asset.symbol.toLowerCase()}`.slice(0, 36),
      verified: true
    });
  }

  const estimatedUsd = orders.reduce(
    (sum, o) => sum + builderFeeUsdFor({ engine, side: o.side, notionalUsd: o.notionalUsd, rate: cfg.fee }),
    0
  );

  const payload = {
    accountID: cfg.accountId,
    orders: orders.map((o) => {
      const id = symbolIds.get(o.sodexSymbol);
      return {
        // Spot symbol IDs come from /spot/markets/symbols; perp IDs come from a
        // different market endpoint, so they are left unresolved on purpose.
        symbolID: engine === "spot" ? id ?? null : null,
        symbol: symbols.names.get(o.sodexSymbol) ?? o.sodexSymbol,
        clOrdID: o.clOrdID,
        side: 1, // BUY
        type: 2, // MARKET
        timeInForce: 3, // IOC
        ...(engine === "spot" ? { funds: o.notionalUsd.toFixed(2) } : { quantity: String(o.quantity) })
      };
    }),
    builder: { id: cfg.builderId, fee: cfg.fee }
  };

  return {
    engine,
    accountId: cfg.accountId,
    notionalUsd,
    orders,
    builder: {
      builderId: cfg.builderId,
      feeRate: cfg.fee,
      estimatedUsd: Number(estimatedUsd.toFixed(4)),
      note: feeNoteFor(engine)
    },
    payload,
    approvalTypedData: approvalTypedData({ accountId: cfg.accountId, builderId: cfg.builderId, maxFeeRate: cfg.fee }),
    mode: cfg.live ? "live" : "demo",
    pricesLive: orders.length > 0 && orders.every((o) => priced[o.symbol]),
    unpricedSymbols: orders.filter((o) => !priced[o.symbol]).map((o) => o.symbol)
  };
}

/**
 * The exact EIP-712 object the user's master wallet signs once to approve the
 * builder fee. Field order is part of the signature, so it is spelled out.
 */
export function approvalTypedData(args: { accountId: number; builderId: number; maxFeeRate: number }) {
  const cfg = sodexConfig();
  const chainID = cfg.network === "mainnet" ? 286623 : 138565;
  return {
    domain: {
      name: "universal",
      version: "1",
      chainId: chainID,
      verifyingContract: "0x0000000000000000000000000000000000000000"
    },
    types: {
      ApproveBuilderFeeAction: [
        { name: "chainID", type: "uint64" },
        { name: "nonce", type: "uint64" },
        { name: "accountID", type: "uint64" },
        { name: "builderID", type: "uint64" },
        { name: "maxFeeRate", type: "uint64" }
      ]
    },
    primaryType: "ApproveBuilderFeeAction",
    message: {
      chainID,
      nonce: Date.now(),
      accountID: args.accountId,
      builderID: args.builderId,
      maxFeeRate: args.maxFeeRate
    }
  };
}

export function describeAssets(assets: AssetWeight[]) {
  return assets.map((a) => `${a.symbol} ${(a.targetWeight * 100).toFixed(1)}%`).join(" · ");
}
