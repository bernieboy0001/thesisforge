import { promises as fs } from "node:fs";
import path from "node:path";
import type { Position, Thesis, Order } from "./types";

interface Db {
  theses: Thesis[];
  positions: Position[];
  orders: Order[];
}

const EMPTY: Db = { theses: [], positions: [], orders: [] };
const DATA_DIR = process.env.THESISFORGE_DATA_DIR || path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const DB_KEY = process.env.THESISFORGE_DB_KEY || "thesisforge:db";

const REDIS_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  null;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  null;
const hasRedis = Boolean(REDIS_URL && REDIS_TOKEN);

/**
 * Tiny store with two backends. Locally it is the same file-backed JSON as before
 * (survives dev restarts, inspectable). On Vercel the filesystem is read-only, so
 * when an Upstash/Vercel KV endpoint is configured the whole db lives in one Redis
 * key instead — persistent across serverless instances with zero code changes at
 * the call sites. If Redis is configured but unreachable, we degrade to an
 * in-memory db and log loudly rather than crash the demo.
 */
declare global {
  // eslint-disable-next-line no-var
  var __thesisforgeDb: Db | undefined;
  // eslint-disable-next-line no-var
  var __thesisforgeQueue: Promise<unknown> | undefined;
}

function normalise(parsed: Partial<Db> | null | undefined): Db {
  return {
    theses: Array.isArray(parsed?.theses) ? parsed.theses : [],
    positions: Array.isArray(parsed?.positions) ? parsed.positions : [],
    orders: Array.isArray(parsed?.orders) ? parsed.orders : []
  };
}

async function redisCommand<T>(command: unknown[]): Promise<T | null> {
  const res = await fetch(REDIS_URL as string, {
    method: "POST",
    headers: {
      authorization: `Bearer ${REDIS_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(command),
    cache: "no-store"
  });
  const body = (await res.json().catch(() => null)) as { result?: T; error?: string } | null;
  if (!res.ok || body?.error) throw new Error(`KV rejected ${String(command[0])}: ${body?.error ?? res.status}`);
  return (body?.result ?? null) as T | null;
}

async function readDb(): Promise<Db> {
  if (hasRedis) {
    try {
      const raw = await redisCommand<string>(["GET", DB_KEY]);
      return normalise(raw ? (JSON.parse(raw) as Partial<Db>) : null);
    } catch (error) {
      console.warn("[store] KV read failed; keeping in-memory db for this instance:", error);
      if (!globalThis.__thesisforgeDb) globalThis.__thesisforgeDb = { ...EMPTY };
      return globalThis.__thesisforgeDb;
    }
  }

  if (globalThis.__thesisforgeDb) return globalThis.__thesisforgeDb;
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    globalThis.__thesisforgeDb = normalise(JSON.parse(raw) as Partial<Db>);
    return globalThis.__thesisforgeDb;
  } catch {
    globalThis.__thesisforgeDb = { ...EMPTY };
    return globalThis.__thesisforgeDb;
  }
}

async function writeDb(db: Db) {
  globalThis.__thesisforgeDb = db;
  if (hasRedis) {
    try {
      await redisCommand(["SET", DB_KEY, JSON.stringify(db)]);
    } catch (error) {
      console.warn("[store] KV write failed; db kept in memory only:", error);
    }
    return;
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (error) {
    // Read-only filesystems (e.g. Vercel before KV is connected) must not 500
    // the demo — keep the db in memory for this instance and warn loudly.
    console.warn("[store] file write failed; db kept in memory only:", error);
  }
}

/** Serialises mutations so concurrent requests cannot interleave a read-modify-write. */
function mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  };
  const prev = globalThis.__thesisforgeQueue ?? Promise.resolve();
  const next = prev.then(run, run);
  globalThis.__thesisforgeQueue = next.catch(() => undefined);
  return next;
}

export const store = {
  async allTheses(): Promise<Thesis[]> {
    const db = await readDb();
    return [...db.theses].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async getThesis(id: string): Promise<Thesis | null> {
    const db = await readDb();
    return db.theses.find((t) => t.id === id) ?? null;
  },

  async putThesis(thesis: Thesis): Promise<Thesis> {
    return mutate((db) => {
      const i = db.theses.findIndex((t) => t.id === thesis.id);
      if (i >= 0) db.theses[i] = thesis;
      else db.theses.unshift(thesis);
      return thesis;
    });
  },

  /** Follow / copy counters only — cheap and race-free. */
  async bumpThesis(id: string, field: "followers" | "copies"): Promise<Thesis | null> {
    return mutate((db) => {
      const t = db.theses.find((x) => x.id === id);
      if (!t) return null;
      t[field] = (t[field] ?? 0) + 1;
      return t;
    });
  },

  async published(): Promise<Thesis[]> {
    const all = await this.allTheses();
    return all.filter((t) => t.status === "published");
  },

  async positions(): Promise<Position[]> {
    const db = await readDb();
    return [...db.positions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async getPosition(id: string): Promise<Position | null> {
    const db = await readDb();
    return db.positions.find((p) => p.id === id) ?? null;
  },

  async putPosition(position: Position): Promise<Position> {
    return mutate((db) => {
      const i = db.positions.findIndex((p) => p.id === position.id);
      if (i >= 0) db.positions[i] = position;
      else db.positions.unshift(position);
      return position;
    });
  },

  async orders(): Promise<Order[]> {
    const db = await readDb();
    return [...db.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async addOrders(orders: Order[]): Promise<Order[]> {
    return mutate((db) => {
      db.orders.unshift(...orders);
      return orders;
    });
  },

  async totals() {
    const db = await readDb();
    const notional = db.orders.reduce((s, o) => s + o.notionalUsd, 0);
    return {
      theses: db.theses.length,
      published: db.theses.filter((t) => t.status === "published").length,
      positions: db.positions.length,
      orders: db.orders.length,
      tradedNotionalUsd: notional,
      builderFeesUsd: db.orders.reduce((s, o) => s + o.builderFeeUsd, 0)
    };
  }
};
