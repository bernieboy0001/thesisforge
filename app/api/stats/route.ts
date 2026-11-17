import { NextResponse } from "next/server";
import { fetchSpotPrices, sodexConfig } from "@/lib/sodex";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [totals, prices] = await Promise.all([store.totals(), fetchSpotPrices()]);
  return NextResponse.json({ ...totals, pricesLive: prices.live, builder: sodexConfig() });
}
