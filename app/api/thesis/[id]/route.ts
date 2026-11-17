import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thesis = await store.getThesis(id);
  if (!thesis) return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  return NextResponse.json(thesis);
}
