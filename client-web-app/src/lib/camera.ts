/**
 * Lane B — Camera I/O
 *
 * Contract:
 *   testCamera(baseUrl) → Promise<CameraTestResult>
 *   getSnapshot(baseUrl) → Promise<Blob>   // JPEG (or any image blob)
 *
 * Stub (NEXT_PUBLIC_STUB_CAMERA=1):
 *   Uses /demo-frame.png so the app works without an ESP32.
 *
 * Real implementation ideas:
 *   - GET `${baseUrl}/capture` if firmware exposes stills
 *   - Or proxy via Next.js route to avoid browser CORS
 *   - SoftAP default: http://192.168.4.1
 *   - STA: http://<dhcp-ip> from hotspot device list
 *
 * ELEGOO note: stock UI is on :80; MJPEG stream often on :81/stream
 */

import { STUB_CAMERA } from "./flags";
import type { CameraTestResult } from "./types";

const DEMO_FRAME = "/images.png";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

/**
 * Check whether we can reach the camera.
 * Stub always succeeds after a short delay.
 */
export async function testCamera(baseUrl: string): Promise<CameraTestResult> {
  if (STUB_CAMERA) {
    await sleep(400);
    return {
      ok: true,
      detail: "Stub camera OK (using demo-frame.png). Set NEXT_PUBLIC_STUB_CAMERA=0 for hardware.",
    };
  }

  // --- REAL PATH (Lane B: replace / harden this) ---
  const base = normalizeBaseUrl(baseUrl);
  if (!base) {
    return { ok: false, detail: "Camera URL is empty." };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    // Many ESP32 firmwares don't send CORS headers — fetch may fail even if
    // the camera is fine. Prefer a Next.js rewrite/proxy when that happens.
    const res = await fetch(base + "/", {
      method: "GET",
      mode: "cors",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, detail: `Camera HTTP ${res.status}` };
    }
    return { ok: true, detail: `Reached ${base}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      detail: `Camera unreachable (${msg}). Often CORS — add a proxy or enable CORS on ESP32.`,
    };
  }
}

/**
 * Grab one image from the necklace for the vision model.
 * Stub returns the demo asset as a Blob.
 */
export async function getSnapshot(baseUrl: string): Promise<Blob> {
  if (STUB_CAMERA) {
    await sleep(300);
    const res = await fetch(DEMO_FRAME, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Stub demo-frame.png missing from /public");
    }
    return res.blob();
  }

  // --- REAL PATH (Lane B) ---
  // Try common still endpoint first; fall back to root (may not be an image).
  const base = normalizeBaseUrl(baseUrl);
  const candidates = [`${base}/capture`, `${base}/jpg`, `${base}/`];

  let lastError: unknown;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store", mode: "cors" });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (blob.size > 0 && blob.type.startsWith("image/")) {
        return blob;
      }
      // Some servers omit content-type; accept non-empty body from /capture
      if (blob.size > 1000 && url.includes("capture")) {
        return blob;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Could not get a snapshot from ${base}. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError ?? "none")
    }`,
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
