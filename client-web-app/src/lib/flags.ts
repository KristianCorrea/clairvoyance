/**
 * Feature flags — flip these in `.env.local` (see `.env.example`).
 *
 * Teammates: turn YOUR lane's stub OFF when your real implementation is ready.
 * Keep other stubs ON so the app still runs without hardware/API keys.
 *
 * IMPORTANT: Next.js only inlines NEXT_PUBLIC_* when accessed with a static
 * property name (`process.env.NEXT_PUBLIC_FOO`). Dynamic `process.env[name]`
 * is undefined in the browser bundle, so flags would always fall back to
 * defaults (stubs ON).
 */

function flag(raw: string | undefined, defaultOn = true): boolean {
  if (raw === undefined || raw === "") return defaultOn;
  return raw === "1" || raw.toLowerCase() === "true";
}

/** Camera snapshot / test — Lane B */
export const STUB_CAMERA = flag(process.env.NEXT_PUBLIC_STUB_CAMERA, true);

/** Microphone / speech-to-text — Lane C (TTS is always real) */
export const STUB_MIC = flag(process.env.NEXT_PUBLIC_STUB_MIC, true);

/** Vision / LLM analyze — Lane D */
export const STUB_ANALYZE = flag(process.env.NEXT_PUBLIC_STUB_ANALYZE, true);
