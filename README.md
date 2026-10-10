# Clairvoyance

**Clairvoyance** is a KnightHacks assistive prototype: a wearable ESP32 camera necklace plus a phone web app that lets a visually impaired person ask what’s ahead and hear a short AI-guided answer.

> Aid for awareness — not a replacement for a cane, guide dog, or professional mobility training.

## Purpose

- Give a portable "first-person” view from a necklace-mounted camera  
- Let the user **speak a question** on their phone (“What’s in front of me?”)  
- Analyze a frame from the necklace with a vision model  
- **Speak back** a concise, spatial answer (left / center / right, obstacles, signs)

## Repository layout

| Path | Role |
|------|------|
| [`esp32-cam/`](esp32-cam/) | PlatformIO firmware: join Wi‑Fi (STA), stream MJPEG |
| [`client-web-app/`](client-web-app/) | Next.js phone client (voice + AI — in progress) |
| [`vendor/`](vendor/) | ELEGOO stock softAP firmware + flash helper |

**Hardware:** ELEGOO **ESP32-WROVER Camera-V1.5** (Smart Robot Car kit camera module).

## Architecture

```text
┌─────────────────────┐       Wi‑Fi (MJPEG)        ┌──────────────────────┐
│  Necklace (ESP32)   │ ─────────────────────────► │  Phone (web app)     │
│  OV camera + stream │                            │  mic → STT           │
└─────────────────────┘                            │  snapshot + question │
                                                   │  TTS ← AI answer     │
                                                   └──────────┬───────────┘
                                                              │ HTTPS
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │  Vision LLM / API    │
                                                   └──────────────────────┘
```

- **ESP32** = eye (capture + stream only)  
- **Phone** = ears, mic, and UX  
- **Cloud / API** = scene understanding (planned)

### Networking modes

| Mode | When to use | Camera URL |
|------|-------------|------------|
| **SoftAP** (stock ELEGOO) | Quick camera check | Join `ELEGOO-…`, open `http://192.168.4.1` |
| **STA** (`esp32-cam`) | App + hotspot / home Wi‑Fi | `http://<dhcp-ip>/` (see phone hotspot device list) |

ESP32 needs **2.4 GHz** Wi‑Fi (PSK). **eduroam** (enterprise) is not supported by the simple STA sketch. Prefer a **phone hotspot** for demos.

**Power tip:** Wi‑Fi connect needs a solid 5 V supply. Laptop USB often works when a weak wall brick fails (brownout). Use a good cable / power bank rated ≥1 A.

## How it works

1. Necklace powers on and streams JPEG frames over HTTP (MJPEG).  
2. Phone (same network as the camera, or on the ELEGOO AP) runs **client-web-app**.  
3. User asks a question by voice.  
4. App grabs a still from the stream, sends **image + question** to a vision API.  
5. Phone speaks the short reply (TTS / screen reader).

ELEGOO Camera‑V1.5 pinout in stock and our STA firmware uses **`CAMERA_MODEL_M5STACK_WIDE`** (not Espressif’s `WROVER_KIT`). Wrong pins → camera probe error `0x105`.

## Prerequisites

- ELEGOO ESP32-WROVER Camera‑V1.5 + USB data cable  
- [PlatformIO Core](https://docs.platformio.org/en/latest/core/installation/methods/installer-script.html) (`pio` on `PATH`)  
- Node.js 20+ and npm (for the web app)  
- Linux: user in `dialout` for `/dev/ttyUSB*`

```bash
export PATH="$PATH:$HOME/.platformio/penv/bin"
# Fedora/Ubuntu: sudo usermod -aG dialout $USER   # then log out/in
```

## How to run

### 1. Camera — stock softAP (fastest visual check)

```bash
./vendor/flash-stock.sh
pio device monitor -b 9600          # stock firmware uses 9600 baud
```

Join Wi‑Fi `ELEGOO-…` → open [http://192.168.4.1](http://192.168.4.1) → Start Stream.

Details: [`vendor/README.md`](vendor/README.md).

### 2. Camera — STA stream (same network as phone/laptop)

```bash
# Edit Wi‑Fi (2.4 GHz hotspot or router PSK)
#   esp32-cam/include/wifi_secrets.h

cd esp32-cam
pio run -t upload
pio device monitor -b 115200        # STA firmware uses 115200
```

Copy the printed IP, or find it under the hotspot’s connected devices.  
Stream UI: `http://<ip>/` — direct MJPEG: `http://<ip>:81/stream`.

Details: [`esp32-cam/README.md`](esp32-cam/README.md).

### 3. Phone web client

```bash
cd client-web-app
npm install
npm run dev
```

- Laptop: [http://localhost:3000](http://localhost:3000)  
- Phone on the same LAN: `http://<laptop-lan-ip>:3000`  
- Enter the camera base URL (e.g. `http://192.168.4.1` or the STA IP)

Details: [`client-web-app/README.md`](client-web-app/README.md).

## Current status

| Component | Status |
|-----------|--------|
| ELEGOO stock AP + browser stream | Working |
| PlatformIO STA firmware (`esp32-cam`) | Working (pins + stream) |
| Next.js client (`client-web-app`) | Stubbed end-to-end loop + **real TTS** |
| Mic / camera / vision | Stubbed behind env flags — see [`docs/TEAM.md`](docs/TEAM.md) |

### Teammate lanes

Assign work using [`docs/TEAM.md`](docs/TEAM.md):

- **A** UI/orchestration · **B** Camera · **C** STT · **D** Vision API

## Safety

Clairvoyance is a **prototype**. Always combine with established mobility aids. Prefer well-lit indoor demos; if the camera disconnects, the client should announce that clearly.

## Credits

- Camera web server patterns from [Espressif Arduino-ESP32 CameraWebServer](https://github.com/espressif/arduino-esp32) (Apache 2.0)  
- Stock AP package from ELEGOO camera module materials (see `vendor/`)
