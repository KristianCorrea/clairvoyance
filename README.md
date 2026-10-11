# Clairvoyance

**Clairvoyance** is a KnightHacks assistive prototype: a wearable ESP32 camera necklace plus a phone web app that lets a visually impaired person ask what’s ahead and hear a short AI-guided answer.

> Aid for awareness — not a replacement for a cane, guide dog, or professional mobility training.

## Purpose

- Give a portable first-person view from a necklace-mounted camera  
- Let the user **speak a question** on their phone (“What’s in front of me?”)  
- Analyze a frame from the necklace with a vision model  
- **Speak back** a concise, spatial answer (left / center / right, obstacles, path)

## Repository layout

| Path | Role |
|------|------|
| [`esp32-cam/`](esp32-cam/) | PlatformIO firmware: join Wi‑Fi (STA), MJPEG + `/capture` stills |
| [`client-web-app/`](client-web-app/) | Next.js phone client (voice, camera stills, Gemini) |
| [`vendor/`](vendor/) | ELEGOO stock softAP firmware + flash helper |
| [`docs/SETUP.md`](docs/SETUP.md) | **Reproducible full-demo setup** (hotspot, tunnel, env, troubleshooting) |
| [`docs/TEAM.md`](docs/TEAM.md) | Teammate lanes / contracts |

**Hardware:** ELEGOO **ESP32-WROVER Camera-V1.5** (Smart Robot Car kit camera module).

## Architecture

```text
┌─────────────────────┐     Wi‑Fi LAN /capture      ┌──────────────────────┐
│  Necklace (ESP32)   │ ──────────────────────────► │  Phone (web app)     │
│  OV camera + HTTP   │                             │  mic → STT           │
└─────────────────────┘                             │  snapshot + question │
                                                    │  TTS ← AI answer     │
                                                    └──────────┬───────────┘
                                                               │ HTTPS (laptop
                                                               │  Next + tunnel)
                                                               ▼
                                                    ┌──────────────────────┐
                                                    │  Gemini (vision)     │
                                                    └──────────────────────┘
```

- **ESP32** = eye (capture + stream only)  
- **Phone** = ears, mic, and UX  
- **Laptop** = Next.js API (keeps API keys server-side) + optional HTTPS tunnel  
- **Cloud** = Gemini scene understanding  

### Demo networking (recommended)

**Phone hotspot** + ESP32 **STA** + laptop on the same hotspot.

| Mode | When to use | Camera URL |
|------|-------------|------------|
| **STA** (`esp32-cam`) | Full app demo | `http://<dhcp-ip>/` — stills at `/capture` |
| **SoftAP** (stock ELEGOO) | Quick camera check only | Join `ELEGOO-…`, `http://192.168.4.1` |

ESP32 needs **2.4 GHz** Wi‑Fi (PSK). **eduroam** is not supported by the simple STA sketch.

**Phone mic:** browsers block microphone on plain `http://10.x.x.x:3000`. For voice on the phone, open an **HTTPS** Cloudflare/ngrok tunnel to the laptop — see [`docs/SETUP.md`](docs/SETUP.md). Typed questions work without a tunnel.

**Power tip:** Wi‑Fi needs a solid 5 V supply. Laptop USB often works when a weak wall brick fails (brownout).

ELEGOO Camera‑V1.5 pinout uses **`CAMERA_MODEL_M5STACK_WIDE`** (not Espressif’s `WROVER_KIT`). Wrong pins → camera probe error `0x105`.

## Prerequisites

- ELEGOO ESP32-WROVER Camera‑V1.5 + USB data cable  
- [PlatformIO Core](https://docs.platformio.org/en/latest/core/installation/methods/installer-script.html) (`pio` on `PATH`)  
- Node.js 20+ and npm  
- Linux: user in `dialout` for `/dev/ttyUSB*`  
- For phone voice: [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) (or ngrok)  
- For real vision: Google AI Studio key (`GOOGLE_API_KEY` in `.env.local`)

```bash
export PATH="$PATH:$HOME/.platformio/penv/bin"
# Fedora/Ubuntu: sudo usermod -aG dialout $USER   # then log out/in
```

## How to run

**Full reproducible demo (hotspot + mic + camera + Gemini):** follow **[`docs/SETUP.md`](docs/SETUP.md)**.

### Quick paths

**1. Camera — stock softAP (visual check only)**

```bash
./vendor/flash-stock.sh
pio device monitor -b 9600
```

Join `ELEGOO-…` → [http://192.168.4.1](http://192.168.4.1). Details: [`vendor/README.md`](vendor/README.md).

**2. Camera — STA (demo firmware)**

```bash
# Edit esp32-cam/include/wifi_secrets.h (hotspot SSID/password)
cd esp32-cam && pio run -t upload && pio device monitor -b 115200
```

Note the IP. Still: `http://<ip>/capture`. Details: [`esp32-cam/README.md`](esp32-cam/README.md).

**3. Web client**

```bash
cd client-web-app
cp .env.example .env.local   # then edit flags / GOOGLE_API_KEY
npm install
npm run dev
```

- Laptop: [http://localhost:3000](http://localhost:3000)  
- Phone + mic: `cloudflared tunnel --url http://localhost:3000` → open the **https://** URL in Chrome  

Details: [`client-web-app/README.md`](client-web-app/README.md).

## Current status

| Component | Status |
|-----------|--------|
| ELEGOO stock AP + browser stream | Working |
| PlatformIO STA (`esp32-cam`) + `/capture` | Working |
| Next.js client loop | Working (stubs or real per env flags) |
| Camera stills from necklace | Working (`STUB_CAMERA=0`) |
| Web Speech STT | Working on localhost / **HTTPS**; blocked on plain LAN HTTP |
| Gemini vision | Working (`STUB_ANALYZE=0` + API key); prefer `gemini-2.5-flash` for latency |
| TTS | Browser `speechSynthesis` (soft-fails on some Linux Chrome) |

### Teammate lanes

[`docs/TEAM.md`](docs/TEAM.md): **A** UI · **B** Camera · **C** STT · **D** Vision API

## Safety

Clairvoyance is a **prototype**. Always combine with established mobility aids. Prefer well-lit indoor demos; if the camera disconnects, the client should announce that clearly.

## Credits

- Camera web server patterns from [Espressif Arduino-ESP32 CameraWebServer](https://github.com/espressif/arduino-esp32) (Apache 2.0)  
- Stock AP package from ELEGOO camera module materials (see `vendor/`)
