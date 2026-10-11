/**
 * Lane D — Scene analysis (vision + language)
 *
 * Contract:
 *   analyzeScene(image: Blob | null, question: string) → Promise<string>
 *   (image is null when the camera is unavailable)
 *
 * Stub (NEXT_PUBLIC_STUB_ANALYZE=1):
 *   Ignores the image; returns a short spatial canned answer from keywords.
 *
 * Real path:
 *   POSTs to /api/analyze (server route) so API keys never ship to the browser.
 *   Implement the model call inside src/app/api/analyze/route.ts
 *
 * Prompt goals for real model:
 *   - ≤ 2 short sentences
 *   - Use left / center / right
 *   - Call out obstacles and clear path
 *   - No markdown, no lists
 */

import { STUB_ANALYZE } from "./flags";

export async function analyzeScene(
  image: Blob | null,
  question: string,
): Promise<string> {
  if (STUB_ANALYZE) {
    await sleep(900);
    if (!image) {
      return "I can't answer that because there's no camera image. Check that the camera is connected.";
    }
    return stubAnswer(question);
  }

  // --- REAL PATH (Lane D): browser → our API route → vision model ---
  const form = new FormData();
  form.append("question", question);
  if (image) {
    form.append("image", image, image.type === "image/png" ? "frame.png" : "frame.jpg");
  }

  const res = await fetch("/api/analyze", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `Analyze failed (${res.status}). Please try again.`);
  }

  const data = (await res.json()) as { answer?: string };
  if (!data.answer?.trim()) {
    throw new Error("Analyze returned an empty answer.");
  }
  return data.answer.trim();
}

/** Keyword stub — good enough for UI demos without an API key. */
function stubAnswer(question: string): string {
  const q = question.toLowerCase();

  if (q.includes("door") || q.includes("exit")) {
    return "A doorway looks open in the center. Path ahead seems clear for a few steps.";
  }
  if (q.includes("person") || q.includes("people") || q.includes("someone")) {
    return "A person is ahead near the center. Give them space and wait, or step slightly left.";
  }
  if (q.includes("obstacle") || q.includes("block") || q.includes("chair")) {
    return "Possible obstacle in the center. The left side looks clearer than the right.";
  }
  if (q.includes("sign") || q.includes("read") || q.includes("text")) {
    return "I can't read fine text in stub mode. When AI is live, ask me to read signs ahead.";
  }
  if (q.includes("clear") || q.includes("which way")) {
    return "Center looks mostly clear. Prefer the left if you need more space.";
  }

  // Default for "what's in front of me?"
  return "Stub vision: open space ahead in the center. No obvious obstacles nearby. Stay centered and move slowly.";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
