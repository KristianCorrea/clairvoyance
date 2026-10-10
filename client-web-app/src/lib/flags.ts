/**
 * Feature flags — flip these in `.env.local` (see `.env.example`).
 *
 * Teammates: turn YOUR lane's stub OFF when your real implementation is ready.
 * Keep other stubs ON so the app still runs without hardware/API keys.
 *
 * NEXT_PUBLIC_* vars are inlined at build time for the browser.
 */

function flag(name: string, defaultOn = true): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultOn;
  return raw === "1" || raw.toLowerCase() === "true";
}

/** Camera snapshot / test — Lane B */
export const STUB_CAMERA = flag("NEXT_PUBLIC_STUB_CAMERA", true);

/** Microphone / speech-to-text — Lane C (TTS is always real) */
export const STUB_MIC = flag("NEXT_PUBLIC_STUB_MIC", true);

/** Vision / LLM analyze — Lane D */
export const STUB_ANALYZE = flag("NEXT_PUBLIC_STUB_ANALYZE", true);
