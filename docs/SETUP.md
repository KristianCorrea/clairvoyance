# Clairvoyance — reproducible demo setup

End-to-end path used for KnightHacks demos: **phone hotspot + ESP32 STA + Next.js on a laptop + HTTPS tunnel for microphone**.

```text
Phone (hotspot)
  ├── ESP32 necklace ── STA Wi‑Fi ── GET /capture (JPEG)
  ├── Laptop ────────── STA Wi‑Fi ── npm run dev :3000
  │                        └── cloudflared ── https://*.trycloudflare.com
  └── Chrome ────────── opens HTTPS tunnel URL (mic) + fetches ESP32 on LAN (camera)
```

Typed questions always work without HTTPS. **Voice (Web Speech STT) requires a secure origin** — plain `http://10.x.x.x:3000` → `Mic/STT error: not-allowed`.

---

## Prerequisites

| Item | Notes |
|------|--------|
| ELEGOO ESP32-WROVER Camera-V1.5 | Pins: `CAMERA_MODEL_M5STACK_WIDE` (see `esp32-cam/`, `vendor/`) |
| USB data cable + solid 5 V | Weak bricks brownout Wi‑Fi; laptop USB / ≥1 A bank preferred |
| Phone with hotspot (2.4 GHz capable) | ESP32 cannot use 5 GHz-only or eduroam (enterprise) |
| Laptop | Joins the phone hotspot; runs Next + tunnel |
| Node.js 20+ / npm | `client-web-app` |
| PlatformIO Core (`pio`) | `esp32-cam` flash |
| Google AI Studio API key | Vision (`GOOGLE_API_KEY`) when analyze stub is off |
| `cloudflared` (or ngrok) | HTTPS for phone mic |
| Chrome on Android | Best Web Speech support; iPhone is unreliable |

```bash
export PATH="$PATH:$HOME/.platformio/penv/bin"
# Linux serial: sudo usermod -aG dialout $USER  # then log out/in
```

Install Cloudflare tunnel client: [cloudflared install docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)  
(Fedora: `sudo dnf install cloudflared` when packaged, or use the official binary.)

---

## 1. Flash the necklace (STA)

```bash
# Edit hotspot SSID / password (2.4 GHz)
#   esp32-cam/include/wifi_secrets.h

cd esp32-cam
pio run -t upload
pio device monitor -b 115200
```

Copy the printed **IP address**. Verify stills:

- UI: `http://<esp-ip>/`
- Still: `http://<esp-ip>/capture` (browser may save as `.bin` — body is still JPEG)

**Orientation:** `main.cpp` sets `set_vflip(s, 0)`. If the necklace image is upside down, flip to `1`, re-upload.

Details: [`esp32-cam/README.md`](../esp32-cam/README.md). Stock SoftAP check: [`vendor/README.md`](../vendor/README.md).

---

## 2. Configure the web app

```bash
cd client-web-app
cp .env.example .env.local
npm install
```

Edit **`.env.local`** (never commit this file):

### Stub-only smoke test (no hardware / no key)

```dotenv
NEXT_PUBLIC_STUB_MIC=1
NEXT_PUBLIC_STUB_CAMERA=1
NEXT_PUBLIC_STUB_ANALYZE=1
```

### Full hardware + Gemini demo

```dotenv
NEXT_PUBLIC_STUB_MIC=0
NEXT_PUBLIC_STUB_CAMERA=0
NEXT_PUBLIC_STUB_ANALYZE=0
GOOGLE_API_KEY=your_key_here
# Prefer 2.5 Flash for demo latency; 3.7+ can exceed the 20s abort even on "low" thinking
GEMINI_MODEL=gemini-2.5-flash
```

`NEXT_PUBLIC_*` flags are inlined at dev-server start — **restart `npm run dev` after changing them**.  
`flags.ts` must read env with **static** names (`process.env.NEXT_PUBLIC_STUB_MIC`); dynamic `process.env[name]` stays undefined in the browser.

---

## 3. Run Next on the laptop

Laptop must be on the **same phone hotspot** as the ESP32.

```bash
cd client-web-app
npm run dev
```

- Laptop check: [http://localhost:3000](http://localhost:3000)  
- Header should show stub flags (e.g. `mic OFF, camera OFF, AI OFF` when all real).

`next.config.ts` sets `allowedDevOrigins` for private LAN IPs and `*.trycloudflare.com` so phone/tunnel HMR is not blocked. Restart Next after editing that config.

---

## 4. HTTPS tunnel (required for phone mic)

In a **second** terminal on the laptop:

```bash
cloudflared tunnel --url http://localhost:3000
```

Copy the printed URL, e.g. `https://random-words.trycloudflare.com`.

Leave both `npm run dev` and `cloudflared` running.

**ngrok alternative:** `ngrok http 3000` → use the `https://…` URL (click through the interstitial on the phone).

---

## 5. Phone checklist

1. Stay on the phone’s own hotspot (ESP32 + laptop connected to it).  
2. Open the **https://…trycloudflare.com** URL in **Chrome** (not `http://10.…:3000`).  
3. Allow **microphone** when prompted.  
4. **Connect** screen: set **Camera base URL** to `http://<esp-ip>` (no `/capture` suffix).  
5. Tap **Test connection** → expect OK (or Activate immediately if stub camera is on).  
6. Tap **Activate guide**.  
7. Hold **Hold to ask**, speak, release — or open **Debug** for typed questions / snapshot preview.  
8. Confirm status + answer on the main Guide screen (TTS may soft-fail on some Linux desktops; phone TTS is usually fine).

---

## Networking cheat sheet

| Device | Role |
|--------|------|
| Phone | Hotspot AP + Chrome UI |
| ESP32 | STA client; stills at `/capture` |
| Laptop | STA client; Next `:3000` + tunnel; needs internet (via hotspot) for Gemini |
| Tunnel URL | Secure origin for mic / Web Speech |
| Camera URL field | Always `http://<esp-ip>` on the LAN |

---

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `Mic/STT error: not-allowed` | Opened `http://LAN-ip:3000`. Use the **https** tunnel URL; allow mic in Chrome site settings. |
| `Mic/STT error: network` | Chrome cloud STT couldn’t reach Google (data/VPN). Check cellular data; or type the question. |
| Blocked `/_next/hmr` from `*.trycloudflare.com` | Add host to `allowedDevOrigins`, restart Next (already includes `*.trycloudflare.com` in repo). |
| Camera Test / snapshot fails | Same hotspot? Correct ESP IP? Power? Open `/capture` in Chrome on the phone. |
| `/capture` downloads as `.bin` | Normal; JPEG bytes. App accepts MIME or `FF D8` magic. |
| Image upside down | Toggle `set_vflip` in `esp32-cam/src/main.cpp`, re-flash. |
| Gemini **429** | Rate limit / quota — wait, or check AI Studio usage. |
| Gemini **504** / “took too long” | 20s abort. Use `GEMINI_MODEL=gemini-2.5-flash` (thinking off). Avoid 3.7 for live demos. |
| Wi‑Fi FAILED / brownout | Better 5 V supply; confirm 2.4 GHz PSK in `wifi_secrets.h`. |
| Stubs stuck ON in UI | Restart Next after `.env.local` change; hard-refresh browser. |
| TTS fails on Linux Chrome | Soft-fail expected; answer still on screen. Try Firefox or phone TTS. |

---

## Judge demo script (full stack)

1. Hotspot on → ESP32 + laptop connected → note ESP IP.  
2. `npm run dev` + `cloudflared tunnel --url http://localhost:3000`.  
3. Phone Chrome → **https** tunnel URL → mic allowed → camera URL = ESP IP.  
4. Test connection → Ask (voice or typed) → show Preview + spoken/on-screen answer.  
5. If mic flakes: typed question still demos camera + Gemini.

Stub-only fallback (no hardware): all `NEXT_PUBLIC_STUB_*=1`, laptop `localhost:3000` only.

---

## Related docs

| Doc | Role |
|-----|------|
| [`../README.md`](../README.md) | Project overview |
| [`../client-web-app/README.md`](../client-web-app/README.md) | App flags, Gemini smoke test |
| [`../esp32-cam/README.md`](../esp32-cam/README.md) | Firmware flash |
| [`TEAM.md`](TEAM.md) | Lane ownership / contracts |
