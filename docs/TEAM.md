# Clairvoyance — teammate guide

This doc assigns **lanes** so people can flesh out one feature without blocking others.

The phone app lives in [`client-web-app/`](../client-web-app/). It already runs **end-to-end with stubs** + **real TTS**.

```bash
cd client-web-app
cp .env.example .env.local   # stubs ON by default
npm install
npm run dev
```

Open http://localhost:3000 → tap **Ask what’s ahead** → you should **hear** an answer.

---

## Golden rules

1. **Own your files.** Don’t rewrite another lane’s module — open a PR against your contract.
2. **Keep stubs working.** Default `.env.local` should still run the demo with all stubs `=1`.
3. **Same function signatures.** UI calls only the contracts below.
4. **Secrets stay on the server.** Vision API keys go in `.env.local` / hosting env, used only from `src/app/api/analyze/route.ts`.
5. **Flip one flag at a time** when integrating (`NEXT_PUBLIC_STUB_*=0`).

---

## Contracts (do not rename lightly)

| Function | File | Returns |
|----------|------|---------|
| `testCamera(baseUrl)` | `src/lib/camera.ts` | `{ ok, detail }` |
| `getSnapshot(baseUrl)` | `src/lib/camera.ts` | `Blob` (image) |
| `listenOnce()` | `src/lib/speech.ts` | `string` (transcript) |
| `speak(text)` | `src/lib/speech.ts` | `Promise<void>` (**already real TTS**) |
| `analyzeScene(image, question)` | `src/lib/analyze.ts` | `string` (spoken answer) |

Orchestration (Lane A): `src/components/GuideApp.tsx`  
Flags: `src/lib/flags.ts` + `.env.example`

Loop:

```text
listenOnce() → getSnapshot() → analyzeScene() → speak()
```

---

## Lanes

### Lane A — App shell / UX

**Files:** `src/components/*`, `src/components/GuideApp.tsx`, `src/app/page.tsx`

**Job:** Accessibility, layout, status machine, ask button, typed fallback, wiring.

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

**Stub today:** loads `/public/demo-frame.svg`

**Job:**

1. Real `getSnapshot` via STA `GET /capture` (JPEG)  
2. Reliable `testCamera` (must prove a still, not just HTML on `/`)  
3. Optional: Next.js proxy only if browser CORS blocks direct fetch  

**Hardware notes:**

- **Demo default:** phone hotspot + `esp32-cam` STA → URL = DHCP IP, stills at `/capture`  
- SoftAP: join `ELEGOO-…`, URL `http://192.168.4.1` (may lack `/capture`)  
- Pins: firmware must use `CAMERA_MODEL_M5STACK_WIDE` (see `esp32-cam/`, `vendor/`)  
- Weak USB bricks often fail Wi‑Fi; use laptop USB or a solid power bank  
- Browser may download `/capture` as `.bin` — body is still JPEG  

**Done when:**

- [ ] Test connection reports OK against a live board (`/capture` still)  
- [ ] Ask loop shows a **real** necklace frame in Preview  
- [ ] Works from a phone browser on the same hotspot (proxy only if needed)

---

### Lane C — Voice (STT)

**Files:** `src/lib/speech.ts`

**Flag:** `NEXT_PUBLIC_STUB_MIC`

**Stub today:** 800ms delay → cycles canned questions (“What’s in front of me?”, …)

**TTS:** `speak()` is already real (`speechSynthesis`). Don’t stub that away.

**Job:**

1. Implement real `listenOnce()` via Web Speech API or Whisper  
2. Handle mic permission denied + timeout with clear errors  
3. Optional: press-and-hold UX (coordinate with Lane A)

**Done when:**

- [ ] With `NEXT_PUBLIC_STUB_MIC=0`, spoken questions become transcripts  
- [ ] Failure messages are speakable and user-friendly  
- [ ] Stub path still works when flag is `1`

---

### Lane D — Vision AI

**Files:** `src/lib/analyze.ts`, `src/app/api/analyze/route.ts`

**Flag:** `NEXT_PUBLIC_STUB_ANALYZE`

**Stub today:** keyword canned answers (no API key)

**Job:**

1. In `api/analyze/route.ts`, call GPT-4o / Gemini / etc. with image + question  
2. System prompt: ≤2 sentences, left/center/right, obstacles, no markdown  
3. Keep keys in server env only  

**Done when:**

- [ ] `NEXT_PUBLIC_STUB_ANALYZE=0` returns real answers for a demo photo  
- [ ] Latency acceptable for a hallway demo (~few seconds)  
- [ ] Empty/error API responses surface cleanly in the UI

---

### Embedded (optional 5th)

**Files:** `esp32-cam/`, `vendor/`

**Job:** STA firmware reliability, power, mount, stock AP restore (`./vendor/flash-stock.sh`).

---

## Suggested branch names

```text
feat/lane-a-a11y
feat/lane-b-camera-proxy
feat/lane-c-web-speech
feat/lane-d-vision-api
```

---

## Integration checklist

1. Merge Lane A shell with stubs (baseline).  
2. Each lane PR: implement module + set **only their** flag to `0` in PR description (not in committed `.env.local`).  
3. Demo machine `.env.local` example for “all real”:

```bash
NEXT_PUBLIC_STUB_MIC=0
NEXT_PUBLIC_STUB_CAMERA=0
NEXT_PUBLIC_STUB_ANALYZE=0
OPENAI_API_KEY=sk-...
```

4. If something breaks, set that lane back to `1` and keep demoing.

---

## Demo script (judges)

1. `npm run dev` → open on phone or laptop  
2. Tap **Ask what’s ahead** (stub mic)  
3. Hear TTS answer; show Preview demo frame  
4. Optional: typed question “Any obstacles?”  
5. When ready: live necklace + real AI with flags off
