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

**Phone on hotspot:** open `http://<laptop-ip>:3000`. `next.config.ts` allowlists private LAN hosts for Next HMR (`allowedDevOrigins`) — restart `next dev` after changing that. This is separate from ESP32 `/capture` CORS.

## Stubs vs real

| Flag | Module | Stub behavior |
|------|--------|----------------|
| `NEXT_PUBLIC_STUB_MIC` | `src/lib/speech.ts` | Canned questions (no mic) |
| `NEXT_PUBLIC_STUB_CAMERA` | `src/lib/camera.ts` | `/demo-frame.svg` |
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
public/demo-frame.svg          # stub camera image
```

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
