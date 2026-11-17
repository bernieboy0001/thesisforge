import { NextResponse } from "next/server";
import { ASSET_MAP, sodexPair } from "@/lib/assets";
import { computeDrift, holdingsOf } from "@/lib/drift";
import { computeRebalanceDeltas } from "@/lib/rebalance";
import { sodexConfig } from "@/lib/sodex";
import { store } from "@/lib/store";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { positionId?: string };
    const position = await store.getPosition(String(body.positionId ?? ""));
    if (!position) return NextResponse.json({ error: "Position not found" }, { status: 404 });

    const thesis = await store.getThesis(position.thesisId);
    if (!thesis) return NextResponse.json({ error: "Underlying thesis not found" }, { status: 404 });

    const cfg = sodexConfig();
    const drift = await computeDrift(position, position.weights);

    // The 3% band is the *trigger*. Once a rebalance fires, the basket is solved
    // to target against current NAV (which keeps buys and sells cash-neutral),
    // skipping only dust trades. Measuring deltas on entry NAV instead leaves
    // residual drift and a second rebalance immediately after the first.
    const trigger = computeRebalanceDeltas(
      thesis.basket.assets,
      drift.weights,
      drift.navUsd,
      0.03,
      cfg.fee,
      position.engine
    );

    if (trigger.length === 0) {
      return NextResponse.json({
        deltas: [],
        orders: [],
        position,
        drift,
        message: "No leg clears the 3% drift band. Nothing to do."
      });
    }

    const deltas = computeRebalanceDeltas(
      thesis.basket.assets,
      drift.weights,
      drift.navUsd,
      0.005,
      cfg.fee,
      position.engine
    );

    const createdAt = new Date().toISOString();
    const orders: Order[] = deltas.map((delta) => {
      const meta = ASSET_MAP.get(delta.symbol);
      const pair = meta ? sodexPair(meta, position.engine) : null;
      const px = drift.prices[delta.symbol] ?? 0;
      const qty = px > 0 ? delta.notionalUsd / px : 0;
      return {
        id: crypto.randomUUID(),
        thesisId: position.thesisId,
        symbol: delta.symbol,
        sodexSymbol: pair ?? delta.symbol,
        side: delta.action === "sell" ? "sell" : "buy",
        quantity: Number(qty.toFixed(8)),
        price: px,
        notionalUsd: Number(delta.notionalUsd.toFixed(2)),
        builderFeeUsd: Number(delta.builderFeeUsd.toFixed(4)),
        clOrdID: `tf${Date.now().toString(36)}${delta.symbol.toLowerCase()}`.slice(0, 36),
        status: "simulated",
        createdAt
      };
    });

    const updated = {
      ...position,
      orders: [...position.orders, ...orders],
      weights: Object.fromEntries(thesis.basket.assets.map((a) => [a.symbol, a.targetWeight])),
      lastRebalanceAt: createdAt,
      rebases: (position.rebases ?? 0) + 1
    };

    await store.putPosition(updated);
    await store.addOrders(orders);

    const holdings = holdingsOf(updated);
    return NextResponse.json({
      deltas,
      orders,
      position: updated,
      drift,
      message: `${deltas.length} leg${deltas.length > 1 ? "s" : ""} rebalanced across ${holdings.size} held assets.`,
      builderFeesUsd: orders.reduce((sum, o) => sum + o.builderFeeUsd, 0)
    });
  } catch (error) {
    console.error("[api/rebalance]", error);
    return NextResponse.json({ error: "Rebalance failed." }, { status: 500 });
  }
}
