import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thesis = await store.bumpThesis(id, "followers");
  if (!thesis) return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  return NextResponse.json({ followers: thesis.followers, copies: thesis.copies });
}
