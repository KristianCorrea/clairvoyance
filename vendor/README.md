# ELEGOO ESP32-WROVER Camera-V1.5 stock firmware

Official camera program for the ELEGOO Smart Robot Car V4.0 **ESP32-WROVER Camera-V1.5** module.

## Where it came from

| Item | Source |
|------|--------|
| Official zip | [Google Drive `camere.zip` / program for camera module](https://drive.google.com/file/d/19IENruwaLPVMKnKpy1bk7TjwF5JThqie/view) (linked from ELEGOO camera FAQ / forums) |
| Wiki | https://wiki.elegoo.com/en/Robots&Kits/camera |
| Local copy | `elegoo-official/` (full unzip) + `elegoo-wrover-stock/` (channel 9, ready to use) |
| Community mirror | `elegoo-CameraServer_AP-mirror/` ([Toremetal GitHub](https://github.com/Toremetal/ESP32_Examples-ESP32-Camera-CameraWebServer)) |

## Important: pin model ELEGOO actually ships

Stock `CameraWebServer_AP.cpp` does **not** use `CAMERA_MODEL_WROVER_KIT`.

It uses:

```cpp
#define CAMERA_MODEL_M5STACK_WIDE
```

with `xclk_freq_hz = 10000000`, and creates a Wi‑Fi **AP** named like `ELEGOO-XXXXXXXX` (from MAC), open browser at `http://192.168.4.1`.

That is why Espressif’s WROVER-KIT pin map often fails probe (`0x105`) on this board.

## Flash the prebuilt binary (fastest restore)

From repo root (board plugged in, you have serial permission):

```bash
export PATH="$PATH:$HOME/.platformio/penv/bin"
PORT=$(pio device list | awk '/ttyUSB/{print $1; exit}')

python3 ~/.platformio/packages/tool-esptoolpy/esptool.py \
  --chip esp32 --port "$PORT" --baud 460800 \
  write_flash -z 0x10000 \
  vendor/elegoo-wrover-stock/ESP32_CameraServer_AP_20220120.ino.bin
```

Then:

```bash
pio device monitor -b 115200
```

You should see `wifi_name:…` / `Camera Ready! Use 'http://192.168.4.1'`.

Connect the PC to that AP and open `http://192.168.4.1` (stream page; some docs also mention `/Test`).

Channel variants (5–9) only change the Wi‑Fi channel; camera init is the same. Passworded builds live under `channle 9 with password/`.

## Rebuild from source (Arduino IDE)

ELEGOO’s notes:

- Board: **ESP32 Dev Module**
- Partition: **Huge APP (3MB No OTA/1MB SPIFFS)**
- PSRAM: **Enabled**
- Open `ESP32_CameraServer_AP_20220120.ino` from `elegoo-wrover-stock/`

Arduino-ESP32 **2.0.14** is what current ELEGOO wiki recommends.
