# Clairvoyance — client-web-app

Voice-first Next.js phone client for the ESP32 necklace camera.

**Full demo (hotspot + HTTPS mic + hardware + Gemini):** see **[`../docs/SETUP.md`](../docs/SETUP.md)**.

## Quick start (stubs)

```bash
cd client-web-app
cp .env.example .env.local   # stubs ON
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Ask what’s ahead** → you should hear TTS (or see the answer if TTS soft-fails).

## Environment

Copy `.env.example` → `.env.local` (gitignored). Restart `npm run dev` after any `NEXT_PUBLIC_*` or key change.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_STUB_MIC` | `1` = canned questions; `0` = Web Speech / push-to-talk |
| `NEXT_PUBLIC_STUB_CAMERA` | `1` = `/demo-frame.png`; `0` = ESP32 `GET /capture` |
| `NEXT_PUBLIC_STUB_ANALYZE` | `1` = keyword stub; `0` = `POST /api/analyze` → Gemini |
| `GOOGLE_API_KEY` | Server-only Gemini key (never `NEXT_PUBLIC_`) |
| `GEMINI_MODEL` | Default in example: `gemini-2.5-flash` (fast). Avoid slow 3.7+ for live demos |

**TTS (`speak`) is always real** via the Web Speech API.

Flags are read with **static** `process.env.NEXT_PUBLIC_*` names in `src/lib/flags.ts` so the browser bundle gets the values.

## Phone access

| Goal | URL |
|------|-----|
| Laptop only | `http://localhost:3000` |
| Phone UI **without** mic | `http://<laptop-hotspot-ip>:3000` (HMR allowlisted in `next.config.ts`) |
| Phone UI **with** mic | **HTTPS tunnel** → `cloudflared tunnel --url http://localhost:3000` → open `https://….trycloudflare.com` |

Plain HTTP on a LAN IP is **not** a secure context → `Mic/STT error: not-allowed`.  
`allowedDevOrigins` already includes private IPs and `*.trycloudflare.com` (restart Next after changing `next.config.ts`).

Camera field stays `http://<esp-ip>` (LAN). That is separate from the app origin.

## Stubs vs real

| Flag | Module | Stub behavior |
|------|--------|----------------|
| `NEXT_PUBLIC_STUB_MIC` | `src/lib/speech.ts` | Canned questions (no mic) |
| `NEXT_PUBLIC_STUB_CAMERA` | `src/lib/camera.ts` | `/demo-frame.png` |
| `NEXT_PUBLIC_STUB_ANALYZE` | `src/lib/analyze.ts` | Keyword canned answers |

Teammate ownership: **[docs/TEAM.md](../docs/TEAM.md)**.

## Project layout

```text
src/
  app/page.tsx                 # renders GuideApp
  app/api/analyze/route.ts     # Gemini (keys stay here)
  components/GuideApp.tsx      # orchestration (hold-to-talk loop)
  components/*                 # UI
  lib/camera.ts                # Lane B — /capture stills
  lib/speech.ts                # Lane C — STT + TTS
  lib/analyze.ts               # Lane D client → /api/analyze
  lib/flags.ts                 # env flags
  lib/types.ts
public/demo-frame.png          # stub camera image
next.config.ts                 # allowedDevOrigins for phone / tunnel
```

## Test Gemini with dummy inputs

```dotenv
NEXT_PUBLIC_STUB_MIC=1
NEXT_PUBLIC_STUB_CAMERA=1
NEXT_PUBLIC_STUB_ANALYZE=0
GOOGLE_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Restart `npm run dev`. Tap Ask or type a question. Demo PNG + question go to `/api/analyze`.  
The route forces low-latency thinking (`thinkingBudget: 0` on 2.5; `minimal`/`low` on Gemini 3.x) and aborts Gemini after **20 seconds**.

Never commit real keys. Prefer `gemini-2.5-flash` for hallway demos; `gemini-3.7-flash` often exceeds the timeout.

## Related

| Path | Role |
|------|------|
| [`../docs/SETUP.md`](../docs/SETUP.md) | Reproducible full setup |
| [`../esp32-cam/`](../esp32-cam/) | STA firmware |
| [`../vendor/`](../vendor/) | Stock softAP |
| [`../docs/TEAM.md`](../docs/TEAM.md) | Lanes |

## Scripts

| Command | What |
|---------|------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
