import { NextResponse } from "next/server";
import { SpeechClient } from "@google-cloud/speech"; // Google Cloud Speech-to-Text client

// Define the GeminiResponse type
interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string; thought?: boolean }[];
    };
    finishReason?: string;
  }[];
}

/** Gemini 3.x uses thinkingLevel; 2.5 Flash uses thinkingBudget. */
function isGemini3Family(model: string): boolean {
  return /gemini-3/i.test(model);
}

/**
 * Lowest practical thinking for spoken guidance latency.
 * - Gemini 3.7+: thinkingLevel "low" ("minimal" is rejected)
 * - Older Gemini 3.x: "minimal" when available, else "low"
 * - Gemini 2.5 Flash family: thinkingBudget 0 (off)
 */
function thinkingConfigForModel(model: string): {
  thinkingBudget: 0;
} | {
  thinkingLevel: "minimal" | "low";
} {
  if (!isGemini3Family(model)) {
    return { thinkingBudget: 0 };
  }
  // 3.7+ (and 3.10+) reject "minimal"
  const rejectsMinimal = /gemini-3\.(?:[7-9]|\d{2,})/i.test(model);
  return { thinkingLevel: rejectsMinimal ? "low" : "minimal" };
}

function generationConfigForModel(model: string) {
  return {
    generationConfig: {
      thinkingConfig: thinkingConfigForModel(model),
    },
  };
}

const SYSTEM_PROMPT = `You are a navigation assistant for a blind or low-vision person. You receive their spoken question and, when their camera is working, a photo from a camera worn on their chest. Your answer is read aloud to them, so answer only what they asked, as briefly as you can while staying safe.

## What to say
- Answer the question directly in the first sentence.
- Include only what they need to act on that answer: the direction and distance to their goal, and obstacles that are actually in their way.
- Mention something they didn't ask about only if it is an immediate danger close to them, such as a drop-off, stairs, a curb, traffic, a moving vehicle, or something at head height. Say it first, in one sentence.
- Leave out everything else: background details, scenery, colors, lighting, the walking surface, signs they didn't ask about, and things that aren't in their path.
- Don't restate the question, add a summary, add a closing line, or offer more help.

## How to say it
- Keep it to one to three short sentences. Use more only if they asked for a route with several steps.
- Use plain spoken sentences: no markdown, no lists, no headings, no symbols.
- Describe positions relative to their body, treating the bottom center of the photo as where they stand, facing forward. Use left, right, straight ahead, or clock positions, with 12 o'clock straight ahead.
- Give distances in steps, about 2.5 feet each.

## Accuracy
- Describe only what you can see. If you can't tell, say so in a few words instead of guessing.
- Don't call a path clear unless you can see all of it.
- If what they asked about isn't visible, say so and suggest one next step, such as turning slightly so the camera can see more.
- If the photo is too dark, blurry, or badly aimed to answer, say so in one sentence and tell them how to fix it, such as tilting the camera down.
- If no image is provided, say you can't answer because there's no camera image and suggest checking the camera connection. Don't guess at their surroundings. You can still answer questions that don't need sight.
- If the situation looks dangerous, such as crossing heavy traffic, tell them to get sighted help.
- Describe people only by where they are and what they are doing.`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    // The spoken question is required: either raw audio (transcribed here) or
    // text the browser already transcribed. The image is optional.
    const audio = formData.get("audio");
    const questionField = formData.get("question");
    const imageField = formData.get("image");
    const image = imageField instanceof File && imageField.size > 0 ? imageField : null;

    if (!(audio instanceof File && audio.size > 0) && !(typeof questionField === "string" && questionField.trim())) {
      return NextResponse.json({ error: "A spoken question is required." }, { status: 400 });
    }

    if (image && image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be 10 MB or smaller." }, { status: 413 });
    }

    // Validate API key
    const key = process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      return NextResponse.json({ error: "Set GOOGLE_API_KEY in .env.local and restart the server." }, { status: 503 });
    }

    let transcription = typeof questionField === "string" ? questionField.trim() : "";
    if (!transcription && audio instanceof File) {
      // Transcribe audio to text using Google Cloud Speech-to-Text
      const speechClient = new SpeechClient();
      const audioBuffer = Buffer.from(await audio.arrayBuffer());
      const [transcriptionResponse] = await speechClient.recognize({
        audio: { content: audioBuffer.toString("base64") },
        config: {
          encoding: "LINEAR16", // Adjust based on your audio format
          sampleRateHertz: 16000, // Adjust based on your audio file
          languageCode: "en-US", // Adjust based on the language
        },
      });

      transcription = transcriptionResponse.results
        ?.map((result) => result.alternatives?.[0]?.transcript)
        .join(" ")
        .trim() ?? "";
    }

    if (!transcription) {
      return NextResponse.json({ error: "Could not transcribe the audio. Please try again." }, { status: 400 });
    }

    // Send the question (and the image, if we have one) to the Gemini model
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [{ text: transcription }];
    if (image) {
      parts.push({
        inlineData: {
          mimeType: image.type || "image/jpeg",
          data: Buffer.from(await image.arrayBuffer()).toString("base64"),
        },
      });
    } else {
      parts.push({ text: "No image was provided — the camera is unavailable." });
    }

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        ...generationConfigForModel(model),
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const message = response.status === 503
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