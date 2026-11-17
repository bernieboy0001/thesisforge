import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Copy does not duplicate the basket — it routes the follower into the original
 * thesis so the citations, author and counters stay consistent. Execution is
 * still tagged with the platform Builder Code.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thesis = await store.bumpThesis(id, "copies");
  if (!thesis) return NextResponse.json({ error: "Thesis not found" }, { status: 404 });
  return NextResponse.json({ thesisId: thesis.id, copies: thesis.copies, followers: thesis.followers });
}
