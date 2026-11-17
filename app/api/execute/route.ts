import { NextResponse } from "next/server";
import { builderFeeUsdFor, buildExecutionPlan, sodexConfig } from "@/lib/sodex";
import { store } from "@/lib/store";
import type { Order, Position } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { thesisId?: string; notionalUsd?: number };
    const thesisId = String(body.thesisId ?? "");
    const thesis = await store.getThesis(thesisId);
    if (!thesis) return NextResponse.json({ error: "Thesis not found" }, { status: 404 });

    const requested = Number(body.notionalUsd);
    const notionalUsd = Number.isFinite(requested) ? Math.min(1_000_000, Math.max(100, requested)) : 10_000;
    const cfg = sodexConfig();
    const plan = await buildExecutionPlan(thesis, notionalUsd);

    if (plan.orders.length === 0) {
      return NextResponse.json({ error: "No leg maps to a confirmed SoDEX pair." }, { status: 422 });
    }

    const createdAt = new Date().toISOString();
    const orders: Order[] = plan.orders.map((intent, i) => ({
      id: crypto.randomUUID(),
      thesisId,
      symbol: intent.symbol,
      sodexSymbol: intent.sodexSymbol,
      side: intent.side,
      quantity: intent.quantity,
      price: intent.price,
      notionalUsd: intent.notionalUsd,
      builderFeeUsd: Number(
        builderFeeUsdFor({
          engine: plan.engine,
          side: intent.side,
          notionalUsd: intent.notionalUsd,
          rate: cfg.fee
        }).toFixed(4)
      ),
      clOrdID: `${intent.clOrdID}${i.toString(36)}`.slice(0, 36),
      // Signing is deliberately not wired: a recorded simulated fill is honest,
      // a fake "submitted" status would not be.
      status: "simulated",
      createdAt
    }));

    const weights: Record<string, number> = {};
    for (const asset of thesis.basket.assets) weights[asset.symbol] = asset.targetWeight;

    const position: Position = {
      id: crypto.randomUUID(),
      thesisId,
      thesisPrompt: thesis.prompt,
      engine: thesis.basket.engine,
      navUsd: notionalUsd,
      weights,
      orders,
      copiesNote: thesis.copies > 0 ? `Follower of ${thesis.author.name ?? "a published thesis"}` : undefined,
      createdAt
    };

    await store.putPosition(position);
    await store.addOrders(orders);

    return NextResponse.json({ plan, position });
  } catch (error) {
    console.error("[api/execute]", error);
    return NextResponse.json({ error: "Execution plan failed." }, { status: 500 });
  }
}
