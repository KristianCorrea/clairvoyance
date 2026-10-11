/**
 * Lane B — Camera I/O
 *
 * Contract:
 *   testCamera(baseUrl) → Promise<CameraTestResult>
 *   getSnapshot(baseUrl) → Promise<Blob>   // JPEG (or any image blob)
 *
 * Stub (NEXT_PUBLIC_STUB_CAMERA=1):
 *   Uses /demo-frame.svg so the app works without an ESP32.
 *
 * Real path (NEXT_PUBLIC_STUB_CAMERA=0) — phone hotspot + STA firmware:
 *   GET `${baseUrl}/capture` → single JPEG (esp32-cam CameraWebServer).
 *   SoftAP stock: http://192.168.4.1 (may lack /capture).
 *   STA: http://<dhcp-ip> from hotspot device list.
 *
 * Browsers sometimes save /capture as *.bin (no .jpg in the URL) — the body
 * is still JPEG. We accept image/* or JPEG magic bytes (FF D8).
 */

import { STUB_CAMERA } from "./flags";
import type { CameraTestResult } from "./types";

const DEMO_FRAME = "/demo-frame.svg";
const FETCH_MS = 8000;

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** JPEG SOI marker — works even when Content-Type is missing/octet-stream. */
function looksLikeJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function isUsableImageBlob(blob: Blob, bytes: Uint8Array): boolean {
  if (blob.size < 100) return false;
  if (blob.type.startsWith("image/")) return true;
  return looksLikeJpeg(bytes);
}

/**
 * Fetch one still from STA `/capture` (preferred), then a few fallbacks.
 */
async function fetchStill(
  baseUrl: string,
): Promise<{ blob: Blob; url: string }> {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) {
    throw new Error("Camera URL is empty.");
  }

  const candidates = [`${base}/capture`, `${base}/jpg`, `${base}/bmp`];
  let lastError: unknown;

  for (const url of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_MS);
    try {
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${url}`);
        continue;
      }

      const raw = await res.blob();
      const bytes = new Uint8Array(await raw.arrayBuffer());
      if (!isUsableImageBlob(raw, bytes)) {
        lastError = new Error(`Not an image from ${url} (${raw.type || "no type"}, ${raw.size} bytes)`);
        continue;
      }

      // Normalize MIME so <img> / vision APIs treat octet-stream JPEGs correctly.
      const type =
        raw.type.startsWith("image/")
          ? raw.type
          : looksLikeJpeg(bytes)
            ? "image/jpeg"
            : raw.type || "application/octet-stream";
      const blob = new Blob([bytes], { type });
      return { blob, url };
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  const hint =
    lastError instanceof Error ? lastError.message : String(lastError ?? "none");
  throw new Error(
    `Could not get a snapshot from ${base}. Tried /capture. (${hint}) ` +
      `Same hotspot as the ESP32? STA firmware? Direct browser open of ${base}/capture should show a photo.`,
  );
}

/**
 * Check whether we can grab a still from the necklace.
 * Stub always succeeds after a short delay.
 */
export async function testCamera(baseUrl: string): Promise<CameraTestResult> {
  if (STUB_CAMERA) {
    await sleep(400);
    return {
      ok: true,
      detail:
        "Stub camera OK (using demo-frame.svg). Set NEXT_PUBLIC_STUB_CAMERA=0 for hardware.",
    };
  }

  try {
    const { blob, url } = await fetchStill(baseUrl);
    const kb = Math.max(1, Math.round(blob.size / 1024));
    return {
      ok: true,
      detail: `Got still from ${url} (${kb} KB, ${blob.type}).`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, detail: msg };
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
      throw new Error("Stub demo-frame.svg missing from /public");
    }
    return res.blob();
  }

  const { blob } = await fetchStill(baseUrl);
  return blob;
}
