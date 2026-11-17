import { NextResponse } from "next/server";
import { computeDrift, type DriftResult } from "@/lib/drift";
import { store } from "@/lib/store";
import type { Position } from "@/lib/types";

export const runtime = "nodejs";

/** The rebalance band in lib/rebalance.ts; the demo should always clear it. */
const TRIGGER_BAND = 0.035;

/**
 * Demo affordance: apply a fresh deterministic market snapshot so drift can be
 * reviewed (and rebalanced) without waiting for the real market to move. Every
 * affected screen labels the prices as simulated.
 *
 * Seeds are searched deterministically rather than trusted to luck: a stage
 * demo must breach the 3% band on the first click, not 2.46% of the time.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const position = await store.getPosition(id);
  if (!position) return NextResponse.json({ error: "Position not found" }, { status: 404 });

  let seed = Math.abs(Date.now()) % 2147483647 || 1;
  let best: { position: Position; drift: DriftResult } | null = null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = { ...position, priceSeed: seed };
    const drift = await computeDrift(candidate, candidate.weights);
    if (!best || drift.maxDrift > best.drift.maxDrift) best = { position: candidate, drift };
    if (drift.maxDrift >= TRIGGER_BAND) break;
    seed = (seed + 7919) % 2147483647;
  }

  const result = best!;
  await store.putPosition(result.position);

  return NextResponse.json({ position: result.position, drift: result.drift });
}
