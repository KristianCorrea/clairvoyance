# Clairvoyance — teammate guide

This doc assigns **lanes** so people can flesh out one feature without blocking others.

**Reproducible full demo (hotspot, HTTPS mic, camera, Gemini):** [`SETUP.md`](SETUP.md).

The phone app lives in [`client-web-app/`](../client-web-app/). It runs end-to-end with stubs or real lanes via `.env.local`.

```bash
cd client-web-app
cp .env.example .env.local   # stubs ON by default
npm install
npm run dev
```

Open http://localhost:3000 → tap **Ask what’s ahead** → you should **hear** (or see) an answer.

---

## Golden rules

1. **Own your files.** Don’t rewrite another lane’s module — open a PR against your contract.
2. **Keep stubs working.** Default `.env.example` keeps stubs `=1`.
3. **Same function signatures.** UI calls only the contracts below.
4. **Secrets stay on the server.** Vision API keys go in `.env.local` / hosting env, used only from `src/app/api/analyze/route.ts`.
5. **Flip one flag at a time** when integrating (`NEXT_PUBLIC_STUB_*=0`).
6. **Static env access** in `flags.ts` (`process.env.NEXT_PUBLIC_FOO`) — dynamic `process.env[name]` does not reach the browser.

---

## Contracts (do not rename lightly)

| Function | File | Returns |
|----------|------|---------|
| `testCamera(baseUrl)` | `src/lib/camera.ts` | `{ ok, detail }` |
| `getSnapshot(baseUrl)` | `src/lib/camera.ts` | `Blob` (image) |
| `startListening()` | `src/lib/speech.ts` | `{ stop(), cancel() }` push-to-talk STT |
| `listenOnce()` | `src/lib/speech.ts` | `string` (fixed window; wraps `startListening`) |
| `speak(text)` | `src/lib/speech.ts` | `Promise<void>` (**already real TTS**) |
| `analyzeScene(image, question)` | `src/lib/analyze.ts` | `string` (spoken answer) |

Orchestration (Lane A): `src/components/GuideApp.tsx`  
Flags: `src/lib/flags.ts` + `.env.example`

Loop:

```text
startListening (hold) → stop → getSnapshot → analyzeScene → speak
```

---

## Lanes

### Lane A — App shell / UX

**Files:** `src/components/*`, `src/components/GuideApp.tsx`, `src/app/page.tsx`

**Job:** Accessibility, layout, status machine, hold-to-ask, typed fallback, wiring.

**Done when:**

- [ ] Large Ask control works with VoiceOver/TalkBack labels  
- [ ] Status announces phase changes (`aria-live`)  
- [ ] Error paths speak a short failure message  
- [ ] Camera URL persists in `localStorage`

**Do not:** put fetch/API/model code in components — call `src/lib/*`.

---

### Lane B — Camera (ESP32 necklace)

**Files:** `src/lib/camera.ts` (+ optional `src/app/api/camera/...` proxy)

**Flag:** `NEXT_PUBLIC_STUB_CAMERA`

**Stub:** `/public/demo-frame.png`

**Job:**

1. Real `getSnapshot` via STA `GET /capture` (JPEG)  
2. Reliable `testCamera` (must prove a still, not just HTML on `/`)  
3. Optional: Next.js proxy only if browser CORS blocks direct fetch  

**Hardware notes:**

- **Demo default:** phone hotspot + `esp32-cam` STA → URL = DHCP IP, stills at `/capture`  
- SoftAP: join `ELEGOO-…`, URL `http://192.168.4.1` (may lack `/capture`)  
- Pins: `CAMERA_MODEL_M5STACK_WIDE`  
- Weak USB bricks often fail Wi‑Fi  
- `/capture` may download as `.bin` — still JPEG  
- Upside-down: `set_vflip` in `esp32-cam/src/main.cpp`  

**Done when:**

- [x] Test connection OK against a live board (`/capture`)  
- [x] Ask loop shows a real necklace frame in Preview  
- [x] Works from a phone browser on the same hotspot  

---

### Lane C — Voice (STT)

**Files:** `src/lib/speech.ts`

**Flag:** `NEXT_PUBLIC_STUB_MIC`

**Stub:** canned questions on release  

**TTS:** `speak()` is already real (`speechSynthesis`). Don’t stub that away.

**Job:**

1. Real `startListening()` via Web Speech (done) or MediaRecorder → server STT  
2. Clear errors for permission / network / timeout  
3. Phone mic needs **HTTPS** (tunnel) — see [`SETUP.md`](SETUP.md)  

**Done when:**

- [x] With `NEXT_PUBLIC_STUB_MIC=0`, spoken questions become transcripts (secure origin)  
- [ ] Phone demo reliable without typed fallback (HTTPS tunnel or native app)  
- [x] Stub path still works when flag is `1`

---

### Lane D — Vision AI

**Files:** `src/lib/analyze.ts`, `src/app/api/analyze/route.ts`

**Flag:** `NEXT_PUBLIC_STUB_ANALYZE`

**Stub:** keyword canned answers  

**Job:**

1. `api/analyze/route.ts` → Gemini with image + question  
2. Short spoken answers; keys server-only  
3. Low-latency thinking config + request timeout  

**Done when:**

- [x] `NEXT_PUBLIC_STUB_ANALYZE=0` returns real answers  
- [ ] Hallway latency consistently a few seconds (`gemini-2.5-flash` recommended)  
- [x] Errors (429 / 504 / missing key) surface in the UI  

---

### Embedded (optional 5th)

**Files:** `esp32-cam/`, `vendor/`

**Job:** STA reliability, power, mount, vflip, stock AP restore (`./vendor/flash-stock.sh`).

---

## Suggested branch names

```text
feat/lane-a-a11y
feat/lane-b-camera
feat/lane-c-web-speech
feat/lane-d-vision-api
```

---

## Integration checklist

1. Merge Lane A shell with stubs (baseline).  
2. Each lane PR: implement module + document flag `=0` in the PR description (do not commit `.env.local`).  
3. Demo machine `.env.local` for “all real”:

```bash
NEXT_PUBLIC_STUB_MIC=0
NEXT_PUBLIC_STUB_CAMERA=0
NEXT_PUBLIC_STUB_ANALYZE=0
GOOGLE_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

4. Phone voice: HTTPS tunnel (`cloudflared`) — [`SETUP.md`](SETUP.md).  
5. If something breaks, set that lane’s stub back to `1` and keep demoing.

---

## Demo script (judges)

1. Follow [`SETUP.md`](SETUP.md): hotspot, ESP32, Next, cloudflared.  
2. Phone Chrome → **https** tunnel URL → mic allow → camera URL = ESP IP.  
3. Test connection → Ask (voice or typed) → Preview + answer.  
4. Stub-only backup: all stubs `=1` on laptop localhost.
