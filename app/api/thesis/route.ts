import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { compileThesis } from "@/lib/thesis-agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      universe?: string[];
    };
    const prompt = String(body.prompt ?? "").trim();
    if (prompt.length < 8) {
      return NextResponse.json({ error: "Describe the thesis in at least a sentence." }, { status: 400 });
    }

    const thesis = await compileThesis({
      prompt: prompt.slice(0, 600),
      // Spot only: the public SoDEX perp market endpoints are not documented, so
      // the build never proposes a perp leg it cannot resolve.
      engine: "spot",
      universe: Array.isArray(body.universe) ? body.universe.slice(0, 20) : undefined
    });
    await store.putThesis(thesis);
    return NextResponse.json(thesis);
  } catch (error) {
    console.error("[api/thesis]", error);
    return NextResponse.json({ error: "Could not compile that thesis. Try rephrasing it." }, { status: 500 });
  }
}
