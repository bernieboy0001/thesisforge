export type CitationSource = "news" | "etf" | "sector" | "index" | "macro";

export interface Citation {
  id: string;
  source: CitationSource;
  title: string;
  url?: string;
  publisher?: string;
  snippet: string;
  publishedAt: string;
  /** Symbols this citation is actually attached to (empty = thesis-level only). */
  symbols: string[];
}

/** Every input to a weight is stored, so the UI can show *why* and judges can audit it. */
export interface SignalBreakdown {
  /** 0–1: how much retrieved evidence ties this asset to the thesis. */
  thesisAlignment: number;
  /** 0–1: ETF flows / sector attention. */
  flowSignal: number;
  /** 0–1: sector or price momentum. */
  momentum: number;
  /** 0–1: liquidity tier — will the basket actually fill? */
  liquidity: number;
  /** 0–1: penalty subtracted multiplicatively, not just displayed. */
  riskPenalty: number;
}

export interface AssetWeight {
  symbol: string;
  name: string;
  targetWeight: number;
  reason: string;
  citationIds: string[];
  /** Post-penalty composite score before normalisation. */
  score: number;
  signals: SignalBreakdown;
  /** False when we could not confirm the symbol exists on SoDEX. */
  symbolVerified: boolean;
}

export type RiskStatus = "pass" | "warn" | "fail";

export interface RiskCheck {
  id: string;
  label: string;
  status: RiskStatus;
  detail: string;
}

export interface RiskReport {
  score: number;
  level: "low" | "medium" | "high";
  checks: RiskCheck[];
}

export type Engine = "spot" | "perps";

export interface Basket {
  id: string;
  thesisId: string;
  version: number;
  assets: AssetWeight[];
  risk: RiskReport;
  methodology: string;
  universe: string[];
  /** Assets the thesis asked for that the active SoDEX network does not list. */
  excluded: { symbol: string; pair: string; reason: string }[];
  engine: Engine;
  createdAt: string;
}

export type DataMode = "live" | "demo";

export interface Thesis {
  id: string;
  prompt: string;
  summary: string;
  status: "draft" | "published" | "archived";
  basket: Basket;
  citations: Citation[];
  author: { address: string; name?: string };
  followers: number;
  copies: number;
  dataMode: DataMode;
  /** Feeds actually queried, so the integration is provable rather than claimed. */
  sourcesQueried: string[];
  createdAt: string;
}

export interface OrderIntent {
  symbol: string;
  sodexSymbol: string;
  side: "buy" | "sell";
  quantity: number;
  notionalUsd: number;
  price: number;
  clOrdID: string;
  verified: boolean;
}

export interface BuilderFee {
  builderId: number;
  /** Tenths of a basis point. 10 = 1 bp. */
  feeRate: number;
  /** Estimated fee actually chargeable on this specific batch. */
  estimatedUsd: number;
  /** Why the estimate is what it is. */
  note: string;
}

export interface ExecutionPlan {
  engine: Engine;
  accountId: number;
  notionalUsd: number;
  orders: OrderIntent[];
  builder: BuilderFee;
  payload: unknown;
  /** Exact EIP-712 object the user's master wallet must sign once. */
  approvalTypedData: unknown;
  mode: "demo" | "live";
  /** True when every leg was priced from a live SoDEX ticker. */
  pricesLive: boolean;
  /** Legs valued from a fallback reference because the ticker was missing. */
  unpricedSymbols: string[];
}

export interface Order {
  id: string;
  thesisId: string;
  symbol: string;
  sodexSymbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  notionalUsd: number;
  builderFeeUsd: number;
  clOrdID: string;
  sodexOrderId?: string;
  status: "submitted" | "filled" | "simulated" | "failed";
  createdAt: string;
}

export interface Position {
  id: string;
  thesisId: string;
  /** Denormalised so the portfolio can render without a second lookup. */
  thesisPrompt: string;
  engine: Engine;
  navUsd: number;
  /** Target weights at open, kept so drift is measured against the thesis. */
  weights: Record<string, number>;
  orders: Order[];
  copiesNote?: string;
  createdAt: string;
  lastRebalanceAt?: string;
  rebases?: number;
  /** When set, drift is priced with a deterministic demo move instead of the raw ticker. */
  priceSeed?: number;
}

export interface RebalanceDelta {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  deltaWeight: number;
  action: "buy" | "sell" | "hold";
  notionalUsd: number;
  builderFeeUsd: number;
}

export interface CompileRequest {
  prompt: string;
  engine?: Engine;
  notionalUsd?: number;
  universe?: string[];
}
