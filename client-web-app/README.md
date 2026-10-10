# Clairvoyance — client-web-app

Voice-first Next.js phone client for the ESP32 necklace camera.

## Quick start

```bash
cd client-web-app
cp .env.example .env.local   # stubs ON
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Ask what’s ahead** → you should hear TTS.

## Stubs vs real

| Flag | Module | Stub behavior |
|------|--------|----------------|
| `NEXT_PUBLIC_STUB_MIC` | `src/lib/speech.ts` | Canned questions (no mic) |
| `NEXT_PUBLIC_STUB_CAMERA` | `src/lib/camera.ts` | `/demo-frame.png` |
| `NEXT_PUBLIC_STUB_ANALYZE` | `src/lib/analyze.ts` | Keyword canned answers |

**TTS (`speak`) is always real** via the Web Speech API.

Teammate ownership and “done when” criteria: **[docs/TEAM.md](../docs/TEAM.md)**.

## Project layout

```text
src/
  app/page.tsx                 # renders GuideApp
  app/api/analyze/route.ts     # Lane D server hook for vision API
  components/GuideApp.tsx      # Lane A orchestration
  components/*                 # UI pieces
  lib/camera.ts                # Lane B
  lib/speech.ts                # Lane C (+ real TTS)
  lib/analyze.ts               # Lane D client
  lib/flags.ts                 # env flags
  lib/types.ts                 # shared types
public/demo-frame.png          # stub camera image (SVG source alongside it)
```

## Test Gemini with dummy inputs

Put your key in `.env.local` (Next.js does not load `.env.example`):

```dotenv
NEXT_PUBLIC_STUB_MIC=1
NEXT_PUBLIC_STUB_CAMERA=1
NEXT_PUBLIC_STUB_ANALYZE=0
GOOGLE_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Restart `npm run dev` after editing these values; production builds must be rebuilt for public flag changes. Tap **Ask what's ahead** or submit a typed question. The app sends the demo PNG and question to `/api/analyze`, which calls Gemini and returns `{ "answer": "..." }`. The answer is displayed and read by the existing browser TTS. The microphone and ESP32 are not needed for this test; the server needs internet access.

`GOOGLE_API_KEY` stays server-side. `GEMINI_API_KEY` is also accepted as a fallback. Never prefix either key with `NEXT_PUBLIC_`. The optional `GEMINI_MODEL` selects a model; the default `gemini-2.5-flash` uses a zero thinking budget for short scene descriptions. Requests time out after 45 seconds; provider unavailability is reported separately. Keep `.env.example` free of keys.

The demo PNG is a raster copy of `public/demo-frame.svg`, suitable for Gemini image input. The route accepts JPEG, PNG, WebP, HEIC, or HEIF images up to 10 MB and questions up to 2000 characters. It reports missing keys, rejected credentials, quota errors, and timeouts without exposing the key or raw provider errors.

## Related

| Path | Role |
|------|------|
| [`../esp32-cam/`](../esp32-cam/) | STA streaming firmware |
| [`../vendor/`](../vendor/) | ELEGOO stock softAP + flash script |
| [`../docs/TEAM.md`](../docs/TEAM.md) | Who owns what |

## Scripts

| Command | What |
|---------|------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
