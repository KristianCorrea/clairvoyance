# ELEGOO ESP32-WROVER Camera-V1.5 stock firmware

Official camera program for the ELEGOO Smart Robot Car V4.0 **ESP32-WROVER Camera-V1.5** module.

## How reproducible is this?

| Piece | Reproducibility | Notes |
|-------|-----------------|-------|
| **Stock `.bin` flash** | High | Same binary + `write_flash 0x10000` restores AP + stream on this board family |
| **Hardware (Camera-V1.5)** | High if same PCB | Must use `CAMERA_MODEL_M5STACK_WIDE` pins (not Espressif `WROVER_KIT`) |
| **Wi‑Fi AP name** | Per-board | Derived from MAC (`ELEGOO-…`); IP is always `192.168.4.1` in AP mode |
| **Custom `esp32-cam/` project** | High once secrets set | Pin model + 10 MHz XCLK are fixed in repo; SSID/password are per-person |
| **Teammate machines** | Medium | Needs PlatformIO Core, `dialout` (Linux), data USB cable; Arduino IDE also works from source |
| **Google Drive zip URL** | Medium | ELEGOO may move links; keep `elegoo-wrover-stock/` in git so you don’t depend on Drive |

**What we verified on this board:** stock channel‑9 `.bin` → `ELEGOO-…` AP → browser stream at `http://192.168.4.1`.

**What is *not* guaranteed:** every clone labeled “WROVER Camera” worldwide (pinouts differ). This package matches **ELEGOO Camera-V1.5** as shipped with the Smart Robot Car V4.0 kit.

## Where it came from

| Item | Source |
|------|--------|
| Official zip | [Google Drive camera program](https://drive.google.com/file/d/19IENruwaLPVMKnKpy1bk7TjwF5JThqie/view) (ELEGOO FAQ / forums) |
| Wiki | https://wiki.elegoo.com/en/Robots&Kits/camera |
| Local (commit these) | `elegoo-wrover-stock/` — channel 9 source + `.bin` |
| Local (optional / large) | `elegoo-camera-source.zip`, `elegoo-official/` — gitignored; re-download if needed |
| Community mirror | `elegoo-CameraServer_AP-mirror/` ([Toremetal](https://github.com/Toremetal/ESP32_Examples-ESP32-Camera-CameraWebServer)) |

## Important: pin model ELEGOO actually ships

Stock `CameraWebServer_AP.cpp` does **not** use `CAMERA_MODEL_WROVER_KIT`.

```cpp
#define CAMERA_MODEL_M5STACK_WIDE
// xclk_freq_hz = 10000000
```

AP SSID looks like `ELEGOO-XXXXXXXX` (from MAC). Open `http://192.168.4.1` after joining that network.

Wrong pin model → camera probe `0x105`.

## Flash the prebuilt binary (restore stock)

Prerequisites:

- PlatformIO Core installed (`pio` on PATH → `~/.platformio/penv/bin`)
- User in `dialout` (Linux) so `/dev/ttyUSB*` is writable
- Board on USB (port may be `ttyUSB0` or `ttyUSB1`)

From **repo root** (`knighthacks/`):

```bash
export PATH="$PATH:$HOME/.platformio/penv/bin"

PORT=$(pio device list | awk '/ttyUSB/{print $1; exit}')
echo "Using port: $PORT"

# Use PlatformIO's Python (system python3 often lacks pyserial)
~/.platformio/penv/bin/python ~/.platformio/packages/tool-esptoolpy/esptool.py \
  --chip esp32 --port "$PORT" --baud 460800 \
  write_flash -z 0x10000 \
  vendor/elegoo-wrover-stock/ESP32_CameraServer_AP_20220120.ino.bin
```

Or run the helper script:

```bash
./vendor/flash-stock.sh
```

Serial monitor (stock firmware uses **9600**, not 115200):

```bash
pio device monitor -b 9600
```

Expect `wifi_name:…` / `Camera Ready! Use 'http://192.168.4.1'`.

Connect the PC to the `ELEGOO-…` AP → open `http://192.168.4.1`.

Channel folders (5–9) only change Wi‑Fi channel; camera init is the same. Passworded builds: `channle 9 with password/` inside the full zip.

## Rebuild from source (Arduino IDE)

- Board: **ESP32 Dev Module**
- Partition: **Huge APP (3MB No OTA/1MB SPIFFS)**
- PSRAM: **Enabled**
- Open `elegoo-wrover-stock/ESP32_CameraServer_AP_20220120.ino`
- Arduino-ESP32 **2.0.14** (per current ELEGOO wiki)

## Custom streaming project

See `../esp32-cam/` (PlatformIO, joins your router). It uses `CAMERA_MODEL_M5STACK_WIDE` to match this hardware. Edit `esp32-cam/include/wifi_secrets.h` per machine (2.4 GHz SSID).
