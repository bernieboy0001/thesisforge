import { ASSET_MAP, DEFAULT_UNIVERSE, sodexPair, nameToTicker, sectorSymbols } from "./assets";
import { allocate, assessRisk, METHODOLOGY, citationIdsFor } from "./basket-engine";
import { citationsFromNews, etfCitation, indexCitation, macroCitation, sectorCitation } from "./citations";
import { fetchSpotSymbols, sodexConfig } from "./sodex";
import { sosovalue } from "./sosovalue";
import type { AssetWeight, Basket, Citation, DataMode, Engine, SignalBreakdown, Thesis } from "./types";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function listOf(body: unknown): Record<string, unknown>[] {
  const root = body as { data?: unknown } | undefined;
  const data = root?.data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const inner = data as Record<string, unknown>;
    const list = inner.list ?? inner.sectors ?? inner.constituents ?? inner.data;
    if (Array.isArray(list)) return list as Record<string, unknown>[];
  }
  return [];
}

interface Sector {
  name: string;
  change24h: number;
  change7d: number;
  symbols: string[];
}

function parseSectors(body: unknown): Sector[] {
  // Live shape: { data: { sector: [{name, change_pct_24h, marketcap_dom}], spotlight: [...] } }
  // with change expressed as a fraction; fixtures use { data: { sectors: [{name, change_24h, change_7d, symbols}] } }
  // with whole percent. Accept all of them.
  const root = body as { data?: { sector?: unknown; sectors?: unknown; spotlight?: unknown } } | undefined;
  const arr = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
  let rows = [...arr(root?.data?.sector), ...arr(root?.data?.sectors), ...arr(root?.data?.spotlight)];
  if (!rows.length) rows = listOf(body);
  return rows
    .map((row) => {
      const name = String(row.name ?? row.sector ?? "Unclassified");
      const rawPct = row.change_pct_24h ?? row.change_pct_1d ?? row.change_24h ?? row.change24h ?? row.change;
      let change24h = Number(rawPct ?? 0);
      const liveFraction =
        row.change_pct_24h !== undefined || row.change_pct_1d !== undefined;
      // A live fraction is at most ±1 by construction; fixture percents are not.
      if (liveFraction && Math.abs(change24h) <= 1) change24h = change24h * 100;
      const raw7d = row.change_7d ?? row.change7d;
      return {
        name,
        change24h,
        // The live feed only publishes 24h; reuse it so momentum is honest rather than invented.
        change7d: raw7d !== undefined ? Number(raw7d) : change24h,
        symbols: Array.isArray(row.symbols)
          ? (row.symbols as unknown[]).map((s) => String(s).toUpperCase())
          : sectorSymbols(name)
      };
    })
    .filter((s) => Number.isFinite(s.change24h));
}

function parseEtfRows(body: unknown): { date?: string; net_inflow_usd?: number }[] {
  return listOf(body).map((row) => ({
    date: typeof row.date === "string" ? row.date : undefined,
    // Live `etfs/summary-history` uses total_net_inflow in USD.
    net_inflow_usd: Number(
      row.net_inflow_usd ?? row.total_net_inflow_usd ?? row.net_inflow ?? row.total_net_inflow ?? 0
    )
  }));
}

/** Live macro/events is grouped by date: { date, events: [...] } — flatten to rows. */
function macroRowsOf(
  body: unknown
): { date?: string; event?: string; importance?: string; forecast?: string }[] {
  const data = (body as { data?: unknown })?.data;
  if (!Array.isArray(data)) return listOf(body);
  const rows: { date?: string; event?: string; importance?: string; forecast?: string }[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as { date?: string; events?: unknown; event?: string; importance?: string; forecast?: string };
    if (Array.isArray(e.events)) {
      for (const ev of e.events) rows.push({ date: e.date, event: String(ev) });
    } else if (e.event) {
      rows.push({ date: e.date, event: String(e.event), importance: e.importance, forecast: e.forecast });
    } else {
      rows.push({ date: e.date, event: String(e.importance ?? "event") });
    }
  }
  return rows;
}

function sectorOf(sectors: Sector[], symbol: string): Sector | undefined {
  // Sector feeds send upper-case tickers; the curated universe keeps display
  // casing (XAUt, MAG7ssi), so compare normalised.
  return sectors.find((s) => s.symbols.includes(symbol.toUpperCase()));
}

/**
 * Deterministic keyword match — no LLM required, so weights are reproducible and
 * auditable. Longest alias wins, so a prompt naming "solana" does not also count
 * the bare "sol" alias, and "layer 1" does not also count "l1". Without that,
 * score depends on how many overlapping aliases a ticker happens to carry.
 */
function matchedKeywords(text: string, keywords: string[]): string[] {
  const hits: string[] = [];
  for (const kw of [...keywords].sort((a, b) => b.length - a.length)) {
    if (!text.includes(kw)) continue;
    if (hits.some((hit) => hit.includes(kw))) continue;
    hits.push(kw);
  }
  return hits;
}

/** Discrete 0.2-per-theme credit, capped at three themes. */
function keywordAlignment(text: string, keywords: string[]): number {
  return Math.min(0.6, matchedKeywords(text, keywords).length * 0.2);
}

/** Canonical symbol casing for mixed-case tickers (XAUt, MAG7ssi, USSI). */
const CANONICAL_SYMBOL = new Map([...ASSET_MAP.keys()].map((symbol) => [symbol.toLowerCase(), symbol]));

/** Below this many evidenced names a basket is too thin to be an index. */
const MIN_EVIDENCED_ASSETS = 4;

/**
 * Clauses that exclude an exposure must not score it. Without this, "avoids
 * meme risk" matched DOGE's "meme" keyword and the compiler bought the exact
 * thing the prompt ruled out.
 */
const NEGATION = /\b(avoid|avoids|avoiding|exclude|excludes|excluding|skip|skips|omit|omits|without|no|not|never|stay away|keep out)\b/i;

function splitClauses(prompt: string): string[] {
  return prompt.split(/(?<=[.;:,!?])\s+|\n+/);
}

function affirmativeText(prompt: string): string {
  return splitClauses(prompt).filter((clause) => !NEGATION.test(clause)).join(" ");
}

/**
 * Distinctive words from the rule-out clauses ("avoids meme risk" → {meme, risk, …}).
 * Anything sharing a theme with a rule-out clause is excluded entirely — a headline
 * about meme baskets underperforming is support for ruling them out, not evidence
 * that buying them serves the thesis.
 */
/**
 * Generic finance words that frequently appear inside rule-out clauses ("the basket
 * stays defensive") but that name no asset theme. Without this, "avoids meme risk,
 * keep the basket tight" would ban every index whose keyword contains "basket".
 * The rule-out filter must key on theme nouns (meme, solana, oracle), not on the
 * scaffolding of the sentence.
 */
const RULEOUT_STOPWORDS = new Set([
  "basket", "risk", "exposure", "position", "thesis", "stays", "stay", "sized",
  "portfolio", "asset", "assets", "allocation", "allocations", "capital", "class",
  "volatile", "volatility", "chasing", "overpriced", "overpaying", "while", "since", "because"
]);

function negatedTokens(prompt: string): Set<string> {
  const tokens = new Set<string>();
  for (const clause of splitClauses(prompt)) {
    if (!NEGATION.test(clause)) continue;
    for (const token of clause.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []) {
      if (!RULEOUT_STOPWORDS.has(token)) tokens.add(token);
    }
  }
  return tokens;
}

function againstThesis(keywords: string[], negated: Set<string>): boolean {
  for (const kw of keywords) {
    for (const token of kw.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []) {
      if (negated.has(token)) return true;
    }
  }
  return false;
}

function matchesSymbol(citation: Citation, symbol: string): boolean {
  const target = symbol.toUpperCase();
  return citation.symbols.some((s) => s.toUpperCase() === target);
}

/**
 * A headline is only evidence to *buy* the name when it is not saying the theme
 * failed. "Meme baskets underperform as positioning unwinds" mentions DOGE, but
 * counting that as support would buy the exact thing a defensive thesis rules
 * out. Bearish-only coverage still shows in the source trail — it just grants no
 * alignment credit and no membership.
 */
const BEARISH = /\b(underperform\w*|unwind\w*|sell[- ]?off\w*|rout\b|plunge\w*|plunging|slump\w*|crash\w*|collaps\w*|tumble\w*|dump\w*|wipeout)\b/i;

function isBearishHeadline(citation: Citation): boolean {
  return BEARISH.test(`${citation.title} ${citation.snippet}`);
}

const STOPWORDS = new Set([
  "this", "that", "with", "from", "while", "when", "what", "your", "have", "just", "like", "more",
  "most", "into", "over", "only", "also", "than", "then", "they", "them", "their", "should", "would",
  "could", "every", "each", "need", "needs", "keep", "park", "long", "core", "defensive", "basket",
  "exposure", "position", "thesis", "sized", "stays", "stay", "lead", "following", "follows", "own",
  "rotation", "stack", "system", "layer", "spot", "tokenised", "tokenized"
]);

/**
 * news/search takes a keyword, not a paragraph. Six distinctive terms retrieve
 * better than a 600-character thesis and keep the call cacheable.
 */
function buildSearchQuery(text: string, maxTerms = 6): string {
  const words = text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
  const picked: string[] = [];
  const seen = new Set<string>();
  for (const word of words) {
    if (STOPWORDS.has(word) || seen.has(word)) continue;
    seen.add(word);
    picked.push(word);
    if (picked.length >= maxTerms) break;
  }
  return picked.join(" ") || text.slice(0, 80);
}

export interface CompileOptions {
  prompt: string;
  engine?: Engine;
  universe?: string[];
  author?: { address: string; name?: string };
  id?: string;
}

export async function compileThesis(options: CompileOptions): Promise<Thesis> {
  const prompt = options.prompt.trim();
  const engine: Engine = options.engine ?? "spot";
  const requested = (options.universe?.length ? options.universe : DEFAULT_UNIVERSE)
    .map((s) => CANONICAL_SYMBOL.get(String(s).trim().toLowerCase()))
    .filter((s): s is string => Boolean(s));
  const promptLower = prompt.toLowerCase();
  // Keyword scoring runs against what the prompt asks *for*, not what it rules
  // out; citations still come from the raw prompt so negations stay visible.
  const screenText = affirmativeText(prompt).toLowerCase();
  const sourcesQueried: string[] = [];

  const [newsRes, hotRes, sectorRes, btcEtfRes, ethEtfRes, indicesRes, macroRes, symbolRes] = await Promise.all([
    sosovalue.newsSearch(buildSearchQuery(screenText), 8),
    sosovalue.newsHot(5),
    sosovalue.sectorSpotlight(),
    sosovalue.etfSummary("BTC", 5),
    sosovalue.etfSummary("ETH", 5),
    sosovalue.indices(),
    sosovalue.macroEvents(),
    fetchSpotSymbols()
  ]);

  sourcesQueried.push(
    ...["news/search", "news/hot", "currencies/sector-spotlight", "etfs/summary-history: BTC", "etfs/summary-history: ETH", "indices", "macro/events", "sodex/spot/markets/symbols"]
  );

  const cfg = sodexConfig();
  const excluded: { symbol: string; pair: string; reason: string }[] = [];
  // A rule-out clause removes the whole theme from the universe, so a meme-basket
  // headline can never become silent evidence for buying DOGE.
  const ruledOut = negatedTokens(prompt);
  const universe = requested.filter((symbol) => {
    const meta = ASSET_MAP.get(symbol)!;
    const pair = sodexPair(meta, engine);
    if (againstThesis(meta.keywords, ruledOut)) {
      excluded.push({ symbol, pair: pair ?? "—", reason: "ruled out by the thesis" });
      return false;
    }
    if (!pair) {
      excluded.push({ symbol, pair: "—", reason: `no ${engine} pair` });
      return false;
    }
    if (symbolRes.live && !symbolRes.ids.has(pair)) {
      excluded.push({ symbol, pair, reason: `not listed on SoDEX ${cfg.network}` });
      return false;
    }
    return true;
  });

  if (universe.length === 0) {
    throw new Error("None of the requested assets are listed on the active SoDEX network.");
  }

  const liveCount = [newsRes, hotRes, sectorRes, btcEtfRes, ethEtfRes, indicesRes, macroRes].filter((r) => r.live).length;
  const dataMode: DataMode = liveCount > 0 ? "live" : "demo";

  const searchCitations = citationsFromNews(listOf(newsRes.data), "news", 8);
  const hotCitations = citationsFromNews(listOf(hotRes.data), "news", 3).filter(
    (c) => !searchCitations.some((s) => s.title === c.title)
  );

  const sectors = parseSectors(sectorRes.data);
  const btcEtf = parseEtfRows(btcEtfRes.data);
  const ethEtf = parseEtfRows(ethEtfRes.data);

  // Pick the published SSI closest to the thesis, used as a methodology cross-check.
  // Live `/indices` returns a bare string array (["ssiDeFi", …]); fixtures return objects.
  const indicesData = (indicesRes.data as { data?: unknown })?.data;
  const indexRows: { ticker: string; name: string }[] =
    Array.isArray(indicesData) && indicesData.every((x) => typeof x === "string")
      ? (indicesData as string[]).map((ticker) => ({
          ticker,
          name: `SoSoValue ${ticker.replace(/^ssi/i, "")}.ssi`
        }))
      : listOf(indicesRes.data).map((row) => ({
          ticker: String(row.ticker ?? row.index_ticker ?? ""),
          name: String(row.name ?? row.ticker ?? row.index_ticker ?? "SoSoValue index")
        }));
  let matchedIndex: { ticker: string; name: string; count: number } | null = null;
  let matchedIndexSymbols: string[] = [];
  let bestScore = 0;
  for (const row of indexRows.slice(0, 4)) {
    const ticker = row.ticker;
    if (!ticker) continue;
    const constituentRes = await sosovalue.indexConstituents(ticker);
    sourcesQueried.push(`indices/${ticker}/constituents`);
    const constituents = listOf(constituentRes.data)
      .map((c) => nameToTicker(String(c.symbol ?? c.name ?? "")))
      .filter(Boolean);
    const overlap = constituents.filter((s) => promptLower.includes(s.toLowerCase())).length;
    const tickerWord = ticker.toLowerCase().replace("ssi", "");
    const nameHit = promptLower.includes(tickerWord) ? 3 : 0;
    if (overlap + nameHit > bestScore) {
      bestScore = overlap + nameHit;
      matchedIndex = { ticker, name: row.name, count: constituents.length };
      matchedIndexSymbols = constituents;
    }
  }
  if (bestScore === 0) {
    matchedIndex = null;
    matchedIndexSymbols = [];
  }

  const citations: Citation[] = [...searchCitations, ...hotCitations];
  const btcEtfCitation = etfCitation("BTC", btcEtf);
  if (btcEtfCitation) citations.push(btcEtfCitation);
  const ethEtfCitation = etfCitation("ETH", ethEtf);
  if (ethEtfCitation) citations.push(ethEtfCitation);
  const sectorCit = sectorCitation(sectors);
  if (sectorCit) citations.push(sectorCit);
  if (matchedIndex) citations.push(indexCitation(matchedIndex.ticker, matchedIndex.name, matchedIndex.count));
  const macroCit = macroCitation(macroRowsOf(macroRes.data));
  if (macroCit) citations.push(macroCit);

  const signals = universe.map((symbol) => {
    const meta = ASSET_MAP.get(symbol)!;
    const sector = sectorOf(sectors, symbol);
    const keywordHits = matchedKeywords(screenText, meta.keywords).length;

    let alignment = 0.08 + keywordAlignment(screenText, meta.keywords);
    // Only news retrieved *for this prompt* is evidence of thesis alignment. The
    // hot feed is shown in the source trail, but a generic market headline that
    // merely mentions a ticker must not outrank the theme the user actually wrote.
    const matchedNews = searchCitations
      .filter((c) => matchesSymbol(c, symbol))
      .filter((c) => !isBearishHeadline(c));
    alignment += Math.min(0.32, matchedNews.length * 0.085);
    const indexHit = matchedIndexSymbols.some((s) => s.toUpperCase() === symbol.toUpperCase());
    if (indexHit) alignment += 0.05;
    if (symbol === "BTC" || symbol === "ETH") alignment += 0.02;
    alignment = clamp01(alignment);

    let flow = 0.35;
    if (symbol === "BTC" || symbol === "ETH") {
      const rows = symbol === "BTC" ? btcEtf : ethEtf;
      if (rows.length) {
        const total = rows.reduce((a, r) => a + (r.net_inflow_usd ?? 0), 0);
        flow = clamp01(0.5 + Math.tanh(total / 1_200_000_000) * 0.45);
      }
    } else if (sector) {
      flow = clamp01(0.5 + sector.change24h / 12);
    }

    let momentum = sector ? clamp01(0.5 + sector.change7d / 24) : 0.5;

    // A theme the prompt names explicitly is evidence for that name, so it gets a
    // modest flow/momentum floor — otherwise unconditional majors liquidity and
    // the lower risk penalty would outrank every thematic pick.
    if (keywordHits > 0) {
      flow = Math.max(flow, 0.45);
      momentum = Math.max(momentum, 0.52);
    }

    // An asset with no citation and no keyword hit gets no sector-momentum
    // credit: sector beta alone is not evidence for a specific name.
    if (matchedNews.length === 0 && keywordHits === 0) {
      flow = Math.min(flow, 0.45);
      momentum = Math.min(momentum, 0.45);
    }

    const breakdown: SignalBreakdown = {
      thesisAlignment: Number(alignment.toFixed(4)),
      flowSignal: Number(flow.toFixed(4)),
      momentum: Number(momentum.toFixed(4)),
      liquidity: meta.liquidity,
      riskPenalty: meta.riskPenalty
    };

    return {
      symbol,
      signals: breakdown,
      // Membership evidence: the thesis names it, a retrieved source covers it in a
      // non-negative story, or it sits in the published index closest to the thesis.
      evidence: keywordHits > 0 || matchedNews.length > 0 || indexHit
    };
  });

  /**
   * Softmax gives every candidate some mass, so the tail used to be filled with
   * whatever happened to be liquid — a "treasuries + gold" thesis ended up
   * holding NVDA and AVAX for no stated reason. Only evidenced names may be
   * bought. If a prompt is too thin to support four names we fall back to the
   * full universe so the breadth check can fail honestly instead of throwing.
   */
  const evidenced = signals.filter((s) => s.evidence);
  const pool = evidenced.length >= MIN_EVIDENCED_ASSETS ? evidenced : signals;
  const allocated = allocate(pool.map(({ symbol, signals: breakdown }) => ({ symbol, signals: breakdown })));
  const skippedForEvidence = signals.length - pool.length;

  const assets: AssetWeight[] = allocated.map((a) => {
    const meta = ASSET_MAP.get(a.symbol)!;
    const matched = searchCitations.filter((c) => matchesSymbol(c, a.symbol) && !isBearishHeadline(c));
    const citationIds = citationIdsFor(a.symbol, citations);
    const pair = sodexPair(meta, engine);

    let reason: string;
    if (matched.length) {
      const top = matched[0];
      const when = new Date(top.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      reason = `${matched.length} matched source${matched.length > 1 ? "s" : ""}, led by “${top.title}” (${top.publisher}, ${when}).`;
    } else if (citationIds.length > 0) {
      reason = `No thesis-specific headline in this window — carried by ${meta.sector.toLowerCase()} flow, index/macro evidence and liquidity.`;
    } else {
      reason = `No direct coverage in this window — held on ${meta.sector.toLowerCase()} momentum and liquidity only.`;
    }

    return {
      symbol: a.symbol,
      name: meta.name,
      targetWeight: a.targetWeight,
      reason,
      citationIds,
      score: a.score,
      signals: a.signals,
      symbolVerified: Boolean(pair) && (!symbolRes.live || symbolRes.ids.has(pair!))
    };
  });

  const risk = assessRisk(assets);
  const thesisId = options.id ?? crypto.randomUUID();

  const basket: Basket = {
    id: crypto.randomUUID(),
    thesisId,
    version: 1,
    assets,
    risk,
    methodology: METHODOLOGY,
    universe,
    excluded,
    engine,
    createdAt: new Date().toISOString()
  };

  const covered = assets.filter((a) => a.citationIds.length > 0).length;
  const summary =
    `Compiled ${assets.length} positions from ${citations.length} retrieved sources across ${sourcesQueried.length} feed calls. ` +
    `${covered}/${assets.length} positions carry at least one citation.` +
    (skippedForEvidence
      ? ` ${skippedForEvidence} liquid names skipped: no thesis evidence.`
      : "") +
    (matchedIndex ? ` Closest published index: ${matchedIndex.name}.` : " No published index matched this thesis closely.") +
    (excluded.length
      ? ` ${excluded.length} requested asset${excluded.length > 1 ? "s" : ""} excluded as not routable on ${cfg.network}: ${excluded.map((e) => e.symbol).join(", ")}.`
      : "");

  return {
    id: thesisId,
    prompt,
    summary,
    status: "draft",
    basket,
    citations,
    author: options.author ?? { address: "0x0000000000000000000000000000000000000000", name: "You" },
    followers: 0,
    copies: 0,
    dataMode,
    sourcesQueried,
    createdAt: new Date().toISOString()
  };
}
