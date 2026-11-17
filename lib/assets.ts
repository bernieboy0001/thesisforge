import type { Engine } from "./types";

export interface AssetMeta {
  symbol: string;
  name: string;
  /** SoDEX spot pair, e.g. vBTC_vUSDC. May be unlisted on the active network. */
  sodexSpot: string | null;
  /** SoDEX perp market placeholder. Perp symbol IDs are not resolved in this build. */
  sodexPerp: string | null;
  /** Liquidity tier 0–1, used by the scoring engine. */
  liquidity: number;
  /** Structural risk penalty applied multiplicatively to the score. */
  riskPenalty: number;
  sector: string;
  keywords: string[];
}

/**
 * Curated universe: crypto majors, the SoSoValue index tokens that actually
 * trade on SoDEX, tokenised commodities, and tokenised AI/tech equities. The
 * compiler intersects this list with `/spot/markets/symbols` for the active
 * network, so an asset is only ever weighted if it can actually be routed.
 */
export const ASSETS: AssetMeta[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    sodexSpot: "vBTC_vUSDC",
    sodexPerp: "BTC-USD",
    liquidity: 0.98,
    riskPenalty: 0.06,
    sector: "Store of value",
    keywords: ["bitcoin", "btc", "store of value", "digital gold", "etf inflow", "treasury", "halving"]
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    sodexSpot: "vETH_vUSDC",
    sodexPerp: "ETH-USD",
    liquidity: 0.94,
    riskPenalty: 0.08,
    sector: "Smart contract L1",
    keywords: ["ethereum", "eth", "layer 1", "l1", "staking", "restaking", "evm", "blob"]
  },
  {
    symbol: "SOL",
    name: "Solana",
    sodexSpot: "vSOL_vUSDC",
    sodexPerp: "SOL-USD",
    liquidity: 0.9,
    riskPenalty: 0.12,
    sector: "High-throughput L1",
    keywords: ["solana", "sol", "high throughput", "monolithic", "depin", "consumer app", "firedancer", "l1"]
  },
  {
    symbol: "SUI",
    name: "Sui",
    sodexSpot: "vSUI_vUSDC",
    sodexPerp: "SUI-USD",
    liquidity: 0.8,
    riskPenalty: 0.16,
    sector: "Move L1",
    keywords: ["sui", "move", "parallel execution", "gaming l1", "l1"]
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    sodexSpot: "vAVAX_vUSDC",
    sodexPerp: "AVAX-USD",
    liquidity: 0.72,
    riskPenalty: 0.18,
    sector: "Subnet L1",
    keywords: ["avalanche", "avax", "subnet", "institutional chain", "l1"]
  },
  {
    symbol: "BNB",
    name: "BNB",
    sodexSpot: "vBNB_vUSDC",
    sodexPerp: null,
    liquidity: 0.78,
    riskPenalty: 0.15,
    sector: "Exchange L1",
    keywords: ["bnb", "binance", "exchange chain", "bnb chain", "l1"]
  },
  {
    symbol: "XRP",
    name: "XRP",
    sodexSpot: "vXRP_vUSDC",
    sodexPerp: null,
    liquidity: 0.8,
    riskPenalty: 0.2,
    sector: "Payments",
    keywords: ["xrp", "ripple", "cross-border payment", "payment rail", "l1"]
  },
  {
    symbol: "ADA",
    name: "Cardano",
    sodexSpot: "vADA_vUSDC",
    sodexPerp: null,
    liquidity: 0.7,
    riskPenalty: 0.22,
    sector: "Research L1",
    keywords: ["cardano", "ouroboros", "peer-reviewed chain", "l1"]
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    sodexSpot: "vLINK_vUSDC",
    sodexPerp: "LINK-USD",
    liquidity: 0.74,
    riskPenalty: 0.17,
    sector: "Oracle / infra",
    keywords: ["chainlink", "link", "oracle", "ccip", "data feed", "rwa infrastructure", "attested pricing"]
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    sodexSpot: "vUNI_vUSDC",
    sodexPerp: "UNI-USD",
    liquidity: 0.68,
    riskPenalty: 0.2,
    sector: "DeFi DEX",
    keywords: ["uniswap", "dex", "amm", "swap", "fee switch"]
  },
  {
    symbol: "AAVE",
    name: "Aave",
    sodexSpot: "vAAVE_vUSDC",
    sodexPerp: "AAVE-USD",
    liquidity: 0.66,
    riskPenalty: 0.2,
    sector: "DeFi lending",
    keywords: ["aave", "lending", "defi", "money market", "borrow", "utilisation"]
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    sodexSpot: "vDOGE_vUSDC",
    sodexPerp: "DOGE-USD",
    liquidity: 0.7,
    riskPenalty: 0.34,
    sector: "Meme",
    keywords: ["doge", "dogecoin", "meme", "retail speculation"]
  },
  {
    symbol: "LTC",
    name: "Litecoin",
    sodexSpot: "vLTC_vUSDC",
    sodexPerp: null,
    liquidity: 0.62,
    riskPenalty: 0.22,
    sector: "Payments",
    keywords: ["litecoin", "ltc", "payments"]
  },
  {
    symbol: "HYPE",
    name: "Hyperliquid",
    sodexSpot: "vHYPE_vUSDC",
    sodexPerp: null,
    liquidity: 0.6,
    riskPenalty: 0.28,
    sector: "Perp DEX",
    keywords: ["hyperliquid", "hype", "perp dex", "onchain perps"]
  },
  {
    symbol: "ARB",
    name: "Arbitrum",
    sodexSpot: "vARB_vUSDC",
    sodexPerp: null,
    liquidity: 0.6,
    riskPenalty: 0.28,
    sector: "L2 rollup",
    keywords: ["arbitrum", "arb", "rollup", "l2", "optimistic rollup"]
  },
  {
    symbol: "XLM",
    name: "Stellar",
    sodexSpot: "vXLM_vUSDC",
    sodexPerp: null,
    liquidity: 0.55,
    riskPenalty: 0.3,
    sector: "Payments",
    keywords: ["stellar", "xlm", "remittance"]
  },
  {
    symbol: "ZEC",
    name: "Zcash",
    sodexSpot: "vZEC_vUSDC",
    sodexPerp: null,
    liquidity: 0.5,
    riskPenalty: 0.34,
    sector: "Privacy",
    keywords: ["zcash", "zec", "privacy coin", "shielded"]
  },

  // SoSoValue index tokens, tradable on SoDEX. Holding one gives the basket a
  // published methodology instead of a hand-rolled sector approximation.
  {
    symbol: "MAG7ssi",
    name: "SoSoValue MAG7.ssi",
    sodexSpot: "vMAG7ssi_vUSDC",
    sodexPerp: null,
    liquidity: 0.76,
    riskPenalty: 0.12,
    sector: "Index product",
    keywords: ["magnificent seven", "mega cap", "top 7", "core crypto index", "ssi", "mcap index"]
  },
  {
    symbol: "DEFIssi",
    name: "SoSoValue DEFI.ssi",
    sodexSpot: "vDEFIssi_vUSDC",
    sodexPerp: null,
    liquidity: 0.68,
    riskPenalty: 0.16,
    sector: "Index product",
    keywords: ["defi index", "defi basket", "defi ssi"]
  },
  {
    symbol: "MEMEssi",
    name: "SoSoValue MEME.ssi",
    sodexSpot: "vMEMEssi_vUSDC",
    sodexPerp: null,
    liquidity: 0.6,
    riskPenalty: 0.24,
    sector: "Meme",
    keywords: ["meme index", "meme basket", "meme ssi", "memecoin index"]
  },
  {
    symbol: "USSI",
    name: "SoSoValue USSI",
    sodexSpot: "vUSSI_vUSDC",
    sodexPerp: null,
    liquidity: 0.8,
    riskPenalty: 0.06,
    sector: "Stablecoin index",
    // Aliases for the dollar-yield / tokenised-treasury theme. "treasur" covers
    // treasury and treasuries; "t-bill"/"tbill" cover both spellings, because a
    // thesis that says "park in treasuries" is naming this asset, not BTC. No bare
    // "cash"/"park" aliases — any earnings story with a cash balance would tag it.
    keywords: [
      "stablecoin index",
      "stablecoin basket",
      "stablecoin",
      "ussi",
      "dollar yield",
      "treasur",
      "t-bill",
      "tbill",
      "yield"
    ]
  },

  {
    symbol: "XAUt",
    name: "Tether Gold",
    sodexSpot: "vXAUt_vUSDC",
    sodexPerp: null,
    liquidity: 0.7,
    riskPenalty: 0.1,
    sector: "Commodity",
    keywords: ["gold", "xaut", "tether gold", "hard asset", "inflation hedge"]
  },

  // Tokenised AI / semiconductor equity, listed on SoDEX. This is what makes an
  // "AI infrastructure" thesis executable without inventing a pair. Penalties sit
  // with large-cap equity/issuer risk, not crypto degen risk — otherwise the
  // majors' lower penalty would outrank the theme the user actually wrote.
  {
    symbol: "NVDA",
    name: "NVIDIA (tokenised)",
    sodexSpot: "vNVDA_vUSDC",
    sodexPerp: null,
    liquidity: 0.78,
    riskPenalty: 0.14,
    sector: "AI semis",
    keywords: ["nvidia", "gpu", "accelerator", "inference", "training", "cuda", "ai chip"]
  },
  {
    symbol: "AMD",
    name: "AMD (tokenised)",
    sodexSpot: "vAMD_vUSDC",
    sodexPerp: null,
    liquidity: 0.68,
    riskPenalty: 0.17,
    sector: "AI semis",
    keywords: ["amd", "gpu", "accelerator", "mi300", "inference"]
  },
  {
    symbol: "TSM",
    name: "TSMC (tokenised)",
    sodexSpot: "vTSM_vUSDC",
    sodexPerp: null,
    liquidity: 0.66,
    riskPenalty: 0.16,
    sector: "AI semis",
    keywords: ["tsmc", "foundry", "foundries", "semiconductor", "chip", "fab"]
  },
  {
    symbol: "MU",
    name: "Micron (tokenised)",
    sodexSpot: "vMU_vUSDC",
    sodexPerp: null,
    liquidity: 0.6,
    riskPenalty: 0.2,
    sector: "AI semis",
    keywords: ["micron", "memory", "hbm", "dram", "memory bandwidth"]
  },
  {
    symbol: "SMH",
    name: "Semiconductor ETF (tokenised)",
    sodexSpot: "vSMH_vUSDC",
    sodexPerp: null,
    liquidity: 0.64,
    riskPenalty: 0.14,
    sector: "Equity ETF",
    keywords: ["semiconductor etf", "chip etf", "semis"]
  },

  // Metadata-only for now: no spot pair on the active SoDEX networks. They are
  // deliberately kept out of DEFAULT_UNIVERSE, but an explicit `universe`
  // request still resolves them so the compiler can report them as excluded
  // instead of silently dropping the part of the thesis it cannot route.
  {
    symbol: "RENDER",
    name: "Render",
    sodexSpot: "vRENDER_vUSDC",
    sodexPerp: null,
    liquidity: 0.62,
    riskPenalty: 0.24,
    sector: "AI / GPU compute",
    keywords: ["render", "gpu", "decentralised compute", "ai infrastructure", "ai infra"]
  },
  {
    symbol: "TAO",
    name: "Bittensor",
    sodexSpot: "vTAO_vUSDC",
    sodexPerp: null,
    liquidity: 0.55,
    riskPenalty: 0.28,
    sector: "AI / model networks",
    keywords: ["bittensor", "tao", "ai model", "machine learning", "decentralised ai", "subnet"]
  },
  {
    symbol: "FET",
    name: "Artificial Superintelligence",
    sodexSpot: "vFET_vUSDC",
    sodexPerp: null,
    liquidity: 0.58,
    riskPenalty: 0.26,
    sector: "AI / agents",
    keywords: ["fetch", "fet", "asi", "ai agent", "autonomous agent", "agent economy"]
  },
  {
    symbol: "AR",
    name: "Arweave",
    sodexSpot: "vAR_vUSDC",
    sodexPerp: null,
    liquidity: 0.5,
    riskPenalty: 0.3,
    sector: "Data / storage",
    keywords: ["arweave", "permanent storage", "data availability", "training data"]
  },
  {
    symbol: "ONDO",
    name: "Ondo Finance",
    sodexSpot: "vONDO_vUSDC",
    sodexPerp: null,
    liquidity: 0.64,
    riskPenalty: 0.23,
    sector: "RWA",
    keywords: ["ondo", "rwa", "tokenised treasury", "tokenized treasury", "yield bearing", "treasuries"]
  }
];

export const ASSET_MAP = new Map(ASSETS.map((a) => [a.symbol, a]));

export const DEFAULT_UNIVERSE = [
  "BTC",
  "ETH",
  "SOL",
  "SUI",
  "AVAX",
  "BNB",
  "XRP",
  "LINK",
  "UNI",
  "AAVE",
  "DOGE",
  "HYPE",
  "ARB",
  "MAG7ssi",
  "DEFIssi",
  "MEMEssi",
  "USSI",
  "XAUt",
  "NVDA",
  "AMD",
  "TSM",
  "MU",
  "SMH"
];

/** Indicative fallback prices, only used when SoDEX tickers are unreachable. */
export const FALLBACK_PRICES: Record<string, number> = {
  BTC: 63819,
  ETH: 1788.7,
  SOL: 72.54,
  SUI: 0.719,
  AVAX: 7.1,
  BNB: 587.5,
  XRP: 0.9589,
  ADA: 0.25378,
  LINK: 9.117,
  UNI: 5.241,
  AAVE: 110.39,
  DOGE: 0.05861,
  LTC: 44.3,
  HYPE: 68.1,
  ARB: 0.1314,
  XLM: 0.1376,
  ZEC: 31.2,
  MAG7ssi: 0.4124,
  DEFIssi: 0.405,
  MEMEssi: 0.1464,
  USSI: 0.9991,
  XAUt: 3850.4,
  NVDA: 154.26,
  AMD: 168.4,
  TSM: 374.35,
  MU: 725.28,
  SMH: 464.75,
  RENDER: 6.12,
  TAO: 428,
  FET: 1.28,
  AR: 14.6,
  ONDO: 0.92
};

/**
 * SoSoValue v1 ships index constituents with lowercase name slugs ("bitcoin",
 * "binance-coin", "fetch-ai") rather than tickers. Map them onto the universe so
 * a published index can be used as a methodology cross-check against live data.
 * Unknown slugs pass through uppercased and simply match nothing.
 */
const NAME_TO_TICKER = new Map<string, string>([
  ["bitcoin", "BTC"],
  ["ethereum", "ETH"],
  ["solana", "SOL"],
  ["cardano", "ADA"],
  ["avalanche", "AVAX"],
  ["binance-coin", "BNB"],
  ["dogecoin", "DOGE"],
  ["litecoin", "LTC"],
  ["ripple", "XRP"],
  ["xrp", "XRP"],
  ["stellar", "XLM"],
  ["chainlink", "LINK"],
  ["uniswap", "UNI"],
  ["aave", "AAVE"],
  ["sui", "SUI"],
  ["arbitrum", "ARB"],
  ["zcash", "ZEC"],
  ["hyperliquid", "HYPE"],
  ["render", "RENDER"],
  ["render-token", "RENDER"],
  ["bittensor", "TAO"],
  ["fetch-ai", "FET"],
  ["fetch.ai", "FET"],
  ["akash-network", "AKT"],
  ["ondo-finance", "ONDO"],
  ["tether-gold", "XAUt"]
]);

export function nameToTicker(raw: string): string {
  const slug = raw.trim().toLowerCase();
  return NAME_TO_TICKER.get(slug) ?? slug.toUpperCase();
}

/** Map the live sector names onto the universe's tickers (fixtures carry their own lists). */
export const SECTOR_SLUG_SYMBOLS: Record<string, string[]> = {
  layer1: ["SOL", "SUI", "AVAX", "BNB", "XRP", "ADA"],
  eth: ["ETH"],
  bitcoin: ["BTC"],
  layer2: ["ARB"],
  defi: ["AAVE", "UNI", "LINK"],
  ai: ["NVDA", "AMD", "TSM", "MU", "SMH", "RENDER", "TAO", "FET"],
  depin: ["RENDER", "TAO", "FET"],
  rwa: ["XAUt", "ONDO"],
  stablecoin: ["USSI"],
  meme: ["DOGE", "MEMEssi"]
};

export function sectorSymbols(slug: string): string[] {
  const key = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SECTOR_SLUG_SYMBOLS[key] ?? [];
}

export function sodexPair(asset: AssetMeta, engine: Engine): string | null {
  return engine === "perps" ? asset.sodexPerp : asset.sodexSpot;
}
