import {
  fixtureEtfHistory,
  fixtureHot,
  fixtureIndexConstituents,
  fixtureIndices,
  fixtureMacroEvents,
  fixtureNewsSearch,
  fixtureSectorSpotlight
} from "./fixtures";

const BASE = process.env.SOSO_BASE_URL || "https://openapi.sosovalue.com/openapi/v1";
const TIMEOUT_MS = Number(process.env.SOSO_TIMEOUT_MS || 8000);

export function hasSosoKey() {
  return Boolean(process.env.SOSO_API_KEY);
}

export type SosoResult<T> = { data: T; live: boolean };

async function sosoGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "x-soso-api-key": process.env.SOSO_API_KEY as string, accept: "application/json" },
      signal: controller.signal,
      cache: "no-store"
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || (typeof body.code === "number" && body.code !== 0)) {
      throw new Error(`SoSoValue ${res.status} on ${path}${body?.code ? ` (code ${body.code})` : ""}`);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Runs live when a key is present, otherwise serves the demo dataset. Never throws. */
async function withFallback<T>(live: () => Promise<T>, fallback: () => T, label: string): Promise<SosoResult<T>> {
  if (!hasSosoKey()) return { data: fallback(), live: false };
  try {
    return { data: await live(), live: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[sosovalue] ${label} fell back to demo data: ${message}`);
    return { data: fallback(), live: false };
  }
}

async function newsSearchAdaptive(query: string, pageSize: number) {
  const terms = [...new Set(query.split(/\s+/).filter(Boolean))];
  // SoSoValue ANDs multi-word queries — "bitcoin ether spot inflows persist"
  // returns zero. A thesis usually names several dimensions (sector, catalyst,
  // outcome), so probe each distinctive term in parallel and union the results;
  // each dimension of the thesis gets to bring its own evidence to the table.
  const probes = terms.slice(0, 3);
  const perTerm = Math.max(2, Math.ceil(pageSize / Math.max(probes.length, 1)));
  const settled = await Promise.allSettled(
    probes.map((term) =>
      sosoGet<{ data?: { list?: Record<string, unknown>[] } }>("/news/search", {
        keyword: term,
        page_size: perTerm
      })
    )
  );
  const seen = new Set<string>();
  const list: Record<string, unknown>[] = [];
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value?.data?.list ?? []) {
      const id = String(item?.id ?? JSON.stringify(item).slice(0, 80));
      if (seen.has(id)) continue;
      seen.add(id);
      list.push(item);
      if (list.length >= pageSize) break;
    }
    if (list.length >= pageSize) break;
  }
  if (list.length === 0) {
    return sosoGet("/news/search", { keyword: terms[0] ?? query, page_size: pageSize });
  }
  return {
    code: 0 as const,
    message: "success",
    data: { page: 1, page_size: list.length, total: list.length, list }
  };
}

export const sosovalue = {
  newsSearch: (keyword: string, pageSize = 8) =>
    withFallback(
      () => newsSearchAdaptive(keyword, pageSize),
      () => fixtureNewsSearch(keyword, pageSize),
      "news/search"
    ),

  newsHot: (pageSize = 5) =>
    withFallback(
      () => sosoGet("/news/hot", { page_size: pageSize }),
      () => fixtureHot(pageSize),
      "news/hot"
    ),

  newsPick: (pageSize = 5) =>
    withFallback(
      () => sosoGet("/news/pick", { page_size: pageSize }),
      () => fixtureHot(pageSize),
      "news/pick"
    ),

  sectorSpotlight: () =>
    withFallback(
      () => sosoGet("/currencies/sector-spotlight"),
      () => fixtureSectorSpotlight(),
      "sector-spotlight"
    ),

  etfSummary: (symbol: string, limit = 5) =>
    withFallback(
      () => sosoGet("/etfs/summary-history", { symbol, country_code: "US", limit }),
      () => fixtureEtfHistory(symbol, limit),
      "etfs/summary-history"
    ),

  indices: () =>
    withFallback(
      () => sosoGet("/indices"),
      () => fixtureIndices(),
      "indices"
    ),

  indexConstituents: (ticker: string) =>
    withFallback(
      () => sosoGet(`/indices/${encodeURIComponent(ticker)}/constituents`),
      () => fixtureIndexConstituents(ticker),
      "index constituents"
    ),

  macroEvents: () =>
    withFallback(
      () => sosoGet("/macro/events"),
      () => fixtureMacroEvents(),
      "macro/events"
    )
};
