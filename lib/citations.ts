import type { Citation, CitationSource } from "./types";
import { ASSET_MAP } from "./assets";

// SoSoValue v1 news items do not carry symbol tags on the current plan, but the
// title/body mention the names. Detect them deterministically with the same
// alias table the scorer uses — an article about "Bitcoin" is about BTC.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SYMBOL_PATTERNS: { symbol: string; pattern: RegExp }[] = [...ASSET_MAP.entries()].map(
  ([symbol, meta]) => {
    const aliases = [
      symbol.toLowerCase(),
      ...meta.keywords.filter((kw) => kw.length >= 4)
    ];
    return {
      symbol,
      pattern: new RegExp(`\\b(?:${[...new Set(aliases)].map(escapeRe).join("|")})\\b`, "i")
    };
  }
);

export function detectSymbols(text: string): string[] {
  if (!text) return [];
  return SYMBOL_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ symbol }) => symbol);
}

export function stripHtml(html: string | null | undefined, max = 220): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function absoluteUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

interface RawNewsLike {
  id?: string | number;
  title?: string | null;
  content?: string | null;
  summary?: string | null;
  description?: string | null;
  release_time?: number | string | null;
  publish_time?: number | string | null;
  published_at?: string | null;
  created_at?: number | string | null;
  author?: string | null;
  source?: string | null;
  publisher?: string | null;
  source_link?: string | null;
  original_link?: string | null;
  url?: string | null;
  link?: string | null;
  matched_currencies?:
    | (string | { name?: string | null; symbol?: string | null; currency?: string | null })[]
    | null;
  tags?: string[] | null;
}

function toIso(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return new Date().toISOString();
  if (typeof value === "string" && !/^\d+$/.test(value)) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
    return new Date().toISOString();
  }
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return new Date().toISOString();
  // SoSoValue v1 timestamps are UTC milliseconds.
  const ms = n < 1e12 ? n * 1000 : n;
  return new Date(ms).toISOString();
}

export function citationsFromNews(list: RawNewsLike[], source: CitationSource = "news", limit = 8): Citation[] {
  return list.slice(0, limit).map((item, i) => {
    // Feed tag wins when present (fixture/demo data and tagged tweets); otherwise
    // detect aliases. Tags arrive as "MAG7.SSI"/"binance-coin"-style tickers, so
    // normalise separators — MAG7SSI is what the universe compares against.
    const tagged = (item.matched_currencies ?? [])
      .map((c) =>
        (typeof c === "string" ? c : c?.symbol ?? c?.name ?? c?.currency ?? "")
          .trim()
          .toUpperCase()
          .replace(/[.\-_\s]/g, "")
      )
      .filter(Boolean);
    const text = `${item.title ?? ""} ${item.content ?? item.summary ?? item.description ?? ""}`;
    const symbols = tagged.length ? [...new Set(tagged)] : detectSymbols(text);
    return {
      id: `news-${item.id ?? i + 1}`,
      source,
      // Tweet-sourced items often carry no title — lead with the first words of
      // the body rather than printing "Untitled item".
      title:
        stripHtml(item.title ?? "", 160) ||
        stripHtml(item.content ?? item.summary ?? item.description, 110) ||
        "Untitled item",
      url: absoluteUrl(item.source_link ?? item.original_link ?? item.url ?? item.link),
      publisher: (item.author ?? item.source ?? item.publisher)?.trim() || "SoSoValue",
      snippet: stripHtml(item.content ?? item.summary ?? item.description, 200),
      publishedAt: toIso(
        item.release_time ?? item.publish_time ?? item.published_at ?? item.created_at
      ),
      symbols
    };
  });
}

export function etfCitation(symbol: string, rows: { date?: string; net_inflow_usd?: number }[]): Citation | null {
  if (!rows.length) return null;
  const latest = rows[0];
  const total = rows.reduce((sum, r) => sum + (r.net_inflow_usd ?? 0), 0);
  const direction = total >= 0 ? "net inflow" : "net outflow";
  const fmt = (n: number) =>
    `${n < 0 ? "-" : ""}$${Math.abs(n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  return {
    id: `etf-${symbol.toLowerCase()}`,
    source: "etf",
    title: `${symbol} spot ETF flows: ${fmt(total)} ${direction} over ${rows.length} sessions`,
    url: "https://sosovalue.com/assets/etf",
    publisher: "SoSoValue ETF flows",
    snippet: `Latest session ${latest.date ?? "n/a"}: ${fmt(latest.net_inflow_usd ?? 0)}. Aggregate over the window: ${fmt(total)}.`,
    publishedAt: new Date().toISOString(),
    symbols: [symbol.toUpperCase()]
  };
}

export function sectorCitation(
  sectors: { name?: string; change24h?: number; change7d?: number }[]
): Citation | null {
  if (!sectors.length) return null;
  const sorted = [...sectors].sort(
    (a, b) => (b.change24h ?? -Infinity) - (a.change24h ?? -Infinity)
  );
  const leader = sorted[0];
  const laggard = sorted[sorted.length - 1];
  const pct = (n?: number) => (typeof n === "number" ? `${n > 0 ? "+" : ""}${n.toFixed(1)}%` : "n/a");
  return {
    id: "sector-spotlight",
    source: "sector",
    title: `Sector spotlight: ${leader.name ?? "leader"} ${pct(leader.change24h)} 24h, ${laggard.name ?? "laggard"} ${pct(laggard.change24h)}`,
    url: "https://sosovalue.com/",
    publisher: "SoSoValue sector spotlight",
    snippet: `Seven-day read: ${leader.name ?? "leader"} ${pct(leader.change7d)}, ${laggard.name ?? "laggard"} ${pct(laggard.change7d)}.`,
    publishedAt: new Date().toISOString(),
    symbols: []
  };
}

export function indexCitation(ticker: string, name: string, count: number): Citation {
  return {
    id: `index-${ticker}`,
    source: "index",
    title: `${name} — ${count} published constituents`,
    url: "https://sosovalue.com/ssi",
    publisher: "SoSoValue Indexes",
    snippet: `Methodology reference used to sanity-check the compiled basket against an existing published index.`,
    publishedAt: new Date().toISOString(),
    symbols: []
  };
}

export function macroCitation(events: { date?: string; event?: string; importance?: string; forecast?: string }[]): Citation | null {
  if (!events.length) return null;
  const next = events[0];
  return {
    id: "macro-next",
    source: "macro",
    title: `Next macro event: ${next.event ?? "n/a"} on ${next.date ?? "n/a"}`,
    url: "https://sosovalue.com/macro",
    publisher: "SoSoValue macro",
    snippet: `Importance ${next.importance ?? "n/a"}${next.forecast ? `, consensus ${next.forecast}` : ""}. Position sizing should account for the event window.`,
    publishedAt: new Date().toISOString(),
    symbols: []
  };
}
