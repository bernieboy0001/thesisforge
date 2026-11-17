import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thesis = await store.getThesis(id);
  if (!thesis) return NextResponse.json({ error: "Thesis not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = String(body.name ?? "").trim().slice(0, 40);

  thesis.status = "published";
  if (name) thesis.author = { ...thesis.author, name };
  await store.putThesis(thesis);

  return NextResponse.json(thesis);
}
