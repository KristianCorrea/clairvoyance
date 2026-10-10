/**
 * Lane D — Server route for vision analysis.
 *
 * Browser calls: POST /api/analyze  (multipart: question + image)
 *
 * Stub clients never hit this when NEXT_PUBLIC_STUB_ANALYZE=1.
 * When you turn the stub off, implement the model call HERE so secrets
 * stay in server env (OPENAI_API_KEY, GOOGLE_API_KEY, etc.).
 *
 * Expected JSON response: { "answer": "..." }
 */

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const question = String(form.get("question") ?? "").trim();
    const image = form.get("image");

    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }
    if (!(image instanceof Blob) || image.size === 0) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    // -------------------------------------------------------------------------
    // TODO (Lane D): call your vision LLM here.
    //
    // Example sketch (do NOT commit real keys):
    //   const key = process.env.OPENAI_API_KEY;
    //   // convert image → base64, POST to Responses / Chat Completions
    //   // system: "You help a blind user. ≤2 sentences. left/center/right."
    //
    // Until then, return a clear placeholder so the UI can show wiring works.
    // -------------------------------------------------------------------------

    const answer =
      "Server analyze route is wired but the model is not connected yet. " +
      "Lane D: add your vision API call in src/app/api/analyze/route.ts. " +
      `You asked: "${question}".`;

    // Silence unused warning until real code uses the blob size / type
    void image.type;

    return NextResponse.json({ answer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
