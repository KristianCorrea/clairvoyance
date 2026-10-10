import { NextResponse } from "next/server";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const SYSTEM_PROMPT = "You are a friendly, concise visual assistant helping a blind or visually impaired person understand their surroundings through a camera. Your goal is to provide clear, natural, and useful spoken descriptions, as if you were a helpful companion.";

type GeminiResponse = {
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
};

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Send multipart form data with question and image fields." }, { status: 400 });
  }
  const question = form.get("question");
  const image = form.get("image");
  if (typeof question !== "string" || !question.trim() || question.length > 2000) {
    return NextResponse.json({ error: "Provide a question between 1 and 2000 characters." }, { status: 400 });
  }
  if (!(image instanceof Blob) || !image.size) {
    return NextResponse.json({ error: "Missing image." }, { status: 400 });
  }
  if (!IMAGE_TYPES.has(image.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP, HEIC, or HEIF image." }, { status: 415 });
  }
  if (image.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be 10 MB or smaller." }, { status: 413 });
  }
  const key = process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "Set GOOGLE_API_KEY in .env.local and restart the server." }, { status: 503 });
  }
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        // This model supports disabling thinking for short scene descriptions.
        ...(model === "gemini-2.5-flash" ? { generationConfig: { thinkingConfig: { thinkingBudget: 0 } } } : {}),
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [
          { text: question.trim() },
          { inlineData: { mimeType: image.type, data: Buffer.from(await image.arrayBuffer()).toString("base64") } },
        ] }],
      }),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
    if (!response.ok) {
      const message = response.status === 429
        ? "Gemini quota or rate limit reached. Check your Google AI Studio quota and try again later."
        : response.status === 503
          ? "Gemini is temporarily unavailable. Please try again shortly."
        : response.status === 401 || response.status === 403
          ? "Gemini rejected the API key or project permissions. Check GOOGLE_API_KEY in .env.local."
          : response.status === 404
            ? "Gemini model unavailable. Check GEMINI_MODEL in .env.local."
            : "Gemini could not analyze the image. Please try again.";
      return NextResponse.json({ error: message }, { status: response.status === 429 || response.status === 503 ? response.status : 502 });
    }
    const data = await response.json() as GeminiResponse;
    const candidate = data.candidates?.[0];
    const answer = candidate?.content?.parts?.filter((part) => !part.thought).map((part) => part.text ?? "").join("").trim();
    if (!answer || (candidate?.finishReason && candidate.finishReason !== "STOP")) {
      return NextResponse.json({ error: "Gemini did not return a complete answer. Try another image or question." }, { status: 502 });
    }
    return NextResponse.json({ answer });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json({ error: timeout ? "Gemini took too long. Please try again." : "Could not reach Gemini. Check the server's internet connection." }, { status: timeout ? 504 : 502 });
  }
}
