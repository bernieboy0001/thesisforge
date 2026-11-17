/**
 * Demo dataset, shaped exactly like the SoSoValue v1 responses so that the
 * normaliser, the basket engine and the UI run identically with or without a
 * key. Every item is labelled as demo data in the UI — nothing here is
 * presented as a live quote.
 */

const HOUR = 3_600_000;
const now = Date.now();
const ago = (h: number) => now - h * HOUR;

interface RawNews {
  id: string;
  title: string | null;
  content: string;
  release_time: number;
  author: string;
  source_link: string;
  matched_currencies: { id: string; full_name: string; name: string }[];
  tags: string[];
}

const mc = (...names: string[]) =>
  names.map((name, i) => ({
    id: `cur-${name.toLowerCase()}-${i}`,
    full_name: name,
    name
  }));

const RAW_NEWS: RawNews[] = [
  {
    id: "demo-news-1",
    title: "Spot bitcoin ETFs log third straight week of net inflows as allocators rebuild exposure",
    content:
      "<p>US spot bitcoin ETFs recorded a third consecutive week of positive net flows, with the aggregate category absorbing fresh capital as allocators rebalanced back toward core exposure. Traders pointed to steady creation activity rather than a single outsized print.</p>",
    release_time: ago(2),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("BTC"),
    tags: ["ETF", "BTC", "Flows"]
  },
  {
    id: "demo-news-2",
    title: "Ether ETF flows turn positive as staking-yield products gather assets",
    content:
      "<p>Ether ETF products returned to net inflows after two weeks of redemptions, with the pickup concentrated in vehicles that market a staking-linked yield. The shift follows a broader rotation back into large-cap smart-contract exposure.</p>",
    release_time: ago(5),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("ETH"),
    tags: ["ETF", "ETH", "Staking"]
  },
  {
    id: "demo-news-3",
    title: "AI compute tokens extend a rally as inference demand outpaces GPU supply",
    content:
      "<p>Tokens tied to decentralised GPU and inference markets extended gains, with operators reporting that demand for inference capacity continues to outrun available supply. Analysts cautioned that the sector's revenue base remains thin relative to its market capitalisation.</p>",
    release_time: ago(7),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("RENDER", "TAO", "FET"),
    tags: ["AI", "Compute", "Sector"]
  },
  {
    id: "demo-news-4",
    title: "Bittensor subnet incentives draw new model teams as emissions adjust",
    content:
      "<p>Several model teams migrated to Bittensor subnets following an emissions adjustment, arguing that subnet-level incentives now better reward verifiable model quality. Critics note that evaluation remains the sector's weakest link.</p>",
    release_time: ago(11),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("TAO"),
    tags: ["AI", "TAO", "Incentives"]
  },
  {
    id: "demo-news-5",
    title: "Solana stablecoin supply hits a new high as payment volume broadens",
    content:
      "<p>Stablecoin supply on Solana reached a record as payment processors reported broader merchant volume. The increase in settlement activity has historically preceded higher fee revenue for the network.</p>",
    release_time: ago(13),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("SOL"),
    tags: ["SOL", "Stablecoins", "Payments"]
  },
  {
    id: "demo-news-6",
    title: "Tokenised treasury products pass a new assets-under-management milestone",
    content:
      "<p>Tokenised treasury and money-market products crossed a fresh AUM milestone, driven by onchain collateral demand rather than retail allocation. Issuers flagged the next constraint as distribution, not demand.</p>",
    release_time: ago(16),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("ONDO"),
    tags: ["RWA", "Treasuries", "ONDO"]
  },
  {
    id: "demo-news-7",
    title: "DeFi lending deposits climb as borrow rates normalise from September's spike",
    content:
      "<p>Deposits across the largest lending markets climbed while borrow rates eased back toward their year's average. Protocols with concentrated collateral exposure saw the largest utilisation improvement.</p>",
    release_time: ago(19),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("AAVE"),
    tags: ["DeFi", "Lending", "AAVE"]
  },
  {
    id: "demo-news-8",
    title: "DEX volumes rotate toward large-cap pairs as memecoin turnover fades",
    content:
      "<p>Onchain exchange volumes rotated back toward large-cap pairs, with memecoin turnover down sharply from its autumn peak. Market makers described the shift as a return to healthier depth.</p>",
    release_time: ago(22),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("UNI", "DOGE"),
    tags: ["DEX", "Memes", "Volume"]
  },
  {
    id: "demo-news-9",
    title: "Oracles move into the collateral stack as RWA issuers demand attested pricing",
    content:
      "<p>Issuers of tokenised credit are increasingly requiring attested, low-latency pricing before accepting onchain collateral. Oracle providers are positioning data attestation as the missing piece for institutional RWA growth.</p>",
    release_time: ago(26),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("LINK"),
    tags: ["Oracles", "RWA", "LINK"]
  },
  {
    id: "demo-news-10",
    title: "Macro: traders trim rate-cut odds after a firmer inflation print",
    content:
      "<p>Rate futures moved to price a slower easing path after a firmer-than-expected inflation reading. Crypto beta historically reacts to the front end of the curve, though the ETF flow channel has blunted the sensitivity.</p>",
    release_time: ago(30),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("BTC", "ETH"),
    tags: ["Macro", "Rates", "CPI"]
  },
  {
    id: "demo-news-11",
    title: "Meme baskets underperform as speculative positioning unwinds into month end",
    content:
      "<p>High-beta meme assets lagged the wider market as leverage was trimmed into month end. Funding on perpetual futures cooled across the segment, with the sharpest decline in the newest listings.</p>",
    release_time: ago(34),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("DOGE", "WIF"),
    tags: ["Memes", "Leverage", "Funding"]
  },
  {
    id: "demo-news-12",
    title: "Storage networks pitch permanent data as AI training sets outgrow cloud budgets",
    content:
      "<p>Permanent-storage networks are pitching themselves to AI teams whose training corpora have outgrown predictable cloud spend. The pitch hinges on retrieval latency, which remains the sector's main objection.</p>",
    release_time: ago(38),
    author: "Demo Wire",
    source_link: "https://sosovalue.com/",
    matched_currencies: mc("AR"),
    tags: ["Storage", "AI", "AR"]
  }
];

function searchable(item: RawNews) {
  return `${item.title ?? ""} ${item.content} ${item.tags.join(" ")}`.toLowerCase();
}

export function fixtureNewsSearch(keyword: string, pageSize = 8) {
  const terms = keyword
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
  const list = RAW_NEWS.map((item) => {
    const hay = searchable(item);
    const matches = terms.filter((t) => hay.includes(t)).length;
    return { item, matches };
  })
    .sort((a, b) => b.matches - a.matches)
    .slice(0, Math.max(pageSize, 4))
    .map(({ item }) => item);
  return { code: 0, message: "success", data: { page: 1, page_size: list.length, total: list.length, list } };
}

export function fixtureHot(pageSize = 5) {
  const list = RAW_NEWS.slice(0, pageSize);
  return { code: 0, message: "success", data: { page: 1, page_size: list.length, total: list.length, list } };
}

export function fixtureSectorSpotlight() {
  return {
    code: 0,
    message: "success",
    data: {
      updated_at: now,
      sectors: [
        { name: "AI & Compute", change_24h: 4.8, change_7d: 12.4, rank: 1, symbols: ["RENDER", "TAO", "FET", "AR"] },
        { name: "Smart Contract L1", change_24h: 1.9, change_7d: 5.1, rank: 2, symbols: ["ETH", "SOL", "SUI", "AVAX"] },
        { name: "RWA", change_24h: 1.4, change_7d: 6.8, rank: 3, symbols: ["ONDO", "LINK"] },
        { name: "DeFi", change_24h: -0.6, change_7d: 2.2, rank: 4, symbols: ["AAVE", "UNI"] },
        { name: "Meme", change_24h: -3.7, change_7d: -9.4, rank: 5, symbols: ["DOGE", "WIF"] }
      ]
    }
  };
}

export function fixtureEtfHistory(symbol = "BTC", limit = 5) {
  const rows = Array.from({ length: limit }).map((_, i) => {
    const base = symbol === "BTC" ? 210 : 74;
    const wobble = [1.0, 0.42, 1.35, 0.18, 0.86][i % 5];
    return {
      date: new Date(now - (i + 1) * 86_400_000).toISOString().slice(0, 10),
      symbol,
      country_code: "US",
      net_inflow_usd: Math.round(base * 1_000_000 * wobble),
      total_net_inflow_usd: Math.round(base * 1_000_000 * wobble * (limit - i))
    };
  });
  return { code: 0, message: "success", data: rows };
}

export function fixtureIndices() {
  return {
    code: 0,
    message: "success",
    data: [
      { ticker: "ssiMAG7", name: "SoSoValue MAG7.ssi", constituents: 7 },
      { ticker: "ssiDeFi", name: "SoSoValue DeFi.ssi", constituents: 10 },
      { ticker: "ssiAI", name: "SoSoValue AI.ssi", constituents: 8 },
      { ticker: "ssiMEME", name: "SoSoValue MEME.ssi", constituents: 9 }
    ]
  };
}

const CONSTITUENTS: Record<string, { symbol: string; weight: number }[]> = {
  ssiMAG7: [
    { symbol: "BTC", weight: 0.34 },
    { symbol: "ETH", weight: 0.22 },
    { symbol: "SOL", weight: 0.14 },
    { symbol: "AVAX", weight: 0.09 },
    { symbol: "LINK", weight: 0.08 },
    { symbol: "UNI", weight: 0.07 },
    { symbol: "AAVE", weight: 0.06 }
  ],
  ssiAI: [
    { symbol: "TAO", weight: 0.27 },
    { symbol: "RENDER", weight: 0.24 },
    { symbol: "FET", weight: 0.21 },
    { symbol: "AR", weight: 0.16 },
    { symbol: "LINK", weight: 0.12 }
  ],
  ssiDeFi: [
    { symbol: "UNI", weight: 0.24 },
    { symbol: "AAVE", weight: 0.22 },
    { symbol: "LINK", weight: 0.18 },
    { symbol: "ONDO", weight: 0.16 },
    { symbol: "ETH", weight: 0.2 }
  ],
  ssiMEME: [
    { symbol: "DOGE", weight: 0.42 },
    { symbol: "WIF", weight: 0.31 },
    { symbol: "SOL", weight: 0.27 }
  ]
};

export function fixtureIndexConstituents(ticker: string) {
  const rows = CONSTITUENTS[ticker] ?? [];
  return {
    code: 0,
    message: "success",
    data: { ticker, constituents: rows.map((r) => ({ symbol: r.symbol, weight: r.weight })) }
  };
}

export function fixtureMacroEvents() {
  return {
    code: 0,
    message: "success",
    data: [
      { date: new Date(now + 2 * 86_400_000).toISOString().slice(0, 10), event: "US CPI (YoY)", importance: "high", actual: "", forecast: "3.1%" },
      { date: new Date(now + 6 * 86_400_000).toISOString().slice(0, 10), event: "FOMC rate decision", importance: "high", actual: "", forecast: "hold" },
      { date: new Date(now + 9 * 86_400_000).toISOString().slice(0, 10), event: "Spot ETH ETF weekly flows", importance: "medium", actual: "", forecast: "" }
    ]
  };
}
