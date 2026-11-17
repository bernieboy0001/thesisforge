import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/seed";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const published = await store.published();
  return NextResponse.json(
    published.sort((a, b) => b.followers + b.copies * 2 - (a.followers + a.copies * 2))
  );
}
