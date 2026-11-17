#!/usr/bin/env node
/**
 * Live-contract probe for the SoSoValue v1 API.
 *
 *   npm run check:soso
 *
 * Reads SOSO_API_KEY from the environment or .env.local, hits every endpoint
 * the compiler depends on, and prints the envelope plus the first record so a
 * response-shape mismatch is visible before it turns into empty citations.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");

if (existsSync(envPath) && !process.env.SOSO_API_KEY) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

const key = process.env.SOSO_API_KEY;
if (!key) {
  console.error("No SOSO_API_KEY found in the environment or .env.local.");
  console.error("Get a free key at https://sosovalue.com/developer and add:");
  console.error("  SOSO_API_KEY=...");
  process.exit(2);
}

const base = process.env.SOSO_BASE_URL || "https://openapi.sosovalue.com/openapi/v1";

async function probe(label, pathname, params = {}) {
  const url = new URL(`${base}${pathname}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "x-soso-api-key": key, accept: "application/json" },
      signal: AbortSignal.timeout(15000)
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 200);
    }
    const code = typeof body?.code === "number" ? body.code : "n/a";
    const ok = res.ok && (code === 0 || code === "n/a");
    const data = body?.data;
    const list = Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : null;
    const sample = list?.[0] ?? (Array.isArray(data) ? data[0] : data);
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${label.padEnd(28)} ${res.status}  code=${code}  ${Date.now() - started}ms`
    );
    if (!ok) console.log(`      message: ${body?.message ?? "(none)"}  body: ${text.slice(0, 160)}`);
    if (sample && typeof sample === "object") {
      const fields = Object.keys(sample).slice(0, 14).join(", ");
      console.log(`      fields: ${fields}`);
      const first = sample.title ?? sample.name ?? sample.symbol ?? sample.ticker ?? sample.event ?? "";
      if (first) console.log(`      first:  ${String(first).slice(0, 120)}`);
    }
    return { ok, body };
  } catch (error) {
    console.log(`FAIL  ${label.padEnd(28)} ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, body: null };
  }
}

console.log(`SoSoValue probe → ${base}\n`);
const results = [];

results.push(await probe("news/search", "/news/search", { keyword: "bitcoin etf", page_size: 5 }));
results.push(await probe("news/hot", "/news/hot", { page_size: 5 }));
results.push(await probe("news/pick", "/news/pick", { page_size: 5 }));
results.push(await probe("sector-spotlight", "/currencies/sector-spotlight"));
results.push(await probe("etfs/summary-history BTC", "/etfs/summary-history", { symbol: "BTC", country_code: "US", limit: 5 }));
results.push(await probe("etfs/summary-history ETH", "/etfs/summary-history", { symbol: "ETH", country_code: "US", limit: 5 }));
const indices = await probe("indices", "/indices");
results.push(indices);

const indexData = indices.body?.data;
const indexRows = Array.isArray(indexData) && indexData.every((s) => typeof s === "string")
  ? indexData.map((s) => ({ ticker: s }))
  : Array.isArray(indexData)
    ? indexData
    : Array.isArray(indexData?.list)
      ? indexData.list
      : [];
const ticker = indexRows[0]?.ticker ?? indexRows[0]?.index_ticker;
if (ticker) {
  results.push(await probe(`indices/${ticker}/constituents`, `/indices/${encodeURIComponent(ticker)}/constituents`));
} else {
  console.log("SKIP  indices/{ticker}/constituents  no ticker in /indices response");
}

results.push(await probe("macro/events", "/macro/events"));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} endpoints passed.`);
process.exit(failed ? 1 : 0);
